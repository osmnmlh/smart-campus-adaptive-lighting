#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
deployment_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
secret_dir=${MQTT_SECRET_DIR:-"$deployment_dir/secrets/mosquitto"}
password_file="$secret_dir/passwords"
gateway_user=${GATEWAY_MQTT_USERNAME:-gateway_gw1}
backend_user=${BACKEND_MQTT_USERNAME:-backend_ingest}
mosquitto_image=eclipse-mosquitto:2.0.22

case "$gateway_user:$backend_user" in
  *[!A-Za-z0-9_.:-]*)
    echo "MQTT usernames may contain only letters, digits, dot, underscore, colon, and hyphen." >&2
    exit 1
    ;;
esac

if [ "$gateway_user" = "$backend_user" ]; then
  echo "Gateway and backend MQTT usernames must be different." >&2
  exit 1
fi

mkdir -p "$secret_dir"

if [ -e "$password_file" ]; then
  printf 'Replace existing MQTT password file at %s? [y/N] ' "$password_file"
  read -r answer
  case "$answer" in
    y|Y|yes|YES) rm -f "$password_file" ;;
    *) echo "No changes made."; exit 0 ;;
  esac
fi

echo "Enter the gateway MQTT password when prompted (input is hidden)."
docker run --rm -it \
  -v "$secret_dir:/work" \
  "$mosquitto_image" \
  mosquitto_passwd -c /work/passwords "$gateway_user"

echo "Enter the backend MQTT password when prompted (input is hidden)."
docker run --rm -it \
  -v "$secret_dir:/work" \
  "$mosquitto_image" \
  mosquitto_passwd /work/passwords "$backend_user"

docker run --rm --user 0:0 \
  -v "$secret_dir:/work" \
  "$mosquitto_image" \
  sh -c 'chown 1883:1883 /work/passwords && chmod 0600 /work/passwords'

echo "Created the ignored Mosquitto password file at $password_file."
echo "Use the same two plaintext passwords only in deployment/.env.production."
