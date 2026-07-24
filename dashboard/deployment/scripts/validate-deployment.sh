#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
deployment_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
repo_dir=$(CDPATH= cd -- "$deployment_dir/../.." && pwd)
compose_file="$deployment_dir/compose.production.yaml"
env_file=${1:-"$deployment_dir/.env.production"}
rendered=$(mktemp)
trap 'rm -f "$rendered"' EXIT HUP INT TERM
check_count=0

pass() {
  check_count=$((check_count + 1))
  printf 'ok %02d - %s\n' "$check_count" "$1"
}

fail() {
  printf 'not ok %02d - %s\n' "$((check_count + 1))" "$1" >&2
  exit 1
}

value_for() {
  sed -n "s/^$1=//p" "$env_file" | tail -n 1 | tr -d '\r'
}

service_block() {
  awk -v service="$1" '
    $0 == "  " service ":" { active = 1; next }
    active && /^  [a-zA-Z0-9_-]+:$/ { exit }
    active { print }
  ' "$compose_file"
}

[ -f "$env_file" ] || fail "production environment file exists"
pass "production environment file exists"

for key in APP_DOMAIN MQTT_DOMAIN ACME_EMAIL BACKEND_MQTT_USERNAME BACKEND_MQTT_PASSWORD MQTT_PASSWORD_FILE_PATH; do
  [ -n "$(value_for "$key")" ] || fail "required production values are populated"
done
if grep -Eq 'CHANGE_ME|(^|[.=])example\.(com|org|net)($|[/:])' "$env_file"; then
  fail "production values contain no placeholders"
fi
pass "required production values are populated and non-placeholder"

[ "$(value_for NEXT_PUBLIC_DASHBOARD_DATA_MODE)" = "live" ] || fail "frontend is built in live mode"
[ -z "$(value_for NEXT_PUBLIC_BACKEND_HTTP_URL)" ] || fail "frontend HTTP URL is blank for same-origin"
[ -z "$(value_for NEXT_PUBLIC_BACKEND_WS_URL)" ] || fail "frontend WebSocket URL is blank for same-origin"
pass "frontend live adapter uses same-origin URLs"

