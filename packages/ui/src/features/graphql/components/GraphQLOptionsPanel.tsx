import { Select } from "../../../components/shared/Select";
import { useStore } from "../../../store";
import { GQLOptionField, GQLSectionTitle } from "../utils/options";

export function GraphQLOptionsPanel() {
  const { graphqlRequest, setGraphqlRequest } = useStore();
  const useGet = graphqlRequest.httpMethod === "GET";

  return (
    <div className="flex flex-col gap-3 p-3">
      <GQLSectionTitle>Request</GQLSectionTitle>

      <GQLOptionField label="HTTP Method">
        <Select
          value={graphqlRequest.httpMethod ?? "POST"}
          onChange={(e) =>
            setGraphqlRequest({
              httpMethod: e.target.value as "POST" | "GET",
            })
          }
          size="xs"
          wrapperClassName="w-28"
        >
          <option value="POST">POST</option>
          <option value="GET">GET</option>
        </Select>
      </GQLOptionField>

      {useGet && (
        <p className="text-2xs text-[var(--text-3)] pl-[calc(theme(spacing.36)+theme(spacing.2))]">
          Query, variables, and operationName are sent as URL params. File uploads and batch mode
          are unavailable with GET.
        </p>
      )}

      <GQLOptionField label="Content-Type">
        <div className="flex flex-col gap-1">
          {(
            [
              { value: "application/json", label: "application/json" },
              {
                value: "application/graphql+json",
                label: "application/graphql+json",
              },
            ] as const
          ).map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="gql-content-type"
                checked={(graphqlRequest.contentType ?? "application/json") === value}
                onChange={() => setGraphqlRequest({ contentType: value })}
                disabled={useGet}
              />
              <span
                className={`text-xs font-mono ${useGet ? "text-[var(--text-3)]" : "text-[var(--text-1)]"}`}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
      </GQLOptionField>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
        <GQLSectionTitle>Behavior</GQLSectionTitle>

        <GQLOptionField label="APQ">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={graphqlRequest.apq ?? false}
              onChange={(e) => setGraphqlRequest({ apq: e.target.checked })}
              disabled={graphqlRequest.batchMode}
            />
            <span className="text-xs text-[var(--text-2)]">Automated Persisted Queries</span>
          </label>
        </GQLOptionField>

        <GQLOptionField label="Batch mode">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={graphqlRequest.batchMode ?? false}
              onChange={(e) => setGraphqlRequest({ batchMode: e.target.checked })}
              disabled={graphqlRequest.apq || useGet}
            />
            <span className="text-xs text-[var(--text-2)]">Send request as array body</span>
          </label>
        </GQLOptionField>
      </div>
    </div>
  );
}
