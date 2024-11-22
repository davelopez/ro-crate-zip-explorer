import jseslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ["dist", "coverage", "examples", "eslint.config.js", "vitest.config.ts"],
  },
  jseslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    // Custom rules
    rules: {
      // Allow numbers to be used in template literals.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
        },
      ],
      // Disallow the use of Buffer. Not supported in browser environments.
      "@typescript-eslint/no-restricted-types": [
        "error",
        {
          types: {
            Buffer: {
              message: "Use Uint8Array instead.",
              suggest: ["Uint8Array"],
            },
          },
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "Buffer",
          message: "Use Uint8Array instead.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          name: "buffer",
          message: "Use Uint8Array instead.",
        },
        {
          name: "node:buffer",
          message: "Use Uint8Array instead.",
        },
      ],
    },
  },
];
