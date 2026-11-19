"""Real Traefik functional cutover test on an explicitly INTERNAL network.
No production data, published ports, financial/provider calls or credentials.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import time
import urllib.request
import urllib.error

spec = importlib.util.spec_from_file_location("releases", Path(__file__).parents[1] / "releases/release_control.py")
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


def docker(*args):
    return subprocess.check_output(["docker", *args], stderr=subprocess.PIPE).decode().strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--network", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    network = json.loads(docker("network", "inspect", args.network))[0]
    assert network["Internal"] is True, "Only isolated networks are permitted"
    created = []
    label = "wasla.release.fixture=isolated"
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    config_dir = out / "routing"
    config_dir.mkdir(exist_ok=True)
    try:
        slots = {}
        for name in ("blue", "green"):
            tag = "wasla-release-fixture-" + name + ":test"
            subprocess.run(["docker", "build", "--build-arg", "APP_RELEASE=fixture-" + name,
                            "-t", tag, str(Path(__file__).parent / "fixtures")], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            container = "wasla-release-fixture-" + name
            docker("run", "-d", "--name", container, "--label", label, "--network", args.network, tag)
            created.append(container)
            slots[name] = {"container": container, "image_id": json.loads(docker("inspect", container))[0]["Image"],
                           "release": "fixture-" + name, "url": "http://" + container + ":3000", "schema_compatibility": "expand-only-reviewed"}
        gateway = "wasla-release-fixture-gateway"
        docker("run", "-d", "--name", gateway, "--label", label, "--network", args.network,
               "-v", str(config_dir) + ":/config:ro", "traefik:v3.6.25", "--entrypoints.web.address=:8080",
               "--providers.file.directory=/config", "--providers.file.watch=true", "--providers.providersthrottleduration=100ms", "--log.level=ERROR")
        created.append(gateway)
        ip = json.loads(docker("inspect", gateway))[0]["NetworkSettings"]["Networks"][args.network]["IPAddress"]
        url = "http://" + ip + ":8080"
        config = {"state_file": str(out / "state.json"), "routing_file": str(config_dir / "wasla.yml"),
                  "hosts": ["safe.wassla.invalid"], "slots": slots, "entrypoint": "web", "tls": False,
                  "public_health_url": url + "/api/health"}
        control = release.Controller(config)
        control.promote("blue")

        def request(path="/api/health", headers=None, method="GET"):
            req = urllib.request.Request(url + path, headers={"Host": "safe.wassla.invalid", **(headers or {})}, method=method)
            try:
                with urllib.request.urlopen(req, timeout=8) as response:
                    return response.status, json.load(response)
            except urllib.error.HTTPError as exc:
                return exc.code, json.load(exc)

        errors, observed, lock = [], [], threading.Lock()
        def load(index):
            for _ in range(80):
                try:
                    status, body = request()
                    with lock:
                        observed.append(body.get("release"))
                        if status != 200:
                            errors.append(status)
                except Exception as exc:
                    with lock:
                        errors.append(type(exc).__name__)
                time.sleep(0.05)

        with ThreadPoolExecutor(max_workers=8) as pool:
            loads = [pool.submit(load, i) for i in range(6)]
            slow = pool.submit(request, "/slow")
            time.sleep(0.35)
            control.promote("green")
            assert request()[1]["release"] == "fixture-green"
            assert request(headers={"x-deployment-id": "fixture-blue"})[1]["release"] == "fixture-blue"
            assert request("/_next/static/example.js?dpl=fixture-blue")[1]["release"] == "fixture-blue"
            assert slow.result()[1]["release"] == "fixture-blue", "In-flight request was interrupted/replayed"
            for i in range(20):
                assert request("/mutate?id=" + str(i), method="POST")[0] == 200
            assert request()[1]["duplicates"] == 0
            assert request("/api/internal/jobs/run", method="POST")[0] == 503
            control.rollback()
            assert request()[1]["release"] == "fixture-blue"
            for task in loads:
                task.result()
        assert not errors, errors
        assert set(observed) == {"fixture-blue", "fixture-green"}
        old_route = (config_dir / "wasla.yml").read_bytes()
        docker("stop", slots["green"]["container"])
        try:
            control.promote("green")
            raise AssertionError("Stopped candidate was admitted")
        except ValueError:
            pass
        assert (config_dir / "wasla.yml").read_bytes() == old_route
        assert request()[1]["release"] == "fixture-blue"
        summary = {"requestsDuringCutover": len(observed), "requestErrors": len(errors), "versionsObserved": sorted(set(observed)),
                   "inFlightRequestPreserved": True, "oldVersionNavigationAndAssetsPreserved": True,
                   "mutationReplays": 0, "rollbackVerified": True, "unhealthyPromotionRejected": True,
                   "candidateJobsDisabled": True, "productionWrites": False}
        (out / "result.json").write_text(json.dumps(summary, indent=2))
        print(json.dumps(summary))
    finally:
        for name in reversed(created):
            info = json.loads(docker("inspect", name))[0]
            assert info["Config"]["Labels"].get("wasla.release.fixture") == "isolated"
            docker("rm", "-f", name)


if __name__ == "__main__":
    main()
