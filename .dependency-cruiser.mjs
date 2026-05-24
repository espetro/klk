import { createRequire } from 'node:module';
import path from 'node:path';

// Load the CJS config using absolute path (bypasses package exports)
const configPath = path.resolve('node_modules/dependency-cruiser/configs/recommended-strict.cjs');

const require = createRequire(configPath);
const recommended = require(configPath);

/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  ...recommended,
  forbidden: [
    // Remove noNonPackageJson and notToUnresolvable
    // (false positives for this monorepo: @klk/* resolved by bun workspace,
    // @/ Expo aliases resolved by Metro, bun's nested modules are valid)
    ...recommended.forbidden.filter(
      (_) => _.name !== 'no-non-package-json' && _.name !== 'not-to-unresolvable'
    ),
    // Explicit circular dependency check (included in recommended-strict, but made visible)
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports cause require-cycle crashes and hard-to-debug load ordering bugs',
      from: {},
      to: { circular: true },
    },
    // UI ↔ Infrastructure isolation rules
    {
      name: 'no-ui-from-infrastructure',
      comment: 'UI package must not import from infrastructure package',
      severity: 'error',
      from: { path: 'packages/ui/src' },
      to: { path: 'packages/infrastructure/src' },
    },
    {
      name: 'no-infrastructure-from-ui',
      comment: 'Infrastructure package must not import from UI package',
      severity: 'error',
      from: { path: 'packages/infrastructure/src' },
      to: { path: 'packages/ui/src' },
    },
  ],
};

export default config;
