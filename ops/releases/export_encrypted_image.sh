#!/usr/bin/env bash
set -Eeuo pipefail
image=${1:?image required}
release=${2:?built release required}
output=${3:?output directory required}
[[ "$release" =~ ^git-[a-f0-9]{40}$ ]]
mkdir -p "$output"
chmod 700 "$output"
export GNUPGHOME
GNUPGHOME=$(mktemp -d)
chmod 700 "$GNUPGHOME"
trap 'gpgconf --kill gpg-agent >/dev/null 2>&1 || true; rm -rf -- "$GNUPGHOME"' EXIT
recipient=$(tr -d '\r\n' < ops/releases/production-recipient.fingerprint)
[[ "$recipient" =~ ^[A-F0-9]{40}$ ]]
gpg --batch --import ops/releases/production-recipient.asc
actual=$(gpg --batch --with-colons --list-keys | awk -F: '$1=="fpr" {print $10; exit}')
test "$actual" = "$recipient"
if gpg --batch --with-colons --list-secret-keys 2>/dev/null | grep -q '^sec:'; then
  echo 'Build runner must not hold the production private key' >&2
  exit 1
fi
docker image inspect "$image" >/dev/null
# Stream plaintext directly into authenticated OpenPGP encryption; never
# upload or materialize an unencrypted Docker archive as an artifact.
docker save "$image" | gzip -1 | gpg --batch --yes --trust-model always \
  --cipher-algo AES256 --compress-algo none --recipient "$recipient" \
  --encrypt --output "$output/image.tar.gz.gpg"
python3 - "$image" "$release" "$recipient" "$output" <<'PY'
import hashlib,json,os,subprocess,sys
from pathlib import Path
image,release,recipient,output=sys.argv[1:]
metadata=json.loads(subprocess.check_output(['docker','image','inspect',image]))[0]
env=dict(value.split('=',1) for value in metadata['Config']['Env'])
if env.get('APP_RELEASE')!=release:raise ValueError('Image build identity mismatch')
path=Path(output); archive=path/'image.tar.gz.gpg'; digest=hashlib.sha256()
with archive.open('rb') as stream:
    for chunk in iter(lambda:stream.read(1024*1024),b''):digest.update(chunk)
record={'image':image,'image_id':metadata['Id'],'release':release,'source_commit':release.removeprefix('git-'),'recipient_fingerprint':recipient,'encrypted_sha256':digest.hexdigest(),'workflow_run':os.environ.get('GITHUB_RUN_ID'),'format':'docker-save-gzip-openpgp-v1'}
(path/'release.json').write_text(json.dumps(record,indent=2)+'\n')
PY
