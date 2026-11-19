"""Boot the actual release image against a fresh isolated database.

Proves web startup cannot migrate/bill, explicit migration prepares readiness,
and only the separately enabled private worker can run a durable job batch.
"""
import argparse
import json
import subprocess
import time
import urllib.parse
import uuid
from pathlib import Path


def docker(*args, data=None):
    return subprocess.check_output(["docker", *args], input=data, stderr=subprocess.PIPE).decode().strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True)
    parser.add_argument("--network", required=True)
    parser.add_argument("--test-dev", required=True)
    parser.add_argument("--test-db", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert json.loads(docker("network", "inspect", args.network))[0]["Internal"] is True
    assert args.test_db.startswith("wasla-safe-release-db-")
    assert args.test_dev.startswith("wasla-safe-release-dev-")
    image = json.loads(docker("image", "inspect", args.image))[0]
    release = dict(v.split("=", 1) for v in image["Config"]["Env"])["APP_RELEASE"]
    env = dict(v.split("=", 1) for v in json.loads(docker("inspect", args.test_dev))[0]["Config"]["Env"])
    original = urllib.parse.urlparse(env["DATABASE_URL"])
    assert original.path == "/wasla_comms_test"
    database = "wasla_safe_candidate_" + uuid.uuid4().hex[:8]
    url = original._replace(path="/" + database).geturl()
    docker("exec", args.test_db, "sh", "-c", 'exec createdb -U "$POSTGRES_USER" "$1"', "sh", database)
    containers = []

    def sql(statement):
        return docker("exec", "-i", args.test_db, "sh", "-c", 'exec psql -U "$POSTGRES_USER" -d "$1" -At -v ON_ERROR_STOP=1', "sh", database, data=statement.encode())

    runtime = {"DATABASE_URL": url, "APP_RELEASE": release, "APP_PROCESS_MODE": "web", "JOB_RUNNER_ENABLED": "false",
               "AUTH_SECRET": "isolated-candidate-auth-secret", "JOB_RUNNER_SECRET": "isolated-candidate-worker-secret-32-chars",
               "SECRETS_ENCRYPTION_KEY": "isolated-candidate-encryption", "PUBLIC_UPLOADS_PERSISTENT": "true",
               "RESEND_API_KEY": "isolated-provider-disabled", "EMAIL_FROM": "test@example.invalid"}

    def run(name, enabled=False):
        command = ["run", "-d", "--name", name, "--network", args.network]
        for key, value in {**runtime, "JOB_RUNNER_ENABLED": "true" if enabled else "false"}.items():
            command += ["-e", key + "=" + value]
        command.append(image["Id"])
        docker(*command)
        containers.append(name)

    def request(name, path, method="GET", auth=False):
        script = "fetch('http://127.0.0.1:3000" + path + "',{method:'" + method + "',headers:" + ("{authorization:'Bearer '+process.env.JOB_RUNNER_SECRET}" if auth else "{}") + ",signal:AbortSignal.timeout(10000)}).then(async r=>console.log(JSON.stringify({status:r.status,body:await r.json()}))).catch(()=>process.exit(2))"
        return json.loads(docker("exec", name, "node", "-e", script))

    def wait(name):
        for _ in range(60):
            try:
                return request(name, "/api/health")
            except subprocess.CalledProcessError:
                time.sleep(0.5)
        raise RuntimeError("Candidate did not start")

    try:
        web = "wasla-candidate-probe-" + uuid.uuid4().hex[:8]
        run(web)
        first = wait(web)
        assert first["status"] == 503
        assert sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public';") == "0"
        assert request(web, "/api/internal/jobs/run", "POST", True)["status"] == 503
        assert "[subscription-billing]" not in docker("logs", web)

        result = subprocess.run(["docker", "run", "--rm", "--network", args.network, "-e", "DATABASE_URL=" + url,
                                 "-e", "APP_PROCESS_MODE=migrate", image["Id"]], capture_output=True, timeout=180)
        if result.returncode:
            raise RuntimeError("Explicit isolated migration failed")
        healthy = request(web, "/api/health")
        assert healthy["status"] == 200 and healthy["body"]["readiness"] == "ready"
        before = sql("SELECT json_build_object('orders',(SELECT count(*) FROM orders),'settlements',(SELECT count(*) FROM settlements),'jobs',(SELECT count(*) FROM outbox_jobs));")
        assert json.loads(before) == {"orders": 0, "settlements": 0, "jobs": 0}
        docker("restart", web)
        assert wait(web)["status"] == 200
        assert sql("SELECT json_build_object('orders',(SELECT count(*) FROM orders),'settlements',(SELECT count(*) FROM settlements),'jobs',(SELECT count(*) FROM outbox_jobs));") == before

        worker = "wasla-worker-probe-" + uuid.uuid4().hex[:8]
        run(worker, True)
        assert wait(worker)["status"] == 200
        assert request(worker, "/api/internal/jobs/run", "POST", False)["status"] == 401
        batch = request(worker, "/api/internal/jobs/run", "POST", True)
        assert batch["status"] == 200 and batch["body"]["ok"] is True
        assert sql("SELECT count(*) FROM settlements;") == "0"
        assert request(web, "/api/internal/jobs/run", "POST", True)["status"] == 503
        summary = {"imageId": image["Id"], "release": release, "emptySchemaRejected": True,
                   "webCreatedTables": 0, "webCreatedSettlements": 0, "webCreatedJobs": 0,
                   "explicitMigrationVerified": True, "restartSideEffects": 0,
                   "candidateJobsDisabled": True, "privateWorkerAuthenticationVerified": True,
                   "privateWorkerBatchVerified": True, "productionWrites": False}
        Path(args.output).write_text(json.dumps(summary, indent=2))
        print(json.dumps(summary))
    finally:
        for name in reversed(containers):
            docker("rm", "-f", name)
        assert database.startswith("wasla_safe_candidate_")
        docker("exec", args.test_db, "sh", "-c", 'exec dropdb --force -U "$POSTGRES_USER" "$1"', "sh", database)


if __name__ == "__main__":
    main()
