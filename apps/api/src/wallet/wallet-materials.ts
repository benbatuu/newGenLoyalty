import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { resolveRepoPath } from './resolve-path';

function envRaw(config: ConfigService, key: string): string | undefined {
  // Prefer process.env (Render runtime) — ConfigService can miss large secrets
  // if dotenv/.env loading order gets weird.
  const fromProcess = process.env[key]?.trim();
  if (fromProcess) return fromProcess;
  return config.get<string>(key)?.trim() || undefined;
}

function decodeB64(raw: string): Buffer | null {
  try {
    const buf = Buffer.from(raw.replace(/\s/g, ''), 'base64');
    return buf.length > 32 ? buf : null;
  } catch {
    return null;
  }
}

/** passkit-generator wants PEM; openssl "Bag Attributes" headers are ok if BEGIN exists. */
function looksLikePemOrJson(buf: Buffer): boolean {
  const text = buf.toString('utf8');
  return (
    text.includes('-----BEGIN') ||
    text.trimStart().startsWith('{')
  );
}

/**
 * Load a PEM/JSON secret from B64 env first, then path env, then well-known
 * Render locations (/etc/secrets, /tmp/ngl-certs).
 */
export function loadSecretBuffer(
  config: ConfigService,
  opts: {
    pathKey: string;
    b64Key: string;
    fallbackFileNames: string[];
  },
): Buffer | null {
  const b64 = envRaw(config, opts.b64Key);
  if (b64) {
    const fromB64 = decodeB64(b64);
    if (fromB64 && looksLikePemOrJson(fromB64)) return fromB64;
  }

  const configured = envRaw(config, opts.pathKey);
  const candidates: string[] = [];
  if (configured) candidates.push(configured);

  for (const name of opts.fallbackFileNames) {
    candidates.push(`/etc/secrets/${name}`);
    candidates.push(`/tmp/ngl-certs/${name}`);
    candidates.push(path.join(process.cwd(), 'certs', name));
    candidates.push(path.join(process.cwd(), '..', '..', 'certs', name));
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      const resolved = path.isAbsolute(candidate)
        ? candidate
        : resolveRepoPath(candidate);
      if (fs.existsSync(resolved)) {
        const buf = fs.readFileSync(resolved);
        if (buf.length > 32 && looksLikePemOrJson(buf)) return buf;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export type AppleMaterialStatus = {
  passTypeId: boolean;
  teamId: boolean;
  cert: boolean;
  key: boolean;
  wwdr: boolean;
  /** Env key present (not whether file parses) — for Render debugging */
  env: {
    APPLE_PASS_TYPE_ID: boolean;
    APPLE_TEAM_ID: boolean;
    APPLE_PASS_CERT_B64: boolean;
    APPLE_PASS_KEY_B64: boolean;
    APPLE_WWDR_CERT_B64: boolean;
    APPLE_PASS_CERT_PATH: boolean;
    APPLE_PASS_KEY_PATH: boolean;
    APPLE_WWDR_CERT_PATH: boolean;
    secretsDirCert: boolean;
    tmpDirCert: boolean;
  };
  ready: boolean;
};

export function appleMaterialStatus(config: ConfigService): AppleMaterialStatus {
  const passTypeId = Boolean(envRaw(config, 'APPLE_PASS_TYPE_ID'));
  const teamId = Boolean(envRaw(config, 'APPLE_TEAM_ID'));
  const cert = loadSecretBuffer(config, {
    pathKey: 'APPLE_PASS_CERT_PATH',
    b64Key: 'APPLE_PASS_CERT_B64',
    fallbackFileNames: ['apple-pass-cert.pem'],
  });
  const key = loadSecretBuffer(config, {
    pathKey: 'APPLE_PASS_KEY_PATH',
    b64Key: 'APPLE_PASS_KEY_B64',
    fallbackFileNames: ['apple-pass-key.pem'],
  });
  const wwdr = loadSecretBuffer(config, {
    pathKey: 'APPLE_WWDR_CERT_PATH',
    b64Key: 'APPLE_WWDR_CERT_B64',
    fallbackFileNames: ['wwdr.pem'],
  });
  return {
    passTypeId,
    teamId,
    cert: Boolean(cert),
    key: Boolean(key),
    wwdr: Boolean(wwdr),
    env: {
      APPLE_PASS_TYPE_ID: Boolean(process.env.APPLE_PASS_TYPE_ID?.trim()),
      APPLE_TEAM_ID: Boolean(process.env.APPLE_TEAM_ID?.trim()),
      APPLE_PASS_CERT_B64: Boolean(process.env.APPLE_PASS_CERT_B64?.trim()),
      APPLE_PASS_KEY_B64: Boolean(process.env.APPLE_PASS_KEY_B64?.trim()),
      APPLE_WWDR_CERT_B64: Boolean(process.env.APPLE_WWDR_CERT_B64?.trim()),
      APPLE_PASS_CERT_PATH: Boolean(process.env.APPLE_PASS_CERT_PATH?.trim()),
      APPLE_PASS_KEY_PATH: Boolean(process.env.APPLE_PASS_KEY_PATH?.trim()),
      APPLE_WWDR_CERT_PATH: Boolean(process.env.APPLE_WWDR_CERT_PATH?.trim()),
      secretsDirCert: fs.existsSync('/etc/secrets/apple-pass-cert.pem'),
      tmpDirCert: fs.existsSync('/tmp/ngl-certs/apple-pass-cert.pem'),
    },
    ready: passTypeId && teamId && Boolean(cert && key && wwdr),
  };
}

export function applePassMaterials(config: ConfigService): {
  cert: Buffer;
  key: Buffer;
  wwdr: Buffer;
  passphrase?: string;
} | null {
  if (!appleMaterialStatus(config).ready) return null;
  const cert = loadSecretBuffer(config, {
    pathKey: 'APPLE_PASS_CERT_PATH',
    b64Key: 'APPLE_PASS_CERT_B64',
    fallbackFileNames: ['apple-pass-cert.pem'],
  });
  const key = loadSecretBuffer(config, {
    pathKey: 'APPLE_PASS_KEY_PATH',
    b64Key: 'APPLE_PASS_KEY_B64',
    fallbackFileNames: ['apple-pass-key.pem'],
  });
  const wwdr = loadSecretBuffer(config, {
    pathKey: 'APPLE_WWDR_CERT_PATH',
    b64Key: 'APPLE_WWDR_CERT_B64',
    fallbackFileNames: ['wwdr.pem'],
  });
  if (!cert || !key || !wwdr) return null;
  const passphrase = envRaw(config, 'APPLE_PASS_KEY_PASSPHRASE') || undefined;
  return { cert, key, wwdr, passphrase };
}

export type GoogleMaterialStatus = {
  issuerId: boolean;
  email: boolean;
  saJson: boolean;
  env: {
    GOOGLE_WALLET_ISSUER_ID: boolean;
    GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: boolean;
    GOOGLE_WALLET_SA_B64: boolean;
    GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH: boolean;
    secretsDirSa: boolean;
  };
  ready: boolean;
};

export function googleMaterialStatus(
  config: ConfigService,
): GoogleMaterialStatus {
  const issuerId = Boolean(envRaw(config, 'GOOGLE_WALLET_ISSUER_ID'));
  const email = Boolean(
    envRaw(config, 'GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL'),
  );
  const saJson = googleSaJson(config) !== null;
  return {
    issuerId,
    email,
    saJson,
    env: {
      GOOGLE_WALLET_ISSUER_ID: Boolean(
        process.env.GOOGLE_WALLET_ISSUER_ID?.trim(),
      ),
      GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: Boolean(
        process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL?.trim(),
      ),
      GOOGLE_WALLET_SA_B64: Boolean(process.env.GOOGLE_WALLET_SA_B64?.trim()),
      GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH: Boolean(
        process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH?.trim(),
      ),
      secretsDirSa: fs.existsSync('/etc/secrets/google-wallet-sa.json'),
    },
    ready: issuerId && email && saJson,
  };
}

export function googleSaJson(config: ConfigService): Buffer | null {
  return loadSecretBuffer(config, {
    pathKey: 'GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH',
    b64Key: 'GOOGLE_WALLET_SA_B64',
    fallbackFileNames: ['google-wallet-sa.json'],
  });
}
