module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  ignorePatterns: ["dist", "node_modules", "coverage"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
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
        "no-console": "off"
      }
    },
    {
      files: ["*.vue", "**/*.vue"],
      parser: "vue-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: "latest",
        sourceType: "module"
      },
      plugins: ["vue", "@typescript-eslint"],
      extends: ["plugin:vue/vue3-recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "vue/multi-word-component-names": "off",
        "vue/no-mutating-props": "off",
        "vue/max-attributes-per-line": "off",
        "vue/singleline-html-element-content-newline": "off",
        "vue/html-self-closing": "off"
      }
    }
  ]
};
