#!/bin/sh
set -e

APP_PORT="${SERVER_INTERNAL_PORT:-${PORT:-8000}}"
WORKERS="${WORKERS:-2}"
LOG_LEVEL="${LOG_LEVEL:-info}"

echo "[entrypoint] Running in production mode (workers=$WORKERS, log-level=$LOG_LEVEL)..."
echo "[entrypoint] Checking and migrating database schema..."
python -m src.init_db || {
    echo "[entrypoint] Warning: python -m src.init_db failed or timed out. Continuing startup..."
}

# Determine SSL status (defaults to true if unset or true/1/yes)
IS_SSL_ENABLED=false
case "${SSL_ENABLED:-true}" in
    [Tt][Rr][Uu][Ee]|1|[Yy][Ee][Ss]|[Oo][Nn])
        IS_SSL_ENABLED=true
        ;;
    *)
        IS_SSL_ENABLED=false
        ;;
esac

SSL_ARGS=""
if [ "$IS_SSL_ENABLED" = "true" ]; then
    KEY_PATH=""
    CERT_PATH=""

    if [ -n "$SSL_KEYFILE" ] && [ -n "$SSL_CERTFILE" ] && [ -f "$SSL_KEYFILE" ] && [ -f "$SSL_CERTFILE" ]; then
        KEY_PATH="$SSL_KEYFILE"
        CERT_PATH="$SSL_CERTFILE"
    elif [ -f "certs/dev/localhost+2-key.pem" ] && [ -f "certs/dev/localhost+2.pem" ]; then
        KEY_PATH="certs/dev/localhost+2-key.pem"
        CERT_PATH="certs/dev/localhost+2.pem"
    elif [ -f "cert/dev/localhost+2-key.pem" ] && [ -f "cert/dev/localhost+2.pem" ]; then
        KEY_PATH="cert/dev/localhost+2-key.pem"
        CERT_PATH="cert/dev/localhost+2.pem"
    elif [ -f "cert/privkey.pem" ] && [ -f "cert/fullchain.pem" ]; then
        KEY_PATH="cert/privkey.pem"
        CERT_PATH="cert/fullchain.pem"
    elif [ -f "certs/privkey.pem" ] && [ -f "certs/fullchain.pem" ]; then
        KEY_PATH="certs/privkey.pem"
        CERT_PATH="certs/fullchain.pem"
    elif [ -f "cert/server.key" ] && [ -f "cert/server.crt" ]; then
        KEY_PATH="cert/server.key"
        CERT_PATH="cert/server.crt"
    elif [ -f "certs/server.key" ] && [ -f "certs/server.crt" ]; then
        KEY_PATH="certs/server.key"
        CERT_PATH="certs/server.crt"
    fi

    if [ -n "$KEY_PATH" ] && [ -n "$CERT_PATH" ]; then
        echo "[entrypoint] Starting Uvicorn with HTTPS on port $APP_PORT using $CERT_PATH ..."
        SSL_ARGS="--ssl-keyfile $KEY_PATH --ssl-certfile $CERT_PATH"
    else
        echo "[entrypoint] WARNING: SSL_ENABLED is true, but no SSL certificates were found in cert/ or certs/!"
        echo "[entrypoint] Falling back to standard HTTP on port $APP_PORT..."
    fi
else
    echo "[entrypoint] SSL disabled (SSL_ENABLED=$SSL_ENABLED). Starting Uvicorn with standard HTTP on port $APP_PORT..."
fi

# Production Uvicorn invocation: multi-workers, proxy-headers, no server header
exec uvicorn src.main:app \
    --host 0.0.0.0 \
    --port "$APP_PORT" \
    --workers "$WORKERS" \
    --proxy-headers \
    --forwarded-allow-ips='*' \
    --log-level "$LOG_LEVEL" \
    --no-server-header \
    $SSL_ARGS
