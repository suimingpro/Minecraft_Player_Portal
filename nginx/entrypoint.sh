#!/bin/sh
set -e

# Detect SSL mode
IS_SSL=false
case "${SSL_ENABLED:-true}" in
    [Tt][Rr][Uu][Ee]|1|[Yy][Ee][Ss]|[Oo][Nn])
        IS_SSL=true
        ;;
    *)
        IS_SSL=false
        ;;
esac

CERT_FILE=""
KEY_FILE=""

if [ "$IS_SSL" = "true" ]; then
    # Look for certificate files in /etc/nginx/certs
    if [ -n "$SSL_CERTFILE" ] && [ -n "$SSL_KEYFILE" ] && [ -f "$SSL_CERTFILE" ] && [ -f "$SSL_KEYFILE" ]; then
        CERT_FILE="$SSL_CERTFILE"
        KEY_FILE="$SSL_KEYFILE"
    elif [ -f "/etc/nginx/certs/dev/localhost+2.pem" ] && [ -f "/etc/nginx/certs/dev/localhost+2-key.pem" ]; then
        CERT_FILE="/etc/nginx/certs/dev/localhost+2.pem"
        KEY_FILE="/etc/nginx/certs/dev/localhost+2-key.pem"
    elif [ -f "/etc/nginx/certs/fullchain.pem" ] && [ -f "/etc/nginx/certs/privkey.pem" ]; then
        CERT_FILE="/etc/nginx/certs/fullchain.pem"
        KEY_FILE="/etc/nginx/certs/privkey.pem"
    elif [ -f "/etc/nginx/certs/server.crt" ] && [ -f "/etc/nginx/certs/server.key" ]; then
        CERT_FILE="/etc/nginx/certs/server.crt"
        KEY_FILE="/etc/nginx/certs/server.key"
    fi

    if [ -z "$CERT_FILE" ] || [ -z "$KEY_FILE" ]; then
        echo "[nginx-entrypoint] WARNING: SSL_ENABLED is true, but no certificates found in /etc/nginx/certs!"
        echo "[nginx-entrypoint] Falling back to plain HTTP mode on port 80..."
        IS_SSL=false
    fi
fi

UPSTREAM_CLIENT="${UPSTREAM_CLIENT:-client:3000}"
UPSTREAM_SERVER="${UPSTREAM_SERVER:-server:8000}"

echo "[nginx-entrypoint] Configuring Nginx reverse proxy (SSL_ENABLED=$IS_SSL)..."
echo "[nginx-entrypoint] Upstream client: $UPSTREAM_CLIENT, Upstream server: $UPSTREAM_SERVER"

if [ "$IS_SSL" = "true" ]; then
    echo "[nginx-entrypoint] SSL Certificate: $CERT_FILE"
    echo "[nginx-entrypoint] SSL Key: $KEY_FILE"

    cat <<EOF > /etc/nginx/conf.d/default.conf
# Upstream definitions
upstream client_upstream {
    server ${UPSTREAM_CLIENT};
    keepalive 32;
}

upstream server_upstream {
    server ${UPSTREAM_SERVER};
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name _;

    location /healthz {
        access_log off;
        return 200 "healthy\n";
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name _;

    ssl_certificate ${CERT_FILE};
    ssl_certificate_key ${KEY_FILE};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Health check endpoint
    location /healthz {
        access_log off;
        return 200 "healthy\n";
    }

    # Backend API: Authentication & SSO
    location /auth/ {
        proxy_pass http://server_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_buffering off;
    }

    # Backend API: Minecraft Yggdrasil & Server APIs
    location /api/ {
        proxy_pass http://server_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_buffering off;
    }

    # Backend API Docs: Swagger / OpenAPI
    location ~ ^/(docs|redoc|openapi\.json) {
        proxy_pass http://server_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_buffering off;
    }

    # Frontend Next.js HMR / WebSocket & Static Assets
    location /_next/ {
        proxy_pass http://client_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend Next.js Application
    location / {
        proxy_pass http://client_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }
}
EOF

else

    cat <<EOF > /etc/nginx/conf.d/default.conf
# Upstream definitions
upstream client_upstream {
    server ${UPSTREAM_CLIENT};
    keepalive 32;
}

upstream server_upstream {
    server ${UPSTREAM_SERVER};
    keepalive 32;
}

# Plain HTTP Server
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Health check endpoint
    location /healthz {
        access_log off;
        return 200 "healthy\n";
    }

    # Backend API: Authentication & SSO
    location /auth/ {
        proxy_pass http://server_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_buffering off;
    }

    # Backend API: Minecraft Yggdrasil & Server APIs
    location /api/ {
        proxy_pass http://server_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_buffering off;
    }

    # Backend API Docs: Swagger / OpenAPI
    location ~ ^/(docs|redoc|openapi\.json) {
        proxy_pass http://server_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_buffering off;
    }

    # Frontend Next.js HMR / WebSocket & Static Assets
    location /_next/ {
        proxy_pass http://client_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend Next.js Application
    location / {
        proxy_pass http://client_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }
}
EOF

fi

exec nginx -g "daemon off;"

