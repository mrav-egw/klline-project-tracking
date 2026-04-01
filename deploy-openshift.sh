#!/usr/bin/env bash
# Deploy Klline Project Tracking to OpenShift
#
# Flow: build images → push to registry as :latest
# OpenShift picks up the new images on rollout restart.
#
# Usage: ./deploy-openshift.sh
# Requires: oc CLI logged in, docker

set -euo pipefail

NAMESPACE="klline"
APP_HOST="klline.apps.ocp.myegw.cloud"
EXTERNAL_REGISTRY="default-route-openshift-image-registry.apps.ocp.myegw.cloud"

# ── 1. Login to OpenShift registry ───────────────────────────────────────────
echo "==> Logging in to OpenShift registry: $EXTERNAL_REGISTRY"
docker login -u "$(oc whoami)" -p "$(oc whoami --show-token)" "$EXTERNAL_REGISTRY"

# ── 2. Build images ──────────────────────────────────────────────────────────
echo ""
echo "==> Building backend image"
docker build -t "$EXTERNAL_REGISTRY/$NAMESPACE/backend:latest" ./backend

echo ""
echo "==> Building frontend image"
docker build -t "$EXTERNAL_REGISTRY/$NAMESPACE/frontend:latest" ./frontend

# ── 3. Push images ───────────────────────────────────────────────────────────
echo ""
echo "==> Pushing backend image"
docker push "$EXTERNAL_REGISTRY/$NAMESPACE/backend:latest"

echo ""
echo "==> Pushing frontend image"
docker push "$EXTERNAL_REGISTRY/$NAMESPACE/frontend:latest"

# ── 4. Rollout restart to pick up new images ─────────────────────────────────
echo ""
echo "==> Restarting deployments"
oc -n "$NAMESPACE" rollout restart deployment/backend
oc -n "$NAMESPACE" rollout restart deployment/frontend
oc -n "$NAMESPACE" rollout restart deployment/celery-worker
oc -n "$NAMESPACE" rollout restart deployment/celery-beat

# ── 5. Wait for rollouts ─────────────────────────────────────────────────────
echo ""
echo "==> Waiting for rollouts..."
oc -n "$NAMESPACE" rollout status deployment/backend --timeout=120s
oc -n "$NAMESPACE" rollout status deployment/frontend --timeout=120s
oc -n "$NAMESPACE" rollout status deployment/celery-worker --timeout=120s
oc -n "$NAMESPACE" rollout status deployment/celery-beat --timeout=120s

echo ""
echo "==> Deploy complete!"
echo "    App:  https://$APP_HOST"
echo "    API:  https://$APP_HOST/api/health"
