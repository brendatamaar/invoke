import { useEffect } from "react";
import { coreStore, useStore } from "../../store";

export function useAppBootstrap() {
  const set = useStore((state) => state.set);
  const addToast = useStore((state) => state.addToast);

  useEffect(() => {
    const load = async () => {
      try {
        const [reqs, envs, activeEnvId, enableCookies] = await Promise.all([
          coreStore.listRequests(),
          coreStore.listEnvironments(),
          coreStore.getActiveEnvironmentId(),
          coreStore.getMeta<boolean>("enableCookies"),
        ]);
        set({
          requests: reqs,
          environments: envs,
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
