const path = require("path");

const recommended = require(path.join(
  __dirname,
  "node_modules/.bin/../dependency-cruiser/configs/recommended-strict.cjs"
));

// Build a filtered forbidden list: remove noNonPackageJson and notToUnresolvable
// (those are false positives for this monorepo: @klk/* aliases resolved by tsconfig,
// @/ Expo aliases resolved by Metro, and bun's nested modules are valid)
const baseForbidden = recommended.forbidden.filter(
  (r) => r.name !== "no-non-package-json" && r.name !== "not-to-unresolvable"
);

module.exports = {
  ...recommended,
  forbidden: [
    ...baseForbidden,

    // Only forbid cross-package deps: packages/ui ↔ packages/infrastructure.
    // apps can import anything, infrastructure can import core, core/ui stay independent.
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
