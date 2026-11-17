#!/usr/bin/env node
/**
 * Shared paketten Flutter sabitlerini üretir.
 * Kullanım: pnpm sync:mobile-shared
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'apps/mobile/lib/shared_constants.dart');

execSync('pnpm --filter @ngl/shared build', { cwd: root, stdio: 'inherit' });

const shared = await import(path.join(root, 'packages/shared/dist/index.js'));

const planCodes = Object.values(shared.PLAN_CODES ?? {}).filter(
  (c) => c !== 'enterprise',
);
const programTypes = shared.PROGRAM_TYPE_CATALOG_ORDER ?? [];

const dart = `// GENERATED — do not edit. Run: pnpm sync:mobile-shared

/// Paket kodları (@ngl/shared)
const kPublicPlanCodes = <String>[
${planCodes.map((c) => `  '${c}',`).join('\n')}
];

/// Program tipleri (@ngl/shared)
const kProgramTypeCatalogOrder = <String>[
${programTypes.map((t) => `  '${t}',`).join('\n')}
];
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, dart);
console.log(`Wrote ${out}`);
