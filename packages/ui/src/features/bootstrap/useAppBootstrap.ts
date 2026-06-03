import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@invoke/core";
import { coreStore, useStore } from "../../store";

export function useAppBootstrap() {
  const set = useStore((state) => state.set);
  const addToast = useStore((state) => state.addToast);

  // Dexie is the source of truth — sync reactively into Zustand so all
  // existing consumers of state.environments / state.requests keep working
  // without needing manual re-fetches after mutations.
  const environments = useLiveQuery(() => db.environments.orderBy("name").toArray());
  const requests = useLiveQuery(() => db.requests.orderBy("sortOrder").toArray());

  useEffect(() => {
    if (environments !== undefined) set({ environments });
  }, [environments, set]);

  useEffect(() => {
    if (requests !== undefined) set({ requests });
  }, [requests, set]);

  // One-time load for config values not in reactive tables
  useEffect(() => {
    const load = async () => {
      try {
        const [activeEnvId, enableCookies] = await Promise.all([
          coreStore.getActiveEnvironmentId(),
          coreStore.getMeta<boolean>("enableCookies"),
        ]);
        set({
          activeEnvironmentId: activeEnvId,
          ...(enableCookies !== undefined && { enableCookies }),
        });
      } catch (e) {
        addToast("error", `Failed to load data: ${e}`);
      }
    };
    load();
  }, [addToast, set]);
}
