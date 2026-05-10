import { Plus, Trash2 } from "lucide-react";
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
}: {
  routes: MockRoute[];
  status?: string;
  onAdd: (route: MockRoute) => void;
  onEdit: (route: MockRoute) => void;
  onSync: () => void;
  onStop: () => void;
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border-b border-[var(--border)]">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Routes {routes.length > 0 && `- ${routes.length}`}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={onSync} className="btn text-2xs py-0.5 px-2">
            Sync
          </button>
          {status === "Active" && (
            <button
              onClick={onStop}
              className="btn btn-danger text-2xs py-0.5 px-2"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => onAdd(makeRoute())}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
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
              className="accent-[var(--accent)] shrink-0"
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
                className={`text-2xs shrink-0 ${route.status >= 400 ? "text-red-500" : "text-[var(--text-3)]"}`}
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
