#!/usr/bin/env python3
"""Resume an immutable encrypted Drive backup; success requires download verification."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time

BACKUPS = Path('/var/backups/wasla')
STATE = Path('/var/lib/wasla-backup')
ENV_FILE = Path('/etc/dokploy/wasla-production/config/rclone.env')
IMAGE = 'rclone/rclone:1.75.1@sha256:45401ad7410db1d67ffdb58e19059ad20b0d8e0285a60e38bbec55cc1019c7a5'
NAME = re.compile(r'wasla-\d{8}T\d{6}Z-[A-Za-z0-9]{6}')


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temp = path.with_name(path.name + '.next')
    temp.write_text(json.dumps(value, indent=2) + '\n')
    temp.chmod(0o600)
    os.replace(temp, path)


def validate_snapshot(snapshot, root=BACKUPS):
    snapshot, root = Path(snapshot), Path(root).resolve()
    if snapshot.is_symlink() or snapshot.resolve().parent != root or not NAME.fullmatch(snapshot.name):
        raise ValueError('Snapshot must be a direct named backup directory')
    manifest = snapshot / 'SHA256SUMS'
    if manifest.is_symlink() or not manifest.is_file():
        raise ValueError('Snapshot checksum manifest missing')
    entries = []
    for line in manifest.read_text().splitlines():
        match = re.fullmatch(r'([a-f0-9]{64})  ([A-Za-z0-9_.-]+)', line)
        if not match or match[2] in {'.', '..', 'SHA256SUMS'}:
            raise ValueError('Invalid snapshot checksum entry')
        digest, name = match.groups()
        path = snapshot / name
        if path.is_symlink() or not path.is_file():
            raise ValueError('Snapshot member missing or is a link')
        checksum = hashlib.sha256()
        with path.open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                checksum.update(chunk)
        if checksum.hexdigest() != digest:
            raise ValueError('Local snapshot checksum mismatch')
        entries.append(name)
    if not entries or len(entries) != len(set(entries)):
        raise ValueError('Empty or duplicate snapshot manifest')
    if {p.name for p in snapshot.iterdir()} != {*entries, 'SHA256SUMS'}:
        raise ValueError('Unverified extra snapshot members')
    return snapshot.resolve(), len(entries) + 1


class UploadError(Exception):
    def __init__(self, retryable):
        super().__init__('Encrypted backup transport failed; inspect protected upload log')
        self.retryable = retryable


class Uploader:
    def __init__(self, state=STATE, env_file=ENV_FILE, invoke=None, sleep=time.sleep):
        self.state, self.env_file = Path(state), Path(env_file)
        self.invoke = invoke or self.call
        self.sleep = sleep

    def call(self, command, log_path):
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise subprocess.TimeoutExpired(command, 0)
        result = subprocess.run(command, capture_output=True, timeout=min(1200, remaining))
        with log_path.open('ab') as stream:
            stream.write(result.stdout)
            stream.write(result.stderr)
        log_path.chmod(0o600)
        if result.returncode:
            message = (result.stdout + result.stderr).decode(errors='replace').lower()
            retry = any(s in message for s in ['ratelimit', 'rate_limit', 'quota', 'timeout', 'timed out', '429', '503', '502', 'connection reset', 'temporary failure'])
            raise UploadError(retry)

    def upload(self, snapshot, root=BACKUPS):
        snapshot, files = validate_snapshot(snapshot, root)
        self.deadline = time.monotonic() + 2700
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        pending = self.state / 'pending' / (snapshot.name + '.json')
        atomic_json(pending, {'snapshot': snapshot.name})
        remote = 'waslacrypt:contabo/' + snapshot.name
        log_path = self.state / (snapshot.name + '.upload.log')
        common = ['docker', 'run', '--rm', '--env-file', str(self.env_file), '-v', str(snapshot) + ':/data:ro', IMAGE]
        flags = ['--checkers', '1', '--tpslimit', '1', '--tpslimit-burst', '1', '--retries', '3', '--low-level-retries', '5', '--retries-sleep', '20s', '--contimeout', '15s', '--timeout', '60s']
        for attempt in range(1, 4):
            atomic_json(self.state / 'status.json', {'state': 'uploading', 'snapshot': snapshot.name, 'attempt': attempt, 'updatedAt': time.time()})
            phase = 'copy'
            try:
                self.invoke(common + ['copy', '/data', remote, '--immutable', '--transfers', '1'] + flags, log_path)
                phase = 'verify'
                self.invoke(common + ['check', '/data', remote, '--download', '--one-way'] + flags, log_path)
                success = {'state': 'verified', 'snapshot': snapshot.name, 'files': files, 'verifiedAt': time.time(), 'verification': 'download-and-compare'}
                atomic_json(self.state / 'last-success.json', success)
                atomic_json(self.state / 'completed' / (snapshot.name + '.json'), success)
                atomic_json(self.state / 'status.json', success)
                pending.unlink()
                return success
            except (UploadError, subprocess.TimeoutExpired) as error:
                retryable = isinstance(error, subprocess.TimeoutExpired) or error.retryable
                if retryable and attempt < 3 and time.monotonic() + 60 * attempt < self.deadline:
                    atomic_json(self.state / 'status.json', {'state': 'retrying', 'snapshot': snapshot.name, 'attempt': attempt, 'phase': phase, 'updatedAt': time.time()})
                    self.sleep(60 * attempt)
                    continue
                atomic_json(self.state / 'status.json', {'state': 'failed', 'snapshot': snapshot.name, 'phase': phase, 'retryable': retryable, 'updatedAt': time.time()})
                raise

    def resume(self, root=BACKUPS):
        paths = sorted((self.state / 'pending').glob('*.json'), reverse=True)
        if not paths:
            raise ValueError('No pending snapshot; choose an existing verified local snapshot')
        for path in paths:
            name = json.loads(path.read_text())['snapshot']
            if not NAME.fullmatch(name):
                raise ValueError('Invalid pending snapshot')
            self.upload(Path(root) / name, root)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--snapshot', type=Path)
    group.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    # The snapshot script has a separate lock; manual retry must not race it.
    with (STATE / 'upload.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        uploader = Uploader()
        if args.resume:
            uploader.resume()
        else:
            print(json.dumps(uploader.upload(args.snapshot)))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, UploadError, subprocess.TimeoutExpired):
        print('Backup upload not verified; local snapshot preserved. Inspect /var/lib/wasla-backup/status.json.')
        raise SystemExit(1)
