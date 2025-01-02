import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    ignores: ["dist/**", "node_modules/**"], // Loại trừ thư mục dist và node_modules
    languageOptions: {
      globals: {
        ...globals.browser, // Bao gồm các biến toàn cục trình duyệt
        ...globals.node, // Thêm các biến toàn cục của Node.js như process, __dirname
        chrome: true, // Thêm biến 'chrome' vào môi trường
      },
    },
    settings: {
      react: {
        version: "detect", // Tự động phát hiện phiên bản React từ package.json
      },
    },
    rules: {
      "no-unused-vars": [
        "warn", // Hoặc "off" nếu bạn muốn tắt hoàn toàn
        { varsIgnorePattern: "^(__webpack_require__|__unused_webpack_exports|module|exports|isError|data|event)$" }, // Bỏ qua các biến này
      ],
      "no-undef": "error", // Cảnh báo khi biến không được định nghĩa
      "no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^event$", // Bỏ qua các biến có tên là 'event'
        },
      ],
    },
  },
  pluginJs.configs.recommended, // Các quy tắc mặc định từ @eslint/js
  pluginReact.configs.flat.recommended, // Các quy tắc mặc định từ eslint-plugin-react
];

/* eslint-disable no-unused-vars */
const isError = false;
const data = {};
/* eslint-enable no-unused-vars */
