#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
deployment_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
env_file=${1:-"$deployment_dir/.env.production"}
timeout_seconds=10
check_count=0
tls_output=

cleanup() {
  [ -z "$tls_output" ] || rm -f "$tls_output"
}
trap cleanup EXIT HUP INT TERM

pass() {
  check_count=$((check_count + 1))
  printf 'ok %02d - %s\n' "$check_count" "$1"
}

fail() {
  printf 'not ok %02d - %s\n' "$((check_count + 1))" "$1" >&2
  printf 'ONLINE_MVP_STATUS=FAILED\n' >&2
  exit 1
}

not_run() {
  printf 'ONLINE_MVP_STATUS=%s\n' "$1"
  exit 0
}

value_for() {
  sed -n "s/^$1=//p" "$env_file" | tail -n 1 | tr -d '\r'
}

resolve_domain() {
  if command -v getent >/dev/null 2>&1; then
    timeout "$timeout_seconds" getent ahosts "$1" >/dev/null 2>&1
  else
    timeout "$timeout_seconds" nslookup "$1" >/dev/null 2>&1
  fi
}

expect_http_200() {
  code=$(curl --connect-timeout 5 --max-time "$timeout_seconds" \
    --fail --silent --show-error --output /dev/null \
    --write-out '%{http_code}' "$1") || fail "$2 returns HTTP 200"
  [ "$code" = "200" ] || fail "$2 returns HTTP 200"
  pass "$2 returns HTTP 200"
}

verify_tls_endpoint() {
  host=$1
  port=$2
  label=$3
  : >"$tls_output"
  if ! timeout "$timeout_seconds" openssl s_client \
    -connect "$host:$port" \
    -servername "$host" \
    -verify_hostname "$host" \
    -verify_return_error </dev/null >"$tls_output" 2>&1; then
    fail "$label certificate chain and hostname verify"
  fi
  grep -q 'Verify return code: 0 (ok)' "$tls_output" ||
    fail "$label certificate chain and hostname verify"
  pass "$label certificate chain and hostname verify"
}

if [ ! -f "$env_file" ]; then
  not_run "NOT_RUN_MISSING_PRODUCTION_ENV"
fi

for command_name in curl openssl timeout nc sed grep tail tr mktemp; do
  command -v "$command_name" >/dev/null 2>&1 ||
    fail "required verification commands are installed"
done
if ! command -v getent >/dev/null 2>&1 &&
  ! command -v nslookup >/dev/null 2>&1; then
  fail "required verification commands are installed"
fi
pass "required verification commands are installed"

app_domain=$(value_for APP_DOMAIN)
mqtt_domain=$(value_for MQTT_DOMAIN)
if [ -z "$app_domain" ] || [ -z "$mqtt_domain" ]; then
  not_run "NOT_RUN_MISSING_DOMAIN"
fi
case "$app_domain $mqtt_domain" in
  *example.com*|*example.org*|*example.net*|*.invalid*|*CHANGE_ME*)
    fail "production domains are non-placeholder"
    ;;
esac
pass "production domains are non-placeholder"

tls_output=$(mktemp)

resolve_domain "$app_domain" ||
  not_run "NOT_RUN_SERVER_UNAVAILABLE"
resolve_domain "$mqtt_domain" ||
  not_run "NOT_RUN_SERVER_UNAVAILABLE"
pass "application and MQTT domains resolve"

expect_http_200 "https://$app_domain/health" "backend health"
expect_http_200 "https://$app_domain/" "dashboard root"
expect_http_200 "https://$app_domain/metrics" "metrics route"

verify_tls_endpoint "$app_domain" 443 "HTTPS"
verify_tls_endpoint "$mqtt_domain" 8883 "MQTTS"

if timeout "$timeout_seconds" nc -z -w 5 "$mqtt_domain" 1883 >/dev/null 2>&1; then
  fail "public plaintext MQTT 1883 is closed"
fi
pass "public plaintext MQTT 1883 is closed"

if [ "${RUN_AUTHENTICATED_MQTT_SMOKE:-0}" = "1" ]; then
  acl_file="$deployment_dir/mosquitto/acl"
  config_file="$deployment_dir/mosquitto/mosquitto.conf"
  gateway_username=$(value_for GATEWAY_MQTT_USERNAME)
  backend_username=$(value_for BACKEND_MQTT_USERNAME)
  [ -n "$gateway_username" ] && [ -n "$backend_username" ] ||
    fail "authenticated MQTT usernames are configured"
  grep -q '^allow_anonymous false$' "$config_file" ||
    fail "authenticated MQTT static policy is hardened"
  grep -Fqx "user $gateway_username" "$acl_file" ||
    fail "authenticated MQTT static policy is hardened"
  grep -Fqx "user $backend_username" "$acl_file" ||
    fail "authenticated MQTT static policy is hardened"
  if grep -Eq 'verification|smoke|test' "$acl_file"; then
    fail "authenticated MQTT smoke does not require expanded production ACLs"
  fi
  pass "authenticated MQTT ACL is statically verified"
  printf '%s\n' \
    'AUTHENTICATED_MQTT_SMOKE_STATUS=NOT_RUN_NO_SAFE_TEST_TOPIC'
fi

printf '1..%d\n' "$check_count"
printf 'ONLINE_MVP_STATUS=VERIFIED\n'
