import { AlertTriangle } from "lucide-react";
import {
  formatGraphQLTypeRef,
  graphQLFieldSnippet,
  namedGraphQLType,
  typeByName,
  type GraphQLIntrospectionSchema,
  type GraphQLIntrospectionType,
} from "@invoke/core";

export function TypeDetail({
  type,
  schema,
  onInsertField,
  onNavigate,
  compact = false,
}: {
  type: GraphQLIntrospectionType;
  schema: GraphQLIntrospectionSchema;
  onInsertField: (snippet: string) => void;
  onNavigate: (typeName: string) => void;
  compact?: boolean;
}) {
  const indent = compact ? "pl-7" : "pl-2";

  if (type.kind === "ENUM") {
    return (
      <>
        {type.enumValues?.map((val) => (
          <button
            key={val.name}
            onClick={() => onInsertField(val.name)}
            className={`w-full flex items-center gap-1 ${indent} pr-2 py-0.5 hover:bg-[var(--border)] text-left`}
            title={val.description ?? undefined}
          >
            {val.isDeprecated && <AlertTriangle size={9} className="text-[var(--warn)] shrink-0" />}
            <span
              className={`text-2xs font-mono flex-1 truncate ${val.isDeprecated ? "line-through text-[var(--text-3)]" : "text-[var(--text-1)]"}`}
            >
              {val.name}
            </span>
          </button>
        ))}
      </>
    );
  }

  if (type.kind === "UNION") {
    return (
      <>
        {type.possibleTypes?.map((pt) => (
          <button
            key={pt.name}
            onClick={() => pt.name && onNavigate(pt.name)}
            className={`w-full flex items-center gap-1 ${indent} pr-2 py-0.5 hover:bg-[var(--border)] text-left`}
          >
            <span className="text-2xs font-mono text-[var(--accent)] truncate">{pt.name}</span>
          </button>
        ))}
      </>
    );
  }

  if (type.kind === "INPUT_OBJECT") {
    return (
      <>
        {type.inputFields?.map((field) => (
          <InputFieldRow
            key={field.name}
            field={field}
            schema={schema}
            indent={indent}
            onNavigate={onNavigate}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {type.fields?.map((field) => {
        const namedType = namedGraphQLType(field.type);
        const isNavigable = namedType && typeByName(schema, namedType);
        return (
          <button
            key={field.name}
            onClick={() => onInsertField(graphQLFieldSnippet(field))}
            className={`w-full flex items-center gap-1 ${indent} pr-2 py-0.5 hover:bg-[var(--border)] text-left`}
            title={field.description ?? undefined}
          >
            {field.isDeprecated && (
              <AlertTriangle size={9} className="text-[var(--warn)] shrink-0" />
            )}
            <span
              className={`text-2xs font-mono flex-1 truncate ${field.isDeprecated ? "line-through text-[var(--text-3)]" : "text-[var(--text-1)]"}`}
            >
              {field.name}
            </span>
            <TypeRefButton
              namedType={namedType}
              typeRef={field.type}
              isNavigable={!!isNavigable}
              onNavigate={onNavigate}
            />
          </button>
        );
      })}
    </>
  );
}

function InputFieldRow({
  field,
  schema,
  indent,
  onNavigate,
}: {
  field: NonNullable<GraphQLIntrospectionType["inputFields"]>[number];
  schema: GraphQLIntrospectionSchema;
  indent: string;
  onNavigate: (typeName: string) => void;
}) {
  const namedType = namedGraphQLType(field.type);
  const isNavigable = namedType && typeByName(schema, namedType);
  return (
    <div
      className={`w-full flex items-center gap-1 ${indent} pr-2 py-0.5`}
      title={field.description ?? undefined}
    >
      <span className="text-2xs font-mono text-[var(--text-1)] truncate flex-1">{field.name}</span>
      <TypeRefButton
        namedType={namedType}
        typeRef={field.type}
        isNavigable={!!isNavigable}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function TypeRefButton({
  namedType,
  typeRef,
  isNavigable,
  onNavigate,
}: {
  namedType?: string | null;
  typeRef: any;
  isNavigable: boolean;
  onNavigate: (typeName: string) => void;
}) {
  if (!isNavigable || !namedType) {
    return (
      <span className="text-2xs text-[var(--text-3)] truncate ml-1 font-mono">
        {formatGraphQLTypeRef(typeRef)}
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(namedType);
      }}
      className="text-2xs text-[var(--text-3)] hover:text-[var(--accent)] truncate ml-1 font-mono"
      title={`Go to ${namedType}`}
    >
      {formatGraphQLTypeRef(typeRef)}
    </button>
  );
}
