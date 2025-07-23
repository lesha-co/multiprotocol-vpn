#!/bin/sh

# Check if SB_PUBLIC_IP is defined, if not wait and reload .env
echo "checking SB_PUBLIC_IP"
while [ -z "$SB_PUBLIC_IP" ]; do
    echo "SB_PUBLIC_IP not defined, waiting 1 second and reloading .env..."
    sleep 1
    if [ -f "/.env" ]; then
        set -a
        . /.env
        set +a
    fi
done


exec node app/main.js
