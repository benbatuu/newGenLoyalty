#!/usr/bin/env bash
# Materialize Wallet certs from base64 env vars (Render-friendly).
set -euo pipefail

CERT_DIR="${CERT_DIR:-/tmp/ngl-certs}"
mkdir -p "$CERT_DIR"

write_b64() {
  local var_name="$1"
  local out_file="$2"
  local b64="${!var_name:-}"
  if [[ -z "$b64" ]]; then
    return 1
  fi
  echo "$b64" | tr -d '\n\r\t ' | base64 -d >"$out_file"
  chmod 600 "$out_file"
  echo "Wrote $out_file (${#b64} b64 chars)"
  return 0
}

if write_b64 APPLE_PASS_CERT_B64 "$CERT_DIR/apple-pass-cert.pem"; then
  export APPLE_PASS_CERT_PATH="$CERT_DIR/apple-pass-cert.pem"
fi
if write_b64 APPLE_PASS_KEY_B64 "$CERT_DIR/apple-pass-key.pem"; then
  export APPLE_PASS_KEY_PATH="$CERT_DIR/apple-pass-key.pem"
fi
if write_b64 APPLE_WWDR_CERT_B64 "$CERT_DIR/wwdr.pem"; then
  export APPLE_WWDR_CERT_PATH="$CERT_DIR/wwdr.pem"
fi
if write_b64 GOOGLE_WALLET_SA_B64 "$CERT_DIR/google-wallet-sa.json"; then
  export GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH="$CERT_DIR/google-wallet-sa.json"
fi

exec "$@"
