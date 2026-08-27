import * as fs from 'fs';
import * as path from 'path';

/** Resolve env paths whether API cwd is apps/api or monorepo root. */
export function resolveRepoPath(relativeOrAbsolute: string): string {
  if (!relativeOrAbsolute) {
    throw new Error('Empty path');
  }
  if (path.isAbsolute(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }

  const normalized = relativeOrAbsolute.replace(/^\.\//, '');
  const candidates = [
    path.resolve(process.cwd(), relativeOrAbsolute),
    path.resolve(process.cwd(), normalized),
    path.resolve(process.cwd(), '..', '..', relativeOrAbsolute),
    path.resolve(process.cwd(), '..', '..', normalized),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[2];
}
