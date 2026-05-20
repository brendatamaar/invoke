import { useRef } from "react";
import { Plus, Trash2, Upload, Play, Square } from "lucide-react";
import type { MockRoute } from "@invoke/core";
import { MethodBadge } from "../../../components/shared/MethodBadge";
import { makeRoute } from "./mockRouteUtils";

export function MockRoutesSection({
  routes,
  status,
  onAdd,
  onEdit,
  onSync,
  onStop,
  onToggleEnabled,
  onDelete,
  onImport,
  onError,
}: {
  routes: MockRoute[];
  status?: string;
  onAdd: (route: MockRoute) => void;
  onEdit: (route: MockRoute) => void;
  onSync: () => void;
  onStop: () => void;
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (routes: MockRoute[]) => void;
  onError: (message: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const parsed: unknown = Array.isArray(json) ? json : json?.routes;
        if (!Array.isArray(parsed)) throw new Error('Expected a "routes" array');
        onImport(parsed as MockRoute[]);
      } catch (err) {
        onError(String(err));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="border-b border-[var(--border)]">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Routes {routes.length > 0 && `- ${routes.length}`}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSync}
            className="text-[var(--text-3)] hover:text-[var(--ok)] p-0.5"
            title="Sync routes"
          >
            <Play size={13} />
          </button>
          {status === "Active" && (
            <button
              onClick={onStop}
              className="text-[var(--danger)] hover:text-[var(--danger)] p-0.5"
              title="Stop mock server"
            >
              <Square size={13} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
            title="Import routes from JSON"
          >
            <Upload size={13} />
          </button>
          <button
            onClick={() => onAdd(makeRoute())}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
            title="Add new route"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div>
        {routes.map((route) => (
          <div
            key={route.id}
            className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] border-t border-[var(--border)] cursor-pointer"
            onClick={() => onEdit(route)}
          >
            <input
              type="checkbox"
              checked={route.enabled !== false}
              onChange={(e) => {
                e.stopPropagation();
                onToggleEnabled(route.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            />
            <MethodBadge method={route.method} />
            <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">
              {route.pathPattern}
            </span>
            {route.sequences && route.sequences.length > 0 ? (
              <span className="text-2xs shrink-0 bg-[var(--accent-subtle)] text-[var(--accent)] rounded px-1">
                seq-{route.sequences.length}
              </span>
            ) : (
              <span
                className={`text-2xs shrink-0 ${route.status >= 400 ? "text-[var(--danger)]" : "text-[var(--text-3)]"}`}
              >
                {route.status}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(route.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {!routes.length && (
          <p className="p-4 text-xs text-[var(--text-3)] text-center">
            No routes yet
          </p>
        )}
      </div>
    </div>
  );
}
