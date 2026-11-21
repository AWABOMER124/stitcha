# Backup upload controls

The host creates private, checksummed snapshots. `backup_upload.py` validates every member before transmitting anything, uploads through the existing encrypted `waslacrypt` remote, and declares success only after `rclone check --download --one-way` passes. The rclone image is pinned to the digest already verified on the production host. Credentials remain in the root-only environment file and never enter command arguments or Git.

An explicit `RCLONE_CONFIG_GDRIVE_ROOT_FOLDER_ID` points to the verified existing backup folder. With that folder as the Drive remote root, `RCLONE_CONFIG_WASLACRYPT_REMOTE` must be `gdrive:`. Keeping the old folder name in both places would create an incorrect nested path. Establish identity by listing the previous known backup through the encrypted remote before activating the configuration. Preserve the existing OAuth token, scope and crypt password; no credential rotation is needed for this repair.

Transient quota, timeout and connection failures retry the same snapshot up to three times, with 60/120-second outer backoff. This includes failures while rclone initializes the remote, which previously escaped its transfer retry loop. Copy and verification share a 45-minute budget within the service's one-hour deadline. Authentication or checksum conflicts stop without overwriting existing files. A failed verification never updates the last-success record.

Install the reviewed scripts at `/usr/local/sbin/wasla-backup` (0750) and `/usr/local/lib/wasla/backup_upload.py` (0644), and the supplied service files under `/etc/systemd/system` (0644). Preserve the existing daily timer, then run `systemctl daemon-reload`. Updating these host tools does not require changing the web image or public routing.

```sh
python3 -m unittest discover -s ops/backups -p 'test_*.py' -v
bash -n ops/backups/wasla-backup.sh

# Existing complete local snapshot; validates its manifest first.
/usr/local/sbin/wasla-backup --upload-existing /var/backups/wasla/wasla-YYYYMMDDTHHMMSSZ-XXXXXX

# Retry pending uploads without dumping databases or creating new snapshots.
systemctl start wasla-backup-resume.service

# New full snapshot, encrypted upload and download verification.
systemctl start wasla-backup.service
```

Operator state is root-only under `/var/lib/wasla-backup`: `status.json`, `last-success.json`, per-snapshot pending/completed records and protected transport logs. A running unit can still show the previous result; compare the current snapshot name and verified record after the unit exits. Never publish a raw provider log or credential file. Neither snapshots nor remote backups are automatically deleted. The uploader rejects directories outside the backup root, symlinks, corrupted members, path traversal and unmanifested files.

The current shared Google OAuth client remains in use at the owner's direction. Direct folder access removes the failing folder-name search and was verified against the existing encrypted history. It does not remove Google's underlying shared-client limits or guarantee the shared client's future availability. A future private OAuth client requires a separate authorization decision; do not create one implicitly.

See [the operations recovery guide](../../docs/operations/BACKUP_RESTORE.md) for restore boundaries. Download comparison proves backup transport and file integrity, not a complete disaster recovery drill.
