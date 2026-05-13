import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Neutral surfaces */
        "bg-0": "var(--bg-0)",
        "bg-1": "var(--bg-1)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        "bg-4": "var(--bg-4)",
        /* Borders */
        "line-1": "var(--line-1)",
        "line-2": "var(--line-2)",
        "line-3": "var(--line-3)",
        /* Foreground */
        "fg-0": "var(--fg-0)",
        "fg-1": "var(--fg-1)",
        "fg-2": "var(--fg-2)",
        "fg-3": "var(--fg-3)",
        "fg-4": "var(--fg-4)",
        /* Accent */
        accent: "var(--accent)",
        "accent-dim": "var(--accent-dim)",
        "accent-faint": "var(--accent-faint)",
        /* State */
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        info: "var(--info)",
        /* Legacy aliases */
        surface: "var(--bg-1)",
        "surface-2": "var(--bg-2)",
        border: "var(--line-2)",
        "border-strong": "var(--line-3)",
        "text-1": "var(--fg-0)",
        "text-2": "var(--fg-1)",
        "text-3": "var(--fg-2)",
        "accent-subtle": "var(--accent-faint)",
        "accent-fg": "var(--bg-0)",
        "danger-subtle": "var(--danger-bg)",
        success: "var(--ok)",
        "success-subtle": "var(--ok-bg)",
        "warn-subtle": "var(--warn-bg)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs: ["12px", "16px"],
        sm: ["13px", "20px"],
        base: ["14px", "20px"],
        md: ["15px", "22px"],
        lg: ["16px", "24px"],
        xl: ["20px", "28px"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
      },
      transitionDuration: {
        fast: "80ms",
        base: "140ms",
        slow: "220ms",
      },
      transitionTimingFunction: {
        invoke: "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [forms],
} satisfies Config;
