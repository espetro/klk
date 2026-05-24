/** @type {import('dependency-cruiser').IConfiguration} */
import { recommended } from "dependency-cruiser/configs/recommended-strict.js";

// Remove noNonPackageJson and notToUnresolvable
// (false positives for this monorepo: @klk/* resolved by bun workspace,
// @/ Expo aliases resolved by Metro, bun's nested modules are valid)
const baseForbidden = recommended.forbidden.filter(
  (r) => r.name !== "no-non-package-json" && r.name !== "not-to-unresolvable"
);

/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  ...recommended,
  forbidden: [
    ...baseForbidden,
    // UI ↔ Infrastructure isolation rules
    {
      name: "no-ui-from-infrastructure",
      comment: "UI package must not import from infrastructure package",
      severity: "error",
      from: { path: "packages/ui/src" },
      to: { path: "packages/infrastructure/src" },
    },
    {
      name: "no-infrastructure-from-ui",
      comment: "Infrastructure package must not import from UI package",
      severity: "error",
      from: { path: "packages/infrastructure/src" },
      to: { path: "packages/ui/src" },
    },
  ],
};

export default config;
