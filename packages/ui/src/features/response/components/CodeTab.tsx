import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  CODE_EXPORT_TARGETS,
  GRPC_CODE_EXPORT_TARGETS,
  generateGrpcCodeSnippet,
  type GrpcCodeExportTarget,
  type GrpcRequestConfig,
} from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { Select } from "../../../components/shared/Select";
import { applyProtocolDefaults } from "../../../lib/protocolDefaults";
import { useStore } from "../../../store";

export function CodeTab() {
  const { codeTarget, codeSnippet, codeLoading, request, grpcRequest, set } =
    useStore();
  const [copied, setCopied] = useState(false);
  const [grpcTarget, setGrpcTarget] =
    useState<GrpcCodeExportTarget>("grpc-grpcurl");
  const [grpcSnippet, setGrpcSnippet] = useState("");

  const isGraphQL = request.protocol === "graphql";
  const isGrpc = request.protocol === "grpc";

  const visibleTargets = CODE_EXPORT_TARGETS.filter((t) =>
    isGraphQL ? true : !t.target.startsWith("graphql-"),
  );

  const generateGrpc = (target: GrpcCodeExportTarget) => {
    const snippet = generateGrpcCodeSnippet(
      applyProtocolDefaults(grpcRequest as GrpcRequestConfig, "grpc"),
      target,
    );
    setGrpcSnippet(snippet.code);
    setGrpcTarget(target);
  };

  // Auto-generate on first render for gRPC
  if (isGrpc && !grpcSnippet && grpcRequest.address) {
    const snippet = generateGrpcCodeSnippet(
      applyProtocolDefaults(grpcRequest as GrpcRequestConfig, "grpc"),
      grpcTarget,
    );
    setGrpcSnippet(snippet.code);
  }

  const displayCode = isGrpc ? grpcSnippet : codeSnippet;

  const copy = () => {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        {isGrpc ? (
          <Select
            size="2xs"
            value={grpcTarget}
            onChange={(e) =>
              generateGrpc(e.target.value as GrpcCodeExportTarget)
            }
            wrapperClassName="w-44"
          >
            {GRPC_CODE_EXPORT_TARGETS.map((t) => (
              <option key={t.target} value={t.target}>
                {t.label}
              </option>
            ))}
          </Select>
        ) : (
          <Select
            size="2xs"
            value={codeTarget}
            onChange={(e) =>
              set({ codeTarget: e.target.value as typeof codeTarget })
            }
            wrapperClassName="w-44"
          >
            {visibleTargets.map((t) => (
              <option key={t.target} value={t.target}>
                {t.label}
              </option>
            ))}
          </Select>
        )}
        {codeLoading && !isGrpc && (
          <span className="text-2xs text-[var(--text-3)]">Generating...</span>
        )}
        <button
          onClick={copy}
          disabled={!displayCode}
          className="ml-auto p-1 text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-40"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check size={13} className="text-[var(--ok)]" />
          ) : (
            <Copy size={13} />
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor
          value={displayCode}
          lang={codeTarget === "curl" ? "text" : "text"}
          readOnly
        />
      </div>
    </div>
  );
}
