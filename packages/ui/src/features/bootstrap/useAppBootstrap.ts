import { useEffect } from "react";
import { coreStore, useStore } from "../../store";

export function useAppBootstrap() {
  const set = useStore((state) => state.set);
  const addToast = useStore((state) => state.addToast);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          cols,
          envs,
          hist,
          fls,
          activeEnvId,
          retention,
          examples,
          diffRules,
          cookieList,
          protocolDefaults,
        ] = await Promise.all([
          coreStore.listCollections(),
          coreStore.listEnvironments(),
          coreStore.listHistory(200),
          coreStore.listFlows(),
          coreStore.getActiveEnvironmentId(),
          coreStore.getRetentionSettings(),
          coreStore.listResponseExamples(),
          coreStore.listDiffIgnoreRules(),
          coreStore.listCookies(),
          coreStore.getDefaultProtocolOptions(),
        ]);
        const reqs = await coreStore.listRequests();
        const folds = await coreStore.listFolders();
        set({
          collections: cols,
          environments: envs,
          history: hist,
          flows: fls,
          requests: reqs,
          folders: folds,
          activeEnvironmentId: activeEnvId,
          retentionSettings: retention,
          responseExamples: examples,
          diffIgnoreRules: diffRules,
          cookies: cookieList,
          protocolDefaults,
        });
      } catch (e) {
        addToast("error", `Failed to load data: ${e}`);
      }
    };
    load();
  }, [addToast, set]);
}
