import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { resolveRepoPath } from './resolve-path';

function decodeB64(raw: string): Buffer | null {
  try {
    const buf = Buffer.from(raw.replace(/\s/g, ''), 'base64');
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

function looksLikePemOrJson(buf: Buffer): boolean {
  const head = buf.subarray(0, 64).toString('utf8');
  return (
    head.includes('-----BEGIN') ||
    head.trimStart().startsWith('{') ||
    head.includes('Bag Attributes')
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
  const b64 = config.get<string>(opts.b64Key)?.trim();
  if (b64) {
    const fromB64 = decodeB64(b64);
    if (fromB64 && looksLikePemOrJson(fromB64)) return fromB64;
  }

  const configured = config.get<string>(opts.pathKey)?.trim();
  const candidates: string[] = [];
  if (configured) candidates.push(configured);

  for (const name of opts.fallbackFileNames) {
    candidates.push(`/etc/secrets/${name}`);
    candidates.push(path.posix.join('/etc/secrets', name));
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
        if (buf.length > 0 && looksLikePemOrJson(buf)) return buf;
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
  ready: boolean;
};

export function appleMaterialStatus(config: ConfigService): AppleMaterialStatus {
  const passTypeId = Boolean(
    config.get<string>('APPLE_PASS_TYPE_ID')?.trim(),
  );
  const teamId = Boolean(config.get<string>('APPLE_TEAM_ID')?.trim());
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
    ready: passTypeId && teamId && Boolean(cert && key && wwdr),
  };
}

export function applePassMaterials(config: ConfigService): {
  cert: Buffer;
  key: Buffer;
  wwdr: Buffer;
  passphrase?: string;
} | null {
  const status = appleMaterialStatus(config);
  if (!status.ready) return null;
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
  const passphrase =
    config.get<string>('APPLE_PASS_KEY_PASSPHRASE')?.trim() || undefined;
  return { cert, key, wwdr, passphrase };
}

export type GoogleMaterialStatus = {
  issuerId: boolean;
  email: boolean;
  saJson: boolean;
  ready: boolean;
};

export function googleMaterialStatus(config: ConfigService): GoogleMaterialStatus {
  const issuerId = Boolean(
    config.get<string>('GOOGLE_WALLET_ISSUER_ID')?.trim(),
  );
  const email = Boolean(
    config.get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL')?.trim(),
  );
  const saJson = googleSaJson(config) !== null;
  return {
    issuerId,
    email,
    saJson,
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
