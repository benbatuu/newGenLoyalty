#!/usr/bin/env bash
# Materialize Wallet certs from base64 env vars (Render-friendly).
# Optional: skip if files already exist at the configured paths.
set -euo pipefail

CERT_DIR="${CERT_DIR:-/tmp/ngl-certs}"
mkdir -p "$CERT_DIR"

write_b64() {
  local var_name="$1"
  local out_file="$2"
  local b64="${!var_name:-}"
  if [[ -z "$b64" ]]; then
    return 0
  fi
  # strip whitespace/newlines that dashboards sometimes insert
  echo "$b64" | tr -d '\n\r\t ' | base64 -d >"$out_file"
  chmod 600 "$out_file"
  echo "Wrote $out_file (${#b64} b64 chars)"
}

write_b64 APPLE_PASS_CERT_B64 "$CERT_DIR/apple-pass-cert.pem"
write_b64 APPLE_PASS_KEY_B64 "$CERT_DIR/apple-pass-key.pem"
write_b64 APPLE_WWDR_CERT_B64 "$CERT_DIR/wwdr.pem"
write_b64 GOOGLE_WALLET_SA_B64 "$CERT_DIR/google-wallet-sa.json"

exec "$@"
