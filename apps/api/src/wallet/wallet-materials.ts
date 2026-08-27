import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { resolveRepoPath } from './resolve-path';

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
    try {
      return Buffer.from(b64.replace(/\s/g, ''), 'base64');
    } catch {
      return null;
    }
  }

  const configured = config.get<string>(opts.pathKey)?.trim();
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
        return fs.readFileSync(resolved);
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export function applePassMaterials(config: ConfigService): {
  cert: Buffer;
  key: Buffer;
  wwdr: Buffer;
  passphrase?: string;
} | null {
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

export function googleSaJson(config: ConfigService): Buffer | null {
  return loadSecretBuffer(config, {
    pathKey: 'GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_PATH',
    b64Key: 'GOOGLE_WALLET_SA_B64',
    fallbackFileNames: ['google-wallet-sa.json'],
  });
}
