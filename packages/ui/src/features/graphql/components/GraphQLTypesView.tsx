import { Layers } from "lucide-react";
import type { GraphQLIntrospectionSchema, GraphQLIntrospectionType } from "@invoke/core";
import { kindBadge } from "../utils/badges";
import { TypeDetail } from "./TypeDetail";

export function GraphQLTypesView({
  schema,
  filteredTypes,
  selectedType,
  activeType,
  onSelectType,
  onInsertField,
}: {
  schema: GraphQLIntrospectionSchema;
  filteredTypes: GraphQLIntrospectionType[];
  selectedType: string | null;
  activeType?: GraphQLIntrospectionType;
  onSelectType: (name: string | null) => void;
  onInsertField: (snippet: string) => void;
}) {
  return (
    <>
      <div className="w-60 border-r border-[var(--border)] overflow-y-auto shrink-0 bg-[var(--surface-2)]">
        {filteredTypes.length === 0 && (
          <p className="text-xs text-[var(--text-3)] px-4 py-6 text-center">No types match</p>
        )}
        {filteredTypes.map((type) => (
          <GraphQLTypeListItem
            key={type.name}
            type={type}
            selected={selectedType === type.name}
            onSelect={() => onSelectType(selectedType === type.name ? null : type.name)}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeType ? (
          <div className="p-5">
            <GraphQLActiveTypeHeader type={activeType} />
            <TypeDetail
              type={activeType}
              schema={schema}
              onInsertField={onInsertField}
              onNavigate={onSelectType}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-3)]">
            <Layers size={28} className="opacity-20" />
            <p className="text-sm">Select a type to explore its fields</p>
          </div>
        )}
      </div>
    </>
  );
}

function GraphQLTypeListItem({
  type,
  selected,
  onSelect,
}: {
  type: GraphQLIntrospectionType;
  selected: boolean;
  onSelect: () => void;
}) {
  const badge = kindBadge(type.kind);
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${selected ? "bg-[var(--accent)]/10 border-r-2 border-[var(--accent)]" : "hover:bg-[var(--border)]"}`}
      title={type.description ?? undefined}
    >
      <span className={`text-2xs px-1.5 py-0.5 rounded font-mono shrink-0 ${badge.cls}`}>
        {badge.label}
      </span>
      <span
        className={`text-xs font-mono truncate flex-1 ${selected ? "text-[var(--accent)]" : "text-[var(--text-1)]"}`}
      >
        {type.name}
      </span>
    </button>
  );
}

function GraphQLActiveTypeHeader({ type }: { type: GraphQLIntrospectionType }) {
  const badge = kindBadge(type.kind);
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
      <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-medium ${badge.cls}`}>
        {badge.label}
      </span>
      <span className="text-base font-mono font-semibold text-[var(--accent)]">{type.name}</span>
      {type.description && <span className="text-xs text-[var(--text-3)]">{type.description}</span>}
    </div>
  );
}
