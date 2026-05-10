import { useEffect } from "react";
import { coreStore, useStore } from "../../store";

export function useActiveEnvironmentPersistence() {
  const activeEnvironmentId = useStore((state) => state.activeEnvironmentId);

  useEffect(() => {
    coreStore.setActiveEnvironmentId(activeEnvironmentId).catch(() => {});
  }, [activeEnvironmentId]);
}
