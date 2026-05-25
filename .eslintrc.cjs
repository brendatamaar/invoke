module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  ignorePatterns: ["dist", "node_modules", "coverage"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  overrides: [
    {
      files: ["*.ts", "**/*.ts"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "no-console": "off",
        "@typescript-eslint/no-unused-vars": ["error", {
          "varsIgnorePattern": "^_",
          "argsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }],
      },
    },
    {
      files: ["*.tsx", "**/*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      plugins: ["@typescript-eslint", "react-hooks"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "no-console": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
        "@typescript-eslint/no-unused-vars": ["error", {
          "varsIgnorePattern": "^_",
          "argsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }],
      },
    },
    {
      // Catches code OUTSIDE features/ importing deep into a slice (e.g. App.tsx →
      // "./features/grpc/components/X"). Does NOT catch relative cross-slice imports
      // from within a feature (e.g. "../../websocket/components/Y") because
      // no-restricted-imports matches on the literal module string, and relative paths
      // don't contain the "features/" segment. For full cross-slice enforcement install
      // eslint-plugin-boundaries and configure per-slice allow lists.
      files: [
        "packages/ui/src/**/*.ts",
        "packages/ui/src/**/*.tsx",
        "src/**/*.ts",
        "src/**/*.tsx",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "**/features/*/components/**",
                  "**/features/*/hooks/**",
                  "**/features/*/utils/**",
                  "**/features/*/api",
                ],
                message:
                  "Import from the feature's index.ts (the slice public API), not deep paths.",
              },
            ],
          },
        ],
      },
    },
    {
      // Files inside a feature may use relative deep paths to their own siblings.
      // NOTE: this also disables the rule for cross-slice relative imports from within
      // a feature — a known gap. See comment above.
      files: [
        "packages/ui/src/features/*/**/*.ts",
        "packages/ui/src/features/*/**/*.tsx",
        "src/features/*/**/*.ts",
        "src/features/*/**/*.tsx",
      ],
      rules: {
        "no-restricted-imports": "off",
      },
    },
  ],
};
