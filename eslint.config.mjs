import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow unused vars starting with underscore
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Allow explicit any in some cases
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
)
