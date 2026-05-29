import { graphQLToRequestConfig, type GraphQLRequestConfig, type RequestDraft } from "@invoke/core";
import type { AppState, GraphQLFileUpload } from "../../../types";
import { extractRequiredVarNames } from "../../graphql/utils/query";

export function buildGraphQLExecutionRequest({
  request,
  graphqlRequest,
  graphqlFileUploads,
  set,
  addToast,
}: {
  request: RequestDraft;
  graphqlRequest: GraphQLRequestConfig;
  graphqlFileUploads: GraphQLFileUpload[];
  set: AppState["set"];
  addToast: AppState["addToast"];
}) {
  const parsedVariables = parseGraphQLVariables(graphqlRequest.variables);
  if (!parsedVariables.ok) {
    addToast("warn", "Variables panel contains invalid JSON");
    set({ requestTab: "graphqlVariables" });
    return null;
  }

  const missingVars = extractRequiredVarNames(graphqlRequest.query ?? "").filter(
    (name) => !(name in parsedVariables.value) || parsedVariables.value[name] === null,
  );
  if (missingVars.length > 0) {
    addToast(
      "warn",
      `Missing required variable${missingVars.length > 1 ? "s" : ""}: ${missingVars.join(", ")}`,
    );
    set({ requestTab: "graphqlVariables" });
    return null;
  }

  const converted = graphQLToRequestConfig({
    ...graphqlRequest,
    url: request.url,
  });

  if (graphqlFileUploads.length > 0) {
    applyGraphQLFileUploads(converted, graphqlFileUploads);
  }

  if (graphqlRequest.batchMode && graphqlFileUploads.length === 0) {
    try {
      converted.body = JSON.stringify([JSON.parse(converted.body)]);
    } catch {
      /* keep original body */
    }
  }

  return { ...converted, protocol: "graphql" } as RequestDraft;
}

function parseGraphQLVariables(variablesText: string | undefined) {
  const text = variablesText?.trim() ?? "{}";
  if (!text || text === "{}") return { ok: true as const, value: {} };
  try {
    return {
      ok: true as const,
      value: JSON.parse(text) as Record<string, unknown>,
    };
  } catch {
    return { ok: false as const };
  }
}

function applyGraphQLFileUploads(
  request: ReturnType<typeof graphQLToRequestConfig>,
  uploads: GraphQLFileUpload[],
) {
  try {
    const operations = JSON.parse(request.body) as Record<string, unknown>;
    const variables = (operations.variables ?? {}) as Record<string, unknown>;
    const map: Record<string, string[]> = {};
    uploads.forEach((upload, index) => {
      const key = String(index);
      map[key] = [`variables.${upload.varPath}`];
      variables[upload.varPath] = null;
    });
    operations.variables = variables;
    request.body = JSON.stringify({
      operations,
      map,
      files: uploads.map((upload, index) => ({
        field: String(index),
        filename: upload.filename,
        dataUrl: upload.dataUrl,
      })),
    });
    request.bodyMode = "graphql-multipart";
  } catch {
    /* keep original body */
  }
}
