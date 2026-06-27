#!/bin/sh
set -e

# Applies migrations, then re-seeds only the tables whose committed seed
# source changed since the last deploy (new sections seed automatically).
node dist/seed.js

exec node server.js
