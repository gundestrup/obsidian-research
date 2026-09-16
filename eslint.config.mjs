import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        Notice: "readonly",
        App: "readonly",
        Plugin: "readonly",
        requestUrl: "readonly",
        Editor: "readonly",
        Modal: "readonly",
        Setting: "readonly",
        PluginSettingTab: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "args": "none" }],
      "obsidianmd/ui/sentence-case": ["error", {
        acronyms: ["NCBI", "DOI", "PMC", "API", "URL", "ID", "WOS"],
        ignoreWords: ["PubMed", "Obsidian", "arXiv", "Web of Science", "Clarivate"],
        ignoreRegex: ["⚠️.*", "📁.*"],
      }],
    },
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        after: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-unused-expressions": "off",
    },
  },
]);
