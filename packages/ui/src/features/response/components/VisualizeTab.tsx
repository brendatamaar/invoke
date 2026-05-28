import { useStore } from "../../../store";

export function VisualizeTab() {
  const { response } = useStore();
  if (!response) return null;

  const ct =
    (Array.isArray(response.headers)
      ? response.headers.find((h) => h.key.toLowerCase() === "content-type")?.value
      : "") ?? "";

  const isImage = ct.startsWith("image/");
  const isHtml = ct.includes("html");
  const isSvg = ct.includes("svg");

  if (isImage) {
    const src = `data:${ct.split(";")[0]};base64,${btoa(response.body)}`;
    return (
      <div className="flex items-center justify-center h-full p-4 overflow-auto bg-[var(--surface-2)]">
        <img src={src} alt="response" className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  if (isHtml || isSvg) {
    const blobType = isSvg ? "image/svg+xml" : ct.split(";")[0] || "text/html";
    const blob = new Blob([response.body], { type: blobType });
    const url = URL.createObjectURL(blob);
    return (
      <iframe
        key={url}
        src={url}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full border-none"
        onLoad={() => URL.revokeObjectURL(url)}
        title="Response preview"
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-xs text-[var(--text-3)]">
      No visual preview available for{" "}
      <code className="ml-1 font-mono">{ct || "this content type"}</code>
    </div>
  );
}