password_path=$(value_for MQTT_PASSWORD_FILE_PATH)
case "$password_path" in
  /*) ;;
  *) password_path="$deployment_dir/${password_path#./}" ;;
esac
[ -s "$password_path" ] || fail "Mosquitto password file exists and is non-empty"
(
  cd "$repo_dir"
  git check-ignore -q -- "$password_path"
) || fail "Mosquitto password file is ignored by Git"
pass "Mosquitto password file is present and ignored"

docker compose --env-file "$env_file" -f "$compose_file" config >"$rendered" ||
  fail "Docker Compose renders successfully"
pass "Docker Compose renders successfully"

services=$(docker compose --env-file "$env_file" -f "$compose_file" config --services | sort | tr '\n' ' ')
[ "$services" = "backend frontend mosquitto traefik " ] ||
  fail "Compose contains exactly the four production services"
pass "Compose contains exactly the four production services"

images=$(docker compose --env-file "$env_file" -f "$compose_file" config --images | sort)
printf '%s\n' "$images" | grep -qx 'eclipse-mosquitto:2.0.22' ||
  fail "container images use pinned stable tags"
printf '%s\n' "$images" | grep -qx 'traefik:v3.7.1' ||
  fail "container images use pinned stable tags"
grep -q '^FROM node:22.23.1-alpine3.24' "$deployment_dir/frontend.Dockerfile" ||
  fail "container images use pinned stable tags"
grep -q '^FROM node:22.23.1-alpine3.24' "$deployment_dir/backend.Dockerfile" ||
  fail "container images use pinned stable tags"
pass "container images use pinned stable tags"

for service in frontend backend mosquitto; do
  if service_block "$service" | grep -q '^    ports:'; then
    fail "only Traefik publishes host ports"
  fi
done
for port in 80 443 8883; do
  grep -Eq "published: ['\"]?$port['\"]?$" "$compose_file" ||
    fail "Traefik publishes 80, 443, and 8883"
done
[ "$(grep -c 'published:' "$compose_file")" -eq 3 ] ||
  fail "Traefik publishes only the three required ports"
pass "only Traefik publishes ports 80, 443, and 8883"

grep -Fq 'PathPrefix(`/api/v1`)' "$compose_file" ||
  fail "HTTPS, WSS, and frontend routes are declared"
grep -Fq 'PathPrefix(`/ws/v1`)' "$compose_file" ||
  fail "HTTPS, WSS, and frontend routes are declared"
grep -Fq 'HostSNI(`${MQTT_DOMAIN}`)' "$compose_file" ||
  fail "HTTPS, WSS, and frontend routes are declared"
pass "HTTPS, WSS, frontend, and MQTTS routes are declared"

grep -q 'exposedbydefault=false' "$compose_file" ||
  fail "Traefik uses private provider defaults and read-only socket"
grep -q '/var/run/docker.sock:/var/run/docker.sock:ro' "$compose_file" ||
  fail "Traefik uses private provider defaults and read-only socket"
if grep -Eq -- '--api(\.dashboard)?=true|8080:8080' "$compose_file"; then
  fail "Traefik dashboard and API remain private"
fi
pass "Traefik provider, socket, and dashboard exposure are hardened"

grep -Eq "BACKEND_PORT: ['\"]?3001['\"]?$" "$compose_file" ||
  fail "backend production environment is exact"
grep -q 'MQTT_BROKER_URL: mqtt://mosquitto:1883' "$compose_file" ||
  fail "backend production environment is exact"
grep -Fq 'WEBSOCKET_ALLOWED_ORIGINS: https://${APP_DOMAIN}' "$compose_file" ||
  fail "backend production environment is exact"
pass "backend uses the internal broker and exact same-origin policy"

grep -q '^allow_anonymous false$' "$deployment_dir/mosquitto/mosquitto.conf" ||
  fail "Mosquitto authentication and persistence are enabled"
grep -q '^password_file ' "$deployment_dir/mosquitto/mosquitto.conf" ||
  fail "Mosquitto authentication and persistence are enabled"
grep -q '^persistence true$' "$deployment_dir/mosquitto/mosquitto.conf" ||
  fail "Mosquitto authentication and persistence are enabled"
pass "Mosquitto authentication, ACL, and persistence are enabled"

acl_file="$deployment_dir/mosquitto/acl"
grep -q '^topic write smart-campus/v1/nodes/+/+$' "$acl_file" ||
  fail "MQTT ACL is least privilege"
grep -q '^topic write smart-campus/v1/gateways/GW_1/status$' "$acl_file" ||
  fail "MQTT ACL is least privilege"
grep -q '^topic read smart-campus/v1/gateways/+/status$' "$acl_file" ||
  fail "MQTT ACL is least privilege"
if grep -Eq 'smart-campus/#|topic (read|write|readwrite) smart-campus/v1/.*/command' "$acl_file"; then
  fail "MQTT ACL is least privilege"
fi
pass "MQTT ACL grants only required publish and subscribe topics"

grep -q '^  internal:$' "$compose_file" || fail "network and volume isolation is declared"
grep -q '^    internal: true$' "$compose_file" || fail "network and volume isolation is declared"
grep -q '^  traefik_acme:$' "$compose_file" || fail "network and volume isolation is declared"
grep -q '^  mosquitto_data:$' "$compose_file" || fail "network and volume isolation is declared"
if grep -Eqi "postgres|published: ['\"]?1883['\"]?$" "$compose_file"; then
  fail "production excludes PostgreSQL and public plaintext MQTT"
fi
pass "networks and volumes are isolated without PostgreSQL or public MQTT 1883"

printf '1..%d\n' "$check_count"
