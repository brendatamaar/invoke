import type { AssertionMatcher, FlowStatus, FlowStepType } from "./common";
import type { AssertionResult } from "./assertion";
import type { ExecuteResponse } from "./response";
import type { RequestConfig } from "./request";
import type { VariableScope } from "./variables";

export interface Flow {
  id: string;
  name: string;
  steps: FlowStep[];
  createdAt: number;
  updatedAt: number;
}

export type FlowStep = FlowRequestStep | FlowDelayStep | FlowConditionStep | FlowLoopStep;

export interface FlowRequestStep {
  id: string;
  type: "request";
  name: string;
  request: RequestConfig;
  continueOnFailure?: boolean;
  retryCount?: number;
}

export interface FlowDelayStep {
  id: string;
  type: "delay";
  name: string;
  delayMs: number;
}

export interface FlowCondition {
  source: "variable" | "status" | "bodyJsonPath" | "header";
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
}

export interface FlowConditionStep {
  id: string;
  type: "condition";
  name: string;
  condition: FlowCondition;
  thenSteps: FlowStep[];
  elseSteps?: FlowStep[];
}

export interface FlowLoopStep {
  id: string;
  type: "loop";
  name: string;
  count?: number;
  condition?: FlowCondition;
  conditionMode?: "while" | "until";
  steps: FlowStep[];
  maxIterations?: number;
}

export interface FlowStepResult {
  stepId: string;
  name: string;
  type: FlowStepType;
  status: FlowStatus;
  startedAt: number;
  completedAt: number;
  response?: ExecuteResponse;
  assertions?: AssertionResult[];
  error?: string;
}

export interface FlowResult {
  flowId: string;
  status: FlowStatus;
  startedAt: number;
  completedAt: number;
  variables: Record<string, string>;
  steps: FlowStepResult[];
}

export interface FlowRunnerOptions {
  execute: (request: RequestConfig) => Promise<ExecuteResponse>;
  scopes?: VariableScope[];
  hooks?: FlowHooks;
}

export interface FlowHooks {
  onStepStart?: (step: FlowStep) => void | Promise<void>;
  onStepComplete?: (result: FlowStepResult) => void | Promise<void>;
  onVariableExtracted?: (name: string, value: string, step: FlowStep) => void | Promise<void>;
  onError?: (error: Error, step: FlowStep) => void | Promise<void>;
  onFlowComplete?: (result: FlowResult) => void | Promise<void>;
}
