import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

function resolveTheme(mode: string | null): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode === "light" ? "light" : "dark";
}

const theme = localStorage.getItem("theme") ?? "dark";
document.documentElement.setAttribute("data-theme", resolveTheme(theme));
document.documentElement.style.fontSize = `${localStorage.getItem("uiFontSize") ?? 13}px`;

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
mediaQuery.addEventListener("change", () => {
  if (localStorage.getItem("theme") === "system") {
    document.documentElement.setAttribute(
      "data-theme",
      mediaQuery.matches ? "dark" : "light",
    );
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
