import { useEffect, useState } from "react";
import { coreStore } from "../../store";

export function useOnboarding() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    coreStore.getMeta<boolean>("onboardingDone").then((done) => {
      if (!done) setActive(true);
      setReady(true);
    });
  }, []);

  const dismiss = () => {
    setActive(false);
    coreStore.setMeta("onboardingDone", true);
  };

  return { show: ready && active, dismiss };
}
