import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("private_registry", Path(__file__).parents[1] / "releases/ensure_private_registry.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.repo = "AWABOMER124/stitcha"
        self.image = "ghcr.io/awabomer124/stitcha-production"
        self.package = {"visibility": "private", "repository": {"full_name": self.repo}}

    def test_existing_private_linked_package_is_accepted_without_initialization(self):
        def unexpected():
            raise AssertionError("Unexpected registry initialization")
        self.assertEqual(module.ensure_private(self.repo, self.image, lambda: self.package, unexpected)["visibility"], "private")

    def test_public_package_is_rejected_before_any_push(self):
        pushed = []
        with self.assertRaises(ValueError):
            module.ensure_private(self.repo, self.image, lambda: {**self.package, "visibility": "public"}, lambda: pushed.append(True))
        self.assertFalse(pushed)

    def test_missing_package_uses_probe_then_requires_private_verification(self):
        values = iter([None, self.package])
        pushed = []
        module.ensure_private(self.repo, self.image, lambda: next(values), lambda: pushed.append(True))
        self.assertEqual(pushed, [True])

    def test_public_probe_result_is_not_accepted(self):
        values = iter([None, {**self.package, "visibility": "public"}])
        with self.assertRaises(ValueError):
            module.ensure_private(self.repo, self.image, lambda: next(values), lambda: None)

    def test_unrelated_package_and_owner_are_rejected(self):
        with self.assertRaises(ValueError):
            module.ensure_private(self.repo, self.image, lambda: {**self.package, "repository": {"full_name": "someone/other"}}, lambda: None)
        with self.assertRaises(ValueError):
            module.ensure_private(self.repo, "ghcr.io/someone/stitcha", lambda: self.package, lambda: None)

    def test_authentication_error_is_not_treated_as_missing_package(self):
        def denied():
            raise RuntimeError("Denied")
        pushed = []
        with self.assertRaises(RuntimeError):
            module.ensure_private(self.repo, self.image, denied, lambda: pushed.append(True))
        self.assertFalse(pushed)


if __name__ == "__main__":
    unittest.main()
