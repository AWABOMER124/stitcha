import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("release_control", Path(__file__).parents[1] / "releases/release_control.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.config = {"state_file": str(self.root / "state.json"), "routing_file": str(self.root / "routing.yml"),
                       "hosts": ["wassla.example"], "slots": {}}
        self.info = {}
        for index, name in enumerate(["blue", "green"], 1):
            release = "release-" + name
            image = "sha256:" + str(index) * 64
            self.config["slots"][name] = {"container": name, "release": release, "image_id": image, "url": "http://" + name + ":3000", "schema_compatibility": "expand-only-reviewed"}
            self.info[name] = {"Image": image, "State": {"Running": True}, "Config": {"Env": ["APP_RELEASE=" + release, "APP_PROCESS_MODE=web", "JOB_RUNNER_ENABLED=false"]}}
        self.control = module.Controller(self.config, inspector=lambda n: self.info[n],
                                         probe=lambda n: {"readiness": "ready", "release": self.config["slots"][n]["release"]},
                                         image_inspector=lambda image: {"Config": {"Env": ["APP_RELEASE=" + next(s["release"] for s in self.config["slots"].values() if s["image_id"] == image)]}})
        self.control.verify_public = lambda _: None

    def tearDown(self):
        self.tmp.cleanup()

    def test_promotion_and_rollback_preserve_previous_route_without_database_operations(self):
        self.control.promote("blue")
        self.control.promote("green")
        routing = json.loads((self.root / "routing.yml").read_text())
        self.assertIn("x-deployment-id", routing["http"]["routers"]["wasla-release-previous"]["rule"])
        self.control.rollback()
        self.assertEqual(self.control.state()["active"]["release"], "release-blue")

    def test_promotion_preserves_tcp_transport_policy(self):
        self.control.promote("blue")
        routing = json.loads((self.root / "routing.yml").read_text())
        self.assertEqual(routing["http"]["middlewares"]["wasla-release-platform-host"]["headers"]["customResponseHeaders"]["Alt-Svc"], "clear")

    def test_failed_serving_check_restores_exact_previous_route(self):
        self.control.promote("blue")
        before = (self.root / "routing.yml").read_bytes()
        def fail(_):
            raise RuntimeError("probe failed")
        self.control.verify_public = fail
        with self.assertRaises(RuntimeError):
            self.control.promote("green")
        self.assertEqual((self.root / "routing.yml").read_bytes(), before)
        self.assertEqual(self.control.state()["active"]["slot"], "blue")
        self.assertEqual(json.loads((self.root / "state.json.journal").read_text())["phase"], "rolled-back")

    def test_ui_rollback_preserves_the_verified_financial_implementation(self):
        self.control.promote('blue')
        slot = self.config['slots']['green']
        self.config['financial_pin'] = {'slot': 'green', 'release': slot['release'], 'image_id': slot['image_id']}
        self.control.promote('green')
        self.control.rollback()
        routing = json.loads((self.root / 'routing.yml').read_text())['http']
        self.assertEqual(self.control.state()['active']['slot'], 'blue')
        self.assertEqual(routing['routers']['wasla-release-critical']['service'], 'wasla-release-financial')
        self.assertNotIn('wasla-release-financial', routing['routers'])
        self.assertEqual(routing['services']['wasla-release-financial']['loadBalancer']['servers'][0]['url'], 'http://green:3000')
        self.assertEqual(routing['middlewares']['wasla-release-critical']['headers']['customResponseHeaders']['X-Wasla-API-Release'], 'release-green')
        self.assertIn('/api/paymob/', routing['routers']['wasla-release-critical']['rule'])
        for path in ['/api/sales/', '/pay/', '/dashboard/sales']:
            self.assertIn(path, routing['routers']['wasla-release-critical']['rule'])

    def test_refuses_a_changed_financial_pin_even_if_the_candidate_is_healthy(self):
        slot = self.config['slots']['green']
        self.config['financial_pin'] = {'slot': 'green', 'release': 'replaced-release', 'image_id': slot['image_id']}
        with self.assertRaises(ValueError):
            self.control.promote('blue')

    def test_rejects_mutable_or_changed_image(self):
        self.config["slots"]["green"]["image_id"] = "platform:latest"
        with self.assertRaises(ValueError):
            self.control.promote("green")
        self.assertFalse((self.root / "routing.yml").exists())

    def test_refuses_promotion_without_an_explicit_schema_review_for_the_image(self):
        del self.config["slots"]["green"]["schema_compatibility"]
        with self.assertRaises(ValueError):
            self.control.promote("green")

    def test_rejects_candidate_that_could_execute_background_jobs(self):
        self.info["green"]["Config"]["Env"][-1] = "JOB_RUNNER_ENABLED=true"
        with self.assertRaises(ValueError):
            self.control.promote("green")

    def test_rejects_missing_schema_or_unhealthy_candidate(self):
        self.control.probe = lambda _: {"readiness": "degraded", "release": "release-green"}
        with self.assertRaises(ValueError):
            self.control.promote("green")

    def test_rejects_runtime_release_that_does_not_match_image_build(self):
        self.control.image_inspector = lambda _: {"Config": {"Env": ["APP_RELEASE=wrong-build"]}}
        with self.assertRaises(ValueError):
            self.control.promote("green")

    def test_refuses_rollback_after_previous_slot_was_overwritten(self):
        self.control.promote("blue")
        self.control.promote("green")
        self.config["slots"]["blue"]["url"] = "http://different:3000"
        with self.assertRaises(ValueError):
            self.control.rollback()

    def test_refuses_host_expression_injection(self):
        with self.assertRaises(ValueError):
            module.render_routing(["a`) || Host(`other"], self.config["slots"]["blue"])

    def test_refuses_to_ignore_an_interrupted_promotion(self):
        module.atomic_json(str(self.root / "state.json") + ".journal", {"phase": "prepared"})
        with self.assertRaises(ValueError):
            self.control.promote("blue")

    def test_idempotent_promotion_still_verifies_the_serving_path(self):
        self.control.promote("blue")
        checked = []
        self.control.verify_public = checked.append
        self.assertFalse(self.control.promote("blue")["changed"])
        self.assertEqual(checked, ["release-blue"])


if __name__ == "__main__":
    unittest.main()
