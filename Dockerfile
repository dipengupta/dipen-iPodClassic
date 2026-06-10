# node:*-bookworm-slim (glibc) so better-sqlite3 uses prebuilt binaries.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Bundle the seed script so the runtime image needs no tsx/typescript.
RUN npx esbuild scripts/seed.ts --bundle --platform=node --format=cjs \
    --outfile=dist/seed.js --external:better-sqlite3

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    DATABASE_PATH=/data/ipod.db \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src/data/seed ./src/data/seed
COPY docker-entrypoint.sh ./

RUN useradd -r -u 1001 ipod && mkdir -p /data && chown ipod /data
USER ipod

EXPOSE 3000
VOLUME /data
ENTRYPOINT ["./docker-entrypoint.sh"]
