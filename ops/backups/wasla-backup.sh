#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

exec 9>/run/lock/wasla-backup.lock
flock -n 9 || exit 0

uploader=/usr/local/lib/wasla/backup_upload.py
case "${1:-}" in
  --resume) exec python3 "$uploader" --resume ;;
  --upload-existing)
    [[ $# == 2 ]] || exit 64
    exec python3 "$uploader" --snapshot "$2"
    ;;
  ''|--local-only) ;;
  *) printf 'Usage: wasla-backup [--local-only|--resume|--upload-existing SNAPSHOT]\n' >&2; exit 64 ;;
esac

project=wasla-production-wasla-platform-okuitn
root=/var/backups/wasla
mkdir -p "$root"
chmod 700 "$root"
run=$(mktemp -d "$root/wasla-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
db=$(docker ps -q --filter "label=com.docker.compose.project=$project" --filter label=com.docker.compose.service=db)
test -n "$db"
docker exec "$db" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' </dev/null > "$run/database.dump"
test -s "$run/database.dump"
docker exec -i "$db" pg_restore --list < "$run/database.dump" > "$run/database.toc"

integrations=wasla-production-wasla-integrations-tfx6zn
for service in ai-db evolution-postgres; do
  container=$(docker ps -q --filter "label=com.docker.compose.project=$integrations" --filter "label=com.docker.compose.service=$service")
  test -n "$container"
  docker exec "$container" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' </dev/null > "$run/$service.dump"
  docker exec -i "$container" pg_restore --list < "$run/$service.dump" > "$run/$service.toc"
done

if [[ -f /etc/dokploy/wasla-production/config/pearl-star/sites/psl-test.internal/site_config.json ]]; then
  python3 - "$run/psl-database.sql.gz" <<'PSL_BACKUP_PY'
import gzip,json,pathlib,subprocess,sys
config=json.loads(pathlib.Path('/etc/dokploy/wasla-production/config/pearl-star/sites/psl-test.internal/site_config.json').read_text())
process=subprocess.Popen(['docker','exec','psl-test-db-1','sh','-c','export MYSQL_PWD="$(cat "$MYSQL_ROOT_PASSWORD_FILE")"; exec mariadb-dump -uroot --single-transaction --skip-comments "$1"','sh',config['db_name']],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
with gzip.open(sys.argv[1],'wb',compresslevel=1) as stream:
    for chunk in iter(lambda:process.stdout.read(1024*1024),b''):stream.write(chunk)
if process.wait()!=0:raise RuntimeError('PSL database snapshot failed')
assert pathlib.Path(sys.argv[1]).stat().st_size>1024
PSL_BACKUP_PY
fi

redis=$(docker ps -q --filter "label=com.docker.compose.project=$integrations" --filter label=com.docker.compose.service=evolution-redis)
test -n "$redis"
docker exec "$redis" redis-cli SAVE </dev/null >/dev/null
docker cp "$redis:/data/dump.rdb" "$run/evolution-redis.rdb"
tar --numeric-owner -czf "$run/evolution-instances.tar.gz" -C /var/lib/docker/volumes wasla-evolution-instances/_data
tar --numeric-owner -czf "$run/files.tar.gz" -C /var/lib/docker/volumes \
  wasla-production-public-uploads/_data wasla-production-private-storage/_data
tar --numeric-owner -czf "$run/config.tar.gz" -C /etc/dokploy \
  wasla-production/source wasla-production/config wasla-production/releases \
  wasla-integrations/ai-source wasla-integrations/config wasla-integrations/evolution-pairing-fix \
  "compose/$integrations/code/docker-compose.yml" \
  "compose/$project/code/docker-compose.yml" \
  traefik/dynamic/wasla-platform-host.yml \
  traefik/dynamic/wasla-safe-release.yml \
  traefik/dynamic/wasla-psl-bridge.yml \
  -C / usr/local/sbin/wasla-jobs usr/local/sbin/wasla-backup usr/local/lib/wasla/backup_upload.py \
  etc/systemd/system/wasla-jobs.service etc/systemd/system/wasla-jobs.timer \
  etc/systemd/system/wasla-backup.service etc/systemd/system/wasla-backup.timer \
  etc/systemd/system/wasla-backup-resume.service
(
  cd "$run"
  sha256sum *.dump *.toc *.gz *.rdb > SHA256SUMS
)
printf 'Verified local Wasla backup: %s\n' "$(basename "$run")"
if [[ "${1:-}" == --local-only ]]; then exit 0; fi
python3 "$uploader" --snapshot "$run"
printf 'Verified encrypted Wasla backup: %s\n' "$(basename "$run")"
