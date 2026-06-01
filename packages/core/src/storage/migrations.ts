import type {
  Flow,
  FlowStep,
  HistoryEntry,
  ProtocolRequestConfig,
  RequestOptions,
  SavedRequest,
} from "../types";
import { NETWORK_OPTION_KEYS } from "../types/settings";
import { stripNetworkOptions } from "../request";

type MigrationTransaction = {
  table<T = unknown>(
    name: string,
  ): {
    toArray(): Promise<T[]>;
    put(value: T): Promise<unknown>;
  };
};

function hasMovedNetworkOptions(options?: RequestOptions) {
  if (!options) return false;
  return NETWORK_OPTION_KEYS.some((key) => Object.prototype.hasOwnProperty.call(options, key));
}

function stripRequestNetworkOptions<T extends { options?: RequestOptions }>(
  request: T,
): { request: T; changed: boolean } {
  const changed = hasMovedNetworkOptions(request.options);
  if (!changed) return { request, changed: false };
  return {
    request: {
      ...request,
      options: stripNetworkOptions(request.options),
    },
    changed: true,
  };
}

export function stripNetworkOptionsFromProtocolRequest<T extends ProtocolRequestConfig>(
  request: T,
): T {
  return stripRequestNetworkOptions(request).request;
}

export function stripNetworkOptionsFromSavedRequest(saved: SavedRequest): SavedRequest {
  const cleaned = stripRequestNetworkOptions(saved.request);
  if (!cleaned.changed) return saved;
  return { ...saved, request: cleaned.request };
}

function stripNetworkOptionsFromFlowStep(step: FlowStep): {
  step: FlowStep;
  changed: boolean;
} {
  if (step.type === "request") {
    const cleaned = stripRequestNetworkOptions(step.request);
    return cleaned.changed
      ? { step: { ...step, request: cleaned.request }, changed: true }
      : { step, changed: false };
  }

  if (step.type === "condition") {
    const thenSteps = stripNetworkOptionsFromFlowSteps(step.thenSteps);
    const elseSteps = step.elseSteps
      ? stripNetworkOptionsFromFlowSteps(step.elseSteps)
      : { steps: step.elseSteps, changed: false };
    if (!thenSteps.changed && !elseSteps.changed) return { step, changed: false };
    return {
      step: {
        ...step,
        thenSteps: thenSteps.steps ?? [],
        elseSteps: elseSteps.steps,
      },
      changed: true,
    };
  }

  if (step.type === "loop") {
    const cleaned = stripNetworkOptionsFromFlowSteps(step.steps);
    return cleaned.changed
      ? { step: { ...step, steps: cleaned.steps ?? [] }, changed: true }
      : { step, changed: false };
  }

  return { step, changed: false };
}

function stripNetworkOptionsFromFlowSteps(steps: FlowStep[] | undefined): {
  steps: FlowStep[] | undefined;
  changed: boolean;
} {
  if (!steps) return { steps, changed: false };
  let changed = false;
  const cleaned = steps.map((step) => {
    const result = stripNetworkOptionsFromFlowStep(step);
    changed ||= result.changed;
    return result.step;
  });
  return { steps: cleaned, changed };
}

export function stripNetworkOptionsFromFlow(flow: Flow): Flow {
  const cleaned = stripNetworkOptionsFromFlowSteps(flow.steps);
  return cleaned.changed ? { ...flow, steps: cleaned.steps ?? [] } : flow;
}

export function stripNetworkOptionsFromHistoryEntry(entry: HistoryEntry): HistoryEntry {
  const cleaned = stripRequestNetworkOptions(entry.request);
  return cleaned.changed ? { ...entry, request: cleaned.request } : entry;
}

export async function migrateNetworkOptionsToDefaults(tx: MigrationTransaction) {
  const requests = tx.table<SavedRequest>("requests");
  for (const saved of await requests.toArray()) {
    const cleaned = stripNetworkOptionsFromSavedRequest(saved);
    if (cleaned !== saved) await requests.put(cleaned);
  }

  const history = tx.table<HistoryEntry>("history");
  for (const entry of await history.toArray()) {
    const cleaned = stripNetworkOptionsFromHistoryEntry(entry);
    if (cleaned !== entry) await history.put(cleaned);
  }

  const flows = tx.table<Flow>("flows");
  for (const flow of await flows.toArray()) {
    const cleaned = stripNetworkOptionsFromFlow(flow);
    if (cleaned !== flow) await flows.put(cleaned);
  }

  await tx.table<{ key: string; value: unknown }>("meta").put({
    key: "schemaVersion",
    value: 6,
  });
}
