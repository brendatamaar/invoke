import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.tsx";

function resolveTheme(mode: string | null): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode === "light" ? "light" : "dark";
}

const storedTheme = localStorage.getItem("theme") ?? "dark";
const uiFontSize = localStorage.getItem("uiFontSize") ?? 13;
document.documentElement.setAttribute("data-theme", resolveTheme(storedTheme));
document.documentElement.style.fontSize = `${uiFontSize}px`;

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
mediaQuery.addEventListener("change", () => {
  if (storedTheme === "system") {
    document.documentElement.setAttribute("data-theme", mediaQuery.matches ? "dark" : "light");
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
