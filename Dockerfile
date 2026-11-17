# syntax=docker/dockerfile:1

# --- Build ------------------------------------------------------------------
# Always runs on the builder's own CPU: the output is static HTML/CSS/JS, the same
# for every architecture, so multi-arch builds need no emulation (QEMU) here.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached until package files change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Serve ------------------------------------------------------------------
# Static files: the app talks to your Navidrome server straight from the browser. The
# one exception is a small proxy for Last.fm playlist import (see docker/nginx.conf).
# Per-architecture, but it only copies files (no RUN), so it also builds without emulation.
FROM nginxinc/nginx-unprivileged:alpine
# Installed as a template: at startup the image's entrypoint sets NGINX_LOCAL_RESOLVERS
# from /etc/resolv.conf (NGINX_ENTRYPOINT_LOCAL_RESOLVERS) and writes conf.d/default.conf
# with it filled in. Only defined environment variables are replaced, so nginx's own
# $variables are left alone.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Runs as a non-root user, so it listens on an unprivileged port.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
