import { CodeEditor } from "../../../components/editors/CodeEditor";
import { GQLSubscriptionLog } from "./GQLSubscriptionLog";
import { GraphQLQueryToolbar } from "./GraphQLQueryToolbar";
import { GraphQLSchemaImportModal } from "./GraphQLSchemaImportModal";
import { GraphQLSchemaModal } from "./GraphQLSchemaModal";
import { useGraphQLQueryPanel } from "../hooks/useGraphQLQueryPanel";

export function GraphQLQueryPanel() {
  const model = useGraphQLQueryPanel();
  const { graphqlRequest, setGraphqlRequest, graphqlSchema, request, subscription } = model;

  return (
    <div className="flex flex-col h-full">
      <GraphQLQueryToolbar
        hasSchema={!!graphqlSchema}
        schemaExplorerOpen={model.schemaExplorerOpen}
        requestUrl={request.url}
        curlCopied={model.curlCopied}
        operations={model.operations}
        operationName={graphqlRequest.operationName}
        isSubscription={model.isSubscription}
        subState={subscription.state}
        onOpenImport={() => model.setSchemaModalOpen(true)}
        onToggleExplorer={() => model.setSchemaExplorerOpen((v) => !v)}
        onPrettify={model.handlePrettify}
        onCopyCurl={model.copyCurl}
        onOperationName={(operationName) => setGraphqlRequest({ operationName })}
        onSubscribe={() =>
          subscription.subscribe({
            url: request.url,
            headers: graphqlRequest.headers ?? [],
            query: graphqlRequest.query ?? "",
            variables: graphqlRequest.variables,
            operationName: graphqlRequest.operationName,
          })
        }
        onUnsubscribe={subscription.unsubscribe}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          <CodeEditor
            value={graphqlRequest.query ?? ""}
            onChange={(value) => setGraphqlRequest({ query: value })}
            lang="graphql"
            minHeight="200px"
            extensions={model.editorExtensions}
            editorRef={model.editorRef}
          />
        </div>
      </div>

      {graphqlSchema && model.schemaExplorerOpen && (
        <GraphQLSchemaModal
          schema={graphqlSchema}
          onClose={() => model.setSchemaExplorerOpen(false)}
          onInsertField={model.insertField}
        />
      )}

      {(subscription.messages.length > 0 ||
        subscription.state === "subscribed" ||
        subscription.state === "connecting") && (
        <GQLSubscriptionLog
          state={subscription.state}
          messages={subscription.messages}
          onClear={subscription.clearMessages}
        />
      )}

      <GraphQLSchemaImportModal
        open={model.schemaModalOpen}
        onClose={() => model.setSchemaModalOpen(false)}
      />
    </div>
  );
}
