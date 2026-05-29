import { Edit3, Trash2 } from "lucide-react";
import type { Environment } from "@invoke/core";

export function EnvironmentList({
  environments,
  activeEnvironmentId,
  onActivate,
  onEdit,
  onDelete,
}: {
  environments: Environment[];
  activeEnvironmentId: string | undefined;
  onActivate: (id: string) => void;
  onEdit: (environment: Environment) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto py-1">
      {environments.map((environment) => (
        <div
          key={environment.id}
          className={`relative group flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] ${activeEnvironmentId === environment.id ? "bg-[var(--accent-subtle)]" : ""}`}
        >
          <button type="button" className="absolute inset-0" onClick={() => onActivate(environment.id)} aria-label={`Activate ${environment.name}`} />
          <span
            className={`flex-1 text-xs truncate ${activeEnvironmentId === environment.id ? "text-[var(--accent)] font-medium" : "text-[var(--text-1)]"}`}
          >
            {environment.name}
          </span>
          <span className="text-2xs text-[var(--text-3)]">
            {environment.variables?.length ?? 0} vars
          </span>
          <button
            type="button"
            onClick={() => onEdit(environment)}
            className="relative opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
            title="Edit"
          >
            <Edit3 size={12} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(environment.id)}
            className="relative opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      {!environments.length && (
        <p className="p-4 text-xs text-[var(--text-3)] text-center">No environments yet</p>
      )}
    </div>
  );
}
