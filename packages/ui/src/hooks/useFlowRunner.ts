import { useCallback, useRef } from "react";
import { FlowRunner, type Flow, type FlowRunnerOptions } from "@invoke/core";

export function useFlowRunner() {
  const runnerRef = useRef<FlowRunner | null>(null);

  if (!runnerRef.current) {
    runnerRef.current = new FlowRunner();
  }

  const run = useCallback((flow: Flow, options: FlowRunnerOptions) => {
    return runnerRef.current!.run(flow, options);
  }, []);

  const stop = useCallback(() => {
    runnerRef.current?.cancel();
  }, []);

  return { run, stop };
}
