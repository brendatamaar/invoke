import type { Flow } from "../types";
import { clonePlain, id } from "../request";
import type { InvokeDB } from "./db";

export function listFlows(db: InvokeDB) {
  return db.flows.orderBy("updatedAt").reverse().toArray();
}

export async function saveFlow(db: InvokeDB, flow: Partial<Flow> & Pick<Flow, "name" | "steps">) {
  const now = Date.now();
  const saved: Flow = {
    id: flow.id || id(),
    name: flow.name,
    steps: clonePlain(flow.steps),
    createdAt: flow.createdAt ?? now,
    updatedAt: now,
  };
  await db.flows.put(saved);
  return saved;
}

export async function deleteFlow(db: InvokeDB, flowId: string) {
  await db.flows.delete(flowId);
}
