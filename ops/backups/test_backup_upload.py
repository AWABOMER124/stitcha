import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from backup_upload import Uploader, UploadError, validate_snapshot


class BackupUploadTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'backups'
        self.snapshot = self.root / 'wasla-20261121T100045Z-41gt6J'
        self.snapshot.mkdir(parents=True)
        self.data = b'synthetic encrypted-backup acceptance content'
        (self.snapshot / 'database.dump').write_bytes(self.data)
        (self.snapshot / 'SHA256SUMS').write_text(hashlib.sha256(self.data).hexdigest() + '  database.dump\n')
        self.state = Path(self.temp.name) / 'state'

    def test_verified_means_copy_then_download_comparison(self):
        calls = []
        uploader = Uploader(self.state, invoke=lambda command, log: calls.append(command))
        result = uploader.upload(self.snapshot, self.root)
        self.assertEqual(result['state'], 'verified')
        self.assertEqual(len(calls), 2)
        self.assertIn('copy', calls[0])
        self.assertIn('--immutable', calls[0])
        self.assertIn('check', calls[1])
        self.assertIn('--download', calls[1])
        self.assertIn('--one-way', calls[1])
        self.assertNotIn('delete', ' '.join(calls[0]))
        self.assertEqual(json.loads((self.state / 'last-success.json').read_text())['snapshot'], self.snapshot.name)
        self.assertFalse(list((self.state / 'pending').glob('*')))

    def test_failed_verification_keeps_pending_and_previous_success(self):
        self.state.mkdir()
        (self.state / 'last-success.json').write_text('{"snapshot":"previous-good"}')
        def invoke(command, log):
            if 'check' in command:
                raise UploadError(False)
        with self.assertRaises(UploadError):
            Uploader(self.state, invoke=invoke).upload(self.snapshot, self.root)
        self.assertEqual(json.loads((self.state / 'last-success.json').read_text())['snapshot'], 'previous-good')
        self.assertEqual(json.loads((self.state / 'status.json').read_text())['state'], 'failed')
        self.assertTrue(list((self.state / 'pending').glob('*')))
        self.assertEqual((self.snapshot / 'database.dump').read_bytes(), self.data)

    def test_provider_initialization_quota_retries_same_snapshot(self):
        calls, waits = [], []
        def invoke(command, log):
            calls.append(command)
            if len(calls) == 1:
                raise UploadError(True)
        Uploader(self.state, invoke=invoke, sleep=waits.append).upload(self.snapshot, self.root)
        self.assertEqual(waits, [60])
        self.assertEqual(calls[0], calls[1])
        self.assertIn('check', calls[2])

    def test_retry_exhaustion_preserves_snapshot_for_resume(self):
        def fail(command, log):
            raise UploadError(True)
        waits = []
        with self.assertRaises(UploadError):
            Uploader(self.state, invoke=fail, sleep=waits.append).upload(self.snapshot, self.root)
        self.assertEqual(waits, [60, 120])
        calls = []
        Uploader(self.state, invoke=lambda command, log: calls.append(command)).resume(self.root)
        self.assertEqual(len(calls), 2)

    def test_corrupted_or_unmanifested_data_never_reaches_provider(self):
        (self.snapshot / 'database.dump').write_bytes(b'changed')
        calls = []
        with self.assertRaises(ValueError):
            Uploader(self.state, invoke=lambda command, log: calls.append(command)).upload(self.snapshot, self.root)
        self.assertEqual(calls, [])
        (self.snapshot / 'database.dump').write_bytes(self.data)
        (self.snapshot / 'extra.env').write_text('synthetic')
        with self.assertRaises(ValueError):
            validate_snapshot(self.snapshot, self.root)

    def test_manifest_cannot_escape_snapshot(self):
        (self.snapshot / 'SHA256SUMS').write_text('0' * 64 + '  ../outside\n')
        with self.assertRaises(ValueError):
            validate_snapshot(self.snapshot, self.root)


if __name__ == '__main__':
    unittest.main()
