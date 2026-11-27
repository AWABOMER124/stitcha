"""Fail-closed Traefik blue/green promotion. Operator config is private JSON.

This controller never builds images, migrates databases, starts billing, or
replays requests. Containers are prepared separately from immutable images.
"""
import argparse
import copy
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
import urllib.request


def atomic_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".release-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            os.fchmod(stream.fileno(), 0o600)
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def render_routing(hosts, active, previous=None, entrypoint="websecure", tls=True, financial=None):
    if not hosts or any(not re.fullmatch(r"[a-z0-9.-]+", h) for h in hosts):
        raise ValueError("Invalid platform hosts")
    rule = " || ".join("Host(`" + host + "`)" for host in hosts)
    http = {"routers": {}, "services": {}}
    if not active:
        return {"http": http}
    slots = {"active": active}
    if previous and previous["release"] != active["release"]:
        slots["previous"] = previous
    if financial and financial['release'] != active['release']:
        slots['financial'] = financial
    for name, slot in slots.items():
        if not re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", slot["release"]):
            raise ValueError("Invalid release identity")
        if not re.fullmatch(r"http://[A-Za-z0-9_.-]+:[0-9]+", slot["url"]):
            raise ValueError("Only internal HTTP upstreams are accepted")
        service = "wasla-release-" + name
        http["services"][service] = {"loadBalancer": {
            "servers": [{"url": slot["url"]}], "passHostHeader": True,
            "healthCheck": {"path": "/api/health", "interval": "5s", "timeout": "3s"},
        }}
        if name == 'financial':
            continue
        router = {"rule": "(" + rule + ")", "entryPoints": [entrypoint],
                  "service": service, "priority": 10000,
                  "middlewares": ["wasla-release-platform-host"]}
        if name == "previous":
            version = slot["release"]
            router["rule"] += " && (Header(`x-deployment-id`, `" + version + "`) || (PathPrefix(`/_next/`) && Query(`dpl`, `" + version + "`)))"
            router["priority"] = 10010
        if tls:
            router["tls"] = {"certResolver": "letsencrypt"}
        http["routers"][service] = router
    http["middlewares"] = {"wasla-release-platform-host": {
        "headers": {"customRequestHeaders": {"X-Forwarded-Host": hosts[0]}, "customResponseHeaders": {"Alt-Svc": "clear"}}
    }}
    # Browser version hints must not select an older implementation of money
    # collection, provider callbacks, or business-market account creation.
    critical = "wasla-release-critical"
    financial = financial or active
    service = 'wasla-release-active' if financial['release'] == active['release'] else 'wasla-release-financial'
    http["middlewares"][critical] = {"headers": {"customResponseHeaders": {"X-Wasla-API-Release": financial["release"]}}}
    http["routers"][critical] = {
        "rule": "(" + rule + ") && (PathPrefix(`/api/sales/`) || PathPrefix(`/pay/`) || PathPrefix(`/dashboard/sales`) || PathPrefix(`/dashboard/fulfillment`) || PathPrefix(`/api/orders/`) || PathPrefix(`/api/subscriptions/`) || PathPrefix(`/api/stripe/`) || PathPrefix(`/api/paymob/`) || PathPrefix(`/api/partner/`) || Path(`/api/auth/register`) || PathRegexp(`^/api/store/[^/]+/orders(/|$)`) || PathRegexp(`^/store/[^/]+/(checkout|order/[^/]+)(/|$)`) || PathPrefix(`/dashboard/subscription`) || PathPrefix(`/dashboard/orders`) || PathPrefix(`/dashboard/delivery/`) || PathPrefix(`/dashboard/storefront/payments`) || PathPrefix(`/dashboard/finance/online-settlements`) || PathPrefix(`/admin/settings/payments`) || PathPrefix(`/admin/online-settlements`))",
        "entryPoints": [entrypoint], "service": service, "priority": 10020,
        "middlewares": ["wasla-release-platform-host", critical],
    }
    if tls:
        http["routers"][critical]["tls"] = {"certResolver": "letsencrypt"}
    return {"http": http}


