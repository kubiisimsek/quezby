#!/usr/bin/env bash
#
# Builds the API as one zip for shared hosting, where it is uploaded and
# extracted by hand (see docs/deployment/shared-hosting.md):
#
#   ./scripts/package-api.sh staging
#   ./scripts/package-api.sh production
#
# → dist-deploy/quezby-api-<env>-<timestamp>.zip with production dependencies
# installed and apps/api/.env.<env> (git-ignored) inside as .env.

set -euo pipefail

ENVIRONMENT="${1:-}"
case "$ENVIRONMENT" in
  staging | production) ;;
  *)
    echo "usage: $0 <staging|production>" >&2
    exit 64
    ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="$ROOT/apps/api"
OUT="$ROOT/dist-deploy"
NAME="quezby-api-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S)"
COMPOSER="${COMPOSER_BIN:-composer}"

for tool in rsync zip php "$COMPOSER"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "error: '$tool' is not installed." >&2
    exit 69
  fi
done

WORK="$(mktemp -d "${TMPDIR:-/tmp}/quezby-api.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
BUILD="$WORK/$NAME"

echo "→ Copying apps/api"
# Dependencies are installed fresh without dev packages; caches, logs,
# databases and every .env* stay behind.
rsync -a \
  --exclude '/vendor/' \
  --exclude '/node_modules/' \
  --exclude '/tests/' \
  --exclude '/storage/' \
  --exclude '/bootstrap/cache/*.php' \
  --exclude '/.phpunit.cache/' \
  --exclude '/.phpunit.result.cache' \
  --exclude '/phpunit.xml' \
  --exclude '.env*' \
  --exclude '*.sqlite' \
  --exclude '*.sqlite-journal' \
  --exclude '*.sqlite-wal' \
  --exclude '*.sqlite-shm' \
  --exclude '*.log' \
  --exclude '.git*' \
  --exclude '.DS_Store' \
  --exclude '.idea/' \
  --exclude '.vscode/' \
  "$API/" "$BUILD/"

# Laravel writes here at runtime; the folders must exist on the server.
mkdir -p \
  "$BUILD/bootstrap/cache" \
  "$BUILD/storage/app/private" \
  "$BUILD/storage/app/public" \
  "$BUILD/storage/framework/cache/data" \
  "$BUILD/storage/framework/sessions" \
  "$BUILD/storage/framework/testing" \
  "$BUILD/storage/framework/views" \
  "$BUILD/storage/logs"

echo "→ Installing production dependencies"
(cd "$BUILD" && "$COMPOSER" install --no-dev --optimize-autoloader --no-interaction --no-progress)

ENV_FILE="$API/.env.$ENVIRONMENT"
if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" "$BUILD/.env"
  echo "→ Using apps/api/.env.$ENVIRONMENT as .env"
  grep -Eq "^APP_ENV=\"?${ENVIRONMENT}\"?[[:space:]]*$" "$ENV_FILE" ||
    echo "warning: APP_ENV in .env.$ENVIRONMENT is not '$ENVIRONMENT'." >&2
  grep -Eq '^APP_KEY="?base64:' "$ENV_FILE" ||
    echo "warning: APP_KEY is empty — fill it with: (cd apps/api && php artisan key:generate --show)" >&2
  if grep -Eiq '^APP_DEBUG="?\(?(true|1)' "$ENV_FILE"; then
    echo "warning: APP_DEBUG=true — the API refuses to start in $ENVIRONMENT until it is false." >&2
  fi
else
  echo "warning: apps/api/.env.$ENVIRONMENT not found, so the zip has no .env." >&2
  echo "         Copy apps/api/.env.$ENVIRONMENT.example to apps/api/.env.$ENVIRONMENT, fill it in" >&2
  echo "         and package again — or create .env on the server by hand." >&2
fi

mkdir -p "$OUT"
(cd "$BUILD" && zip -qr -X "$OUT/$NAME.zip" .)

echo "✓ dist-deploy/$NAME.zip ($(du -h "$OUT/$NAME.zip" | cut -f1 | tr -d ' '))"
