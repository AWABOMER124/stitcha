"""Verify GHCR visibility before any image containing build secrets is pushed.

A missing package is initialized using a harmless FROM scratch probe, then
verified through the GitHub API. A public/unrelated/inaccessible package fails
closed. Uses only the short-lived workflow GITHUB_TOKEN, never an owner PAT.
"""
import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request


def ensure_private(repository, image, inspect_package, initialize_probe, pause=time.sleep):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Invalid repository")
    owner = repository.split("/")[0].lower()
    if not re.fullmatch(r"ghcr\.io/" + re.escape(owner) + r"/[a-z0-9_.-]+", image):
        raise ValueError("Release image must belong to the repository owner")
    package = inspect_package()
    if package is None:
        initialize_probe()
        for _ in range(12):
            package = inspect_package()
            if package is not None:
                break
            pause(1)
    if not package or package.get("visibility") != "private":
        raise ValueError("Production images require a verified private package")
    if (package.get("repository") or {}).get("full_name", "").lower() != repository.lower():
        raise ValueError("Package is not linked to the expected repository")
    return {"image": image, "visibility": "private", "repository": repository}


def main():
    repository = os.environ["GITHUB_REPOSITORY"]
    image = os.environ["RELEASE_IMAGE"]
    token = os.environ["GH_TOKEN"]
    owner = repository.split("/")[0]
    package_name = image.rsplit("/", 1)[-1]
    # Repository owner type is authoritative; user and organization package
    # APIs differ. Tokens and Authorization headers are never logged.
    def api(path, missing=False):
        req = urllib.request.Request("https://api.github.com/" + path, headers={
            "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "wasla-release-guard"})
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if missing and exc.code == 404:
                return None
            raise RuntimeError("Registry metadata verification was denied") from None
    repo = api("repos/" + repository)
    kind = "orgs" if repo["owner"]["type"] == "Organization" else "users"
    package_path = kind + "/" + owner + "/packages/container/" + package_name
    def initialize():
        tag = image + ":visibility-probe-" + os.environ.get("GITHUB_RUN_ID", "manual")
        dockerfile = ("FROM scratch\nLABEL org.opencontainers.image.source=https://github.com/" + repository +
                      "\nLABEL io.wasla.visibility-probe=true\n").encode()
        subprocess.run(["docker", "build", "--tag", tag, "-"], input=dockerfile, check=True)
        subprocess.run(["docker", "push", tag], check=True)
    result = ensure_private(repository, image, lambda: api(package_path, missing=True), initialize)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
