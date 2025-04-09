import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import('eslint').Linter.Config} */
export default {
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2020,
    sourceType: "module"
  },
  plugins: {
    "@typescript-eslint": tsPlugin,
  },
  rules: {
    ...tsPlugin.configs.recommended.rules,
    "@typescript-eslint/no-explicit-any": "error",
  },
  files: ["src/**/*.ts", "src/**/*.tsx"],
  ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"]
};
