import { fmtSize } from "../responseFormatting";
import { AssertionsTab } from "./AssertionsTab";
import { AuthDebugTab } from "./AuthDebugTab";
import { CodeTab } from "./CodeTab";
import { ConsoleTab } from "./ConsoleTab";
import { DeferredTab } from "./DeferredTab";
import { GraphQLErrorsTab } from "./GraphQLErrorsTab";
import { HeadersTab } from "./HeadersTab";
import { TLSTab } from "./TLSTab";
import { TimingTab } from "./TimingTab";
import { VisualizeTab } from "./VisualizeTab";
import { QuickAssertionOverlay } from "./overlays/QuickAssertionOverlay";
import { QuickExtractionOverlay } from "./overlays/QuickExtractionOverlay";
import { SaveExampleOverlay } from "./overlays/SaveExampleOverlay";
import { WebSocketLogPanel } from "../../websocket";
import { GrpcResponseViewer } from "../../grpc";
import { useResponseViewerModel } from "../hooks/useResponseViewerModel";
import { ResponseBodyPanel } from "./panels/ResponseBodyPanel";
import {
  EmptyResponseState,
  FailedResponseState,
} from "./panels/ResponseEmptyStates";
import { ResponseStatusBar } from "./panels/ResponseStatusBar";
import { ResponseTabs } from "./panels/ResponseTabs";

export function ResponseViewer() {
  const model = useResponseViewerModel();
  const { store } = model;
  const {
    response,
    responseTab,
    responsePretty,
    set,
    streaming,
    streamBytes,
    assertionResults,
    assertionRules,
    request,
    retryAttempts,
    graphqlDeferredParts,
    consoleLogs,
  } = store;

  if (request.protocol === "websocket") return <WebSocketLogPanel />;
  if (request.protocol === "grpc") return <GrpcResponseViewer />;
  if (!response && !streaming) return <EmptyResponseState />;
  if (response?.status === 0) return <FailedResponseState error={response.error} />;

  return (
    <div className="flex flex-col h-full relative">
      {response && (
        <ResponseStatusBar
          response={response}
          responseTab={responseTab}
          responsePretty={responsePretty}
          retryAttempts={retryAttempts}
          gqlComplexity={model.gqlComplexity}
          gqlCost={model.gqlCost}
          passedCount={model.passedCount}
          totalCount={model.totalCount}
          isJson={model.bodyInfo.isJson}
          jsonPathInput={model.jsonPathInput}
          canDiffHistory={model.history.length >= 2}
          onPretty={() => set({ responsePretty: !responsePretty })}
          onJsonPathInput={model.setJsonPath}
          onAssertion={(draft) => model.setOverlay({ kind: "assertion", draft })}
          onExtraction={(draft) =>
            model.setOverlay({ kind: "extraction", draft })
          }
          onSaveExample={() => {
            model.setExampleName("");
            model.setOverlay({ kind: "saveExample" });
          }}
          onCreateMock={model.createMock}
          onDiffHistory={() => {
            const [latest, previous] = model.history;
            set({
              diffLeftId: previous.id,
              diffRightId: latest.id,
              showDiffModal: true,
            });
          }}
        />
      )}

      {streaming && !response && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--accent-subtle)]">
          <span className="text-xs text-[var(--accent)] animate-pulse">
            Streaming...
          </span>
          <span className="text-2xs text-[var(--text-3)]">
            {fmtSize(streamBytes)}
          </span>
        </div>
      )}

      <ResponseTabs
        responseTab={responseTab}
        passedCount={model.passedCount}
        totalCount={model.totalCount}
        hasConsoleLogs={model.hasConsoleLogs}
        hasConsoleError={model.hasConsoleError}
        consoleCount={consoleLogs.preRequest.length + consoleLogs.postResponse.length}
        hasGraphQLTab={model.hasGraphQLTab}
        hasGraphQLErrors={model.graphqlErrors.length > 0}
        graphqlErrorCount={model.graphqlErrors.length}
        deferredCount={
          graphqlDeferredParts?.filter((part) => part.partIndex > 0).length ?? 0
        }
        onSelect={(tab) => set({ responseTab: tab })}
      />

      <div className="flex-1 overflow-auto">
        {responseTab === "body" && (
          <ResponseBodyPanel
            jsonPathResult={model.jsonPathResult}
            truncated={response?.error?.startsWith("BODY_TRUNCATED:") ?? false}
            displayBody={model.bodyInfo.displayBody}
            lang={model.bodyInfo.lang}
          />
        )}
        {responseTab === "headers" && (
          <HeadersTab
            onQuickAssert={(draft) =>
              model.setOverlay({ kind: "assertion", draft })
            }
            onQuickExtract={(draft) =>
              model.setOverlay({ kind: "extraction", draft })
            }
          />
        )}
        {responseTab === "timing" && <TimingTab />}
        {responseTab === "tls" && <TLSTab />}
        {responseTab === "assertions" && (
          <AssertionsTab
            assertionRules={assertionRules}
            assertionResults={assertionResults}
          />
        )}
        {responseTab === "auth" && <AuthDebugTab />}
        {responseTab === "code" && <CodeTab />}
        {responseTab === "visualize" && <VisualizeTab />}
        {responseTab === "console" && <ConsoleTab />}
        {responseTab === "graphql-errors" && <GraphQLErrorsTab />}
        {responseTab === "graphql-deferred" && <DeferredTab />}
      </div>

      {model.overlay?.kind === "assertion" && (
        <QuickAssertionOverlay
          draft={model.overlay.draft}
          onConfirm={model.addAssertion}
          onClose={() => model.setOverlay(null)}
        />
      )}
      {model.overlay?.kind === "extraction" && (
        <QuickExtractionOverlay
          draft={model.overlay.draft}
          onConfirm={model.addExtraction}
          onClose={() => model.setOverlay(null)}
        />
      )}
      {model.overlay?.kind === "saveExample" && (
        <SaveExampleOverlay
          exampleName={model.exampleName}
          placeholder={`Example ${model.responseExamples.length + 1}`}
          onChange={model.setExampleName}
          onSave={model.saveExample}
          onClose={() => model.setOverlay(null)}
        />
      )}
    </div>
  );
}
