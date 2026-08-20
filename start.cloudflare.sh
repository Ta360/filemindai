#!/bin/sh
# Runs both processes the Cloudflare Container needs: the Python/Matplotlib
# chart service in the background, and the Node backend (which also serves
# the built frontend) as the container's main process.
set -e

cd /app/charts-service
gunicorn -b 0.0.0.0:5001 -w 2 --timeout 30 app:app &

cd /app/backend
exec node dist/backend/src/server.js
