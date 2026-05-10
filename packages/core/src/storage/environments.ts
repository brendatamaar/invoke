import type { Environment } from "../types";
import { clonePlain, id } from "../request";
import type { InvokeDB } from "./db";
import { getMeta, setMeta } from "./meta";

export function listEnvironments(db: InvokeDB) {
  return db.environments.orderBy("updatedAt").reverse().toArray();
}

export async function saveEnvironment(
  db: InvokeDB,
  environment: Partial<Environment> & Pick<Environment, "name" | "variables">,
) {
  const now = Date.now();
  const saved: Environment = {
    id: environment.id || id(),
    name: environment.name,
    variables: environment.variables,
    createdAt: environment.createdAt ?? now,
    updatedAt: now,
  };
  await db.environments.put(clonePlain(saved));
  return saved;
}

export async function deleteEnvironment(
  db: InvokeDB,
  environmentId: string,
) {
  await db.environments.delete(environmentId);
  const active = await getActiveEnvironmentId(db);
  if (active === environmentId) await setActiveEnvironmentId(db, undefined);
}

export function getActiveEnvironmentId(db: InvokeDB) {
  return getMeta<string>(db, "activeEnvironment");
}

export function setActiveEnvironmentId(
  db: InvokeDB,
  environmentId?: string,
) {
  return setMeta(db, "activeEnvironment", environmentId);
}
