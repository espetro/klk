# syntax=docker/dockerfile:1

# ---------- stage 1: build the PWA (One SPA → static dist) ----------
FROM node:24-alpine AS pwa
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
WORKDIR /src
# workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/proto/package.json packages/proto/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY apps/pwa/package.json apps/pwa/package.json
RUN pnpm install --frozen-lockfile
COPY packages ./packages
COPY apps/pwa ./apps/pwa
RUN pnpm -C apps/pwa build

# ---------- stage 2: build the relay + seeder ----------
FROM golang:1.25-alpine AS relay
WORKDIR /src
COPY apps/relay/go.mod apps/relay/go.sum ./
RUN go mod download
COPY apps/relay .
RUN CGO_ENABLED=0 go build -o /out/klk-relay ./cmd/klk-relay \
 && CGO_ENABLED=0 go build -o /out/klk-seed ./cmd/klk-seed

# ---------- stage 3: tiny runtime ----------
FROM alpine:3.21
RUN adduser -D -u 10001 klk && mkdir -p /data && chown klk /data
USER klk
COPY --from=relay /out/klk-relay /usr/local/bin/klk-relay
COPY --from=relay /out/klk-seed /usr/local/bin/klk-seed
COPY --from=pwa /src/apps/pwa/dist/client /srv/pwa
ENV ADDR=:3334 DATA_DIR=/data STATIC_DIR=/srv/pwa
EXPOSE 3334
ENTRYPOINT ["klk-relay"]
