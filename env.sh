#!/bin/sh

ENV_FILE="/usr/share/nginx/html/env-config.js"

rm -rf $ENV_FILE
touch $ENV_FILE

echo "window._env_ = {" >> $ENV_FILE
echo "  SHYNTR_MANAGEMENT_BACKEND_URL: \"${SHYNTR_MANAGEMENT_BACKEND_URL:-http://localhost:7497}\"," >> $ENV_FILE
echo "  SHYNTR_PUBLIC_BACKEND_URL: \"${SHYNTR_PUBLIC_BACKEND_URL:-http://localhost:7496}\"," >> $ENV_FILE
echo "};" >> $ENV_FILE

echo "env-config.js is successfully created!"