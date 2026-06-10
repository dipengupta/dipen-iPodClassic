#!/bin/sh
set -e

# Applies migrations, then seeds only if the database is empty.
node dist/seed.js

exec node server.js