class Controller:
    def __init__(self, config, inspector=None, probe=None, image_inspector=None):
        self.config = config
        self.state_path = Path(config["state_file"])
        self.routing_path = Path(config["routing_file"])
        self.inspector = inspector or self.inspect_container
        self.probe = probe or self.probe_container
        self.image_inspector = image_inspector or self.inspect_image

    @staticmethod
    def inspect_image(image_id):
        return json.loads(subprocess.check_output(["docker", "image", "inspect", image_id], timeout=15))[0]

    @staticmethod
    def inspect_container(name):
        return json.loads(subprocess.check_output(["docker", "inspect", name], timeout=15))[0]

    @staticmethod
    def probe_container(name):
        script = "fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(5000)}).then(async r=>{if(!r.ok)process.exit(2);console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(3))"
        raw = subprocess.check_output(["docker", "exec", name, "node", "-e", script], timeout=10)
        return json.loads(raw)

    def state(self):
        return json.loads(self.state_path.read_text()) if self.state_path.exists() else {"active": None, "previous": None}

    def validate(self, slot_name):
        slot = copy.deepcopy(self.config["slots"][slot_name])
        if slot.get("schema_compatibility") != "expand-only-reviewed":
            raise ValueError("A reviewed backward-compatible schema is required for this image")
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", slot["image_id"]):
            raise ValueError("Promotion requires the exact tested local image ID")
        info = self.inspector(slot["container"])
        if not info["State"]["Running"] or info["Image"] != slot["image_id"]:
            raise ValueError("Candidate is stopped or its image changed")
        env = dict(value.split("=", 1) for value in info["Config"]["Env"])
        image_env = dict(value.split("=", 1) for value in self.image_inspector(slot["image_id"])["Config"]["Env"])
        if image_env.get("APP_RELEASE") != slot["release"]:
            raise ValueError("Image build identity differs from runtime identity")
        if env.get("APP_PROCESS_MODE") != "web" or env.get("APP_RELEASE") != slot["release"]:
            raise ValueError("Candidate runtime identity does not match")
        # The candidate route is intentionally not a scheduler endpoint. A
        # separate serving worker uses the same durable jobs and scoped secret.
        if env.get("JOB_RUNNER_ENABLED") != "false":
            raise ValueError("Release slot must have jobs disabled")
        for _ in range(3):
            health = self.probe(slot["container"])
            if health.get("readiness") != "ready" or health.get("release") != slot["release"]:
                raise ValueError("Candidate has not passed release readiness")
        slot["slot"] = slot_name
        return slot

    def promote(self, slot_name):
        journal_path = Path(str(self.state_path) + ".journal")
        if journal_path.exists() and json.loads(journal_path.read_text()).get("phase") == "prepared":
            raise ValueError("Recover the interrupted promotion before starting another")
        target = self.validate(slot_name)
        old = self.state()
        if old["active"] and old["active"]["image_id"] == target["image_id"] and old["active"]["release"] == target["release"]:
            self.verify_public(target["release"])
            return {"changed": False, "release": target["release"]}
        previous = old["active"]
        financial = None
        pin = self.config.get('financial_pin')
        if pin:
            financial = self.validate(pin['slot'])
            if any(financial[key] != pin[key] for key in ('image_id', 'release')):
                raise ValueError('Pinned financial release changed; refusing incompatible routing')
        config = render_routing(self.config["hosts"], target, previous,
                                self.config.get("entrypoint", "websecure"), self.config.get("tls", True), financial)
        old_routing = json.loads(self.routing_path.read_text()) if self.routing_path.exists() else render_routing(self.config["hosts"], None)
        # Journal first. An operator can restore the exact old routing even if
        # the process/host stops between the two atomic filesystem writes.
        journal = {"before": old, "before_routing": old_routing, "target": target,
                   "phase": "prepared", "created_at": time.time()}
        atomic_json(str(self.state_path) + ".journal", journal)
        try:
            atomic_json(self.routing_path, config)
            atomic_json(self.state_path, {"active": target, "previous": previous})
            self.verify_public(target["release"])
        except Exception:
            atomic_json(self.routing_path, old_routing)
            atomic_json(self.state_path, old)
            journal["phase"] = "rolled-back"
            atomic_json(str(self.state_path) + ".journal", journal)
            raise
        journal["phase"] = "committed"
        atomic_json(str(self.state_path) + ".journal", journal)
        return {"changed": True, "release": target["release"], "previous": previous["release"] if previous else None}

    def verify_public(self, expected):
        url = self.config.get("public_health_url")
        if not url:
            raise ValueError("A serving-path health check is required")
        deadline = time.monotonic() + 20
        passed = 0
        while time.monotonic() < deadline:
            try:
                req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "Host": self.config["hosts"][0]})
                with urllib.request.urlopen(req, timeout=5) as response:
                    body = json.load(response)
                if body.get("release") == expected and body.get("readiness") == "ready":
                    passed += 1
                    if passed == 3:
                        return
                else:
                    passed = 0
            except (OSError, ValueError):
                passed = 0
            time.sleep(0.25)
        raise RuntimeError("Serving-path verification failed; old route restored")

    def rollback(self):
        old = self.state()
        if not old.get("previous"):
            raise ValueError("No tested previous release recorded")
        target = old["previous"]
        # Never restore the database. Re-validate the previous image and its
        # compatibility with the current additive schema before routing.
        current = self.validate(target["slot"])
        if any(current[key] != target[key] for key in ("image_id", "release", "url")):
            raise ValueError("Previous release was overwritten; refusing an unverified rollback")
        return self.promote(target["slot"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("command", choices=["inspect", "promote", "rollback", "recover"])
    parser.add_argument("slot", nargs="?", choices=["blue", "green"])
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    controller = Controller(config)
    controller.state_path.parent.mkdir(parents=True, exist_ok=True)
    with open(str(controller.state_path) + ".lock", "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.command == "inspect":
            result = controller.state()
        elif args.command == "promote":
            if not args.slot:
                parser.error("promote requires a slot")
            result = controller.promote(args.slot)
        elif args.command == "rollback":
            result = controller.rollback()
        else:
            journal = json.loads(Path(str(controller.state_path) + ".journal").read_text())
            if journal["phase"] != "prepared":
                raise ValueError("No interrupted promotion to recover")
            atomic_json(controller.routing_path, journal["before_routing"])
            atomic_json(controller.state_path, journal["before"])
            journal["phase"] = "recovered"
            atomic_json(str(controller.state_path) + ".journal", journal)
            result = {"recovered": True}
        print(json.dumps(result))


if __name__ == "__main__":
    main()
