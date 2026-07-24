#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
deployment_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
compose_file="$deployment_dir/compose.production.yaml"
env_file=${1:-"$deployment_dir/.env.production"}

"$script_dir/validate-deployment.sh" "$env_file"

app_domain=$(sed -n 's/^APP_DOMAIN=//p' "$env_file" | tail -n 1 | tr -d '\r')
compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

echo "Building production frontend and backend images..."
compose build --pull frontend backend

echo "Starting the production stack..."
compose up -d --wait --remove-orphans
compose ps

echo "Checking the public HTTPS health endpoint..."
attempt=1
while [ "$attempt" -le 18 ]; do
  if curl --fail --silent --show-error "https://$app_domain/health" >/dev/null; then
    echo "Deployment healthy at https://$app_domain/health"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 5
done

echo "Public health check failed after 90 seconds." >&2
echo "Inspect services with: docker compose --env-file $env_file -f $compose_file ps" >&2
exit 1
