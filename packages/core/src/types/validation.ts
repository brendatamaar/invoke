export interface FlowValidationIssue {
  level: "error" | "warning";
  message: string;
  stepId?: string;
  path?: string;
}

export interface FlowValidationResult {
  valid: boolean;
  errors: FlowValidationIssue[];
  warnings: FlowValidationIssue[];
}

export interface FlowValidationOptions {
  requireSteps?: boolean;
}

export interface StepValidationContext {
  add: (issue: FlowValidationIssue) => void;
  stepIds: Set<string>;
  stats: { totalSteps: number; maxDepth: number };
  depth: number;
  path: string;
  hasPreviousRequest: boolean;
}

export interface MockValidationIssue {
  level: "error" | "warning";
  message: string;
  routeIndex?: number;
  routeId?: string;
}

export interface MockValidationResult {
  valid: boolean;
  errors: MockValidationIssue[];
  warnings: MockValidationIssue[];
}
