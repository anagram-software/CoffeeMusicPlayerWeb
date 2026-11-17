#!/usr/bin/env sh
# Build the production image and push it to Docker Hub as :<version> and :latest.
# Usage: npm run docker:publish            (needs `docker login` first)
#   IMAGE=other/name npm run docker:publish   to publish elsewhere
#   PUSH=0 npm run docker:publish             to build and tag only
set -eu
cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-thatudeshuk/coffee-music-player}"
VERSION="$(node -p "require('./package.json').version")"
PUSH="${PUSH:-1}"
REVISION="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "warning: uncommitted changes will be included in $IMAGE:$VERSION" >&2
fi

LABELS="--label org.opencontainers.image.version=$VERSION --label org.opencontainers.image.revision=$REVISION"

if docker buildx version >/dev/null 2>&1 && [ "$PUSH" = 1 ]; then
  # Multi-arch (x86 servers and ARM boards like a Raspberry Pi); buildx pushes directly.
  echo "Building $IMAGE:$VERSION for linux/amd64 + linux/arm64 and pushing…"
  docker buildx build --platform linux/amd64,linux/arm64 $LABELS \
    -t "$IMAGE:$VERSION" -t "$IMAGE:latest" --push .
else
  # Without buildx: this machine's architecture only.
  echo "Building $IMAGE:$VERSION ($(uname -m))…"
  docker build $LABELS -t "$IMAGE:$VERSION" -t "$IMAGE:latest" .
  if [ "$PUSH" = 1 ]; then
    docker push "$IMAGE:$VERSION"
    docker push "$IMAGE:latest"
  fi
fi

echo "Done: $IMAGE:$VERSION and $IMAGE:latest"
