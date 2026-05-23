import { useEffect } from "react";
import { coreStore, useStore } from "../../store";

export function useAppBootstrap() {
  const set = useStore((state) => state.set);
  const addToast = useStore((state) => state.addToast);

  useEffect(() => {
    const load = async () => {
      try {
        const [reqs, envs, activeEnvId] = await Promise.all([
          coreStore.listRequests(),
          coreStore.listEnvironments(),
          coreStore.getActiveEnvironmentId(),
        ]);
        set({ requests: reqs, environments: envs, activeEnvironmentId: activeEnvId });
      } catch (e) {
        addToast("error", `Failed to load data: ${e}`);
      }
    };
    load();
  }, [addToast, set]);
}
