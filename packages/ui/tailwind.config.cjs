/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        line: "var(--line)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        danger: "var(--danger)",
        warn: "var(--warn)",
        ok: "var(--ok)"
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Cascadia Code", "Consolas", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        invoke: "7px"
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};
