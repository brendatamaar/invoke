import { Data } from "effect"

export class StorageError extends Data.TaggedError("StorageError")<{
  cause: unknown
  operation: string
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  entity: string
  id: string
}> {}

export class UndefinedVariableError extends Data.TaggedError("UndefinedVariableError")<{
  name: string
  template: string
}> {}

export class AssertionFailedError extends Data.TaggedError("AssertionFailedError")<{
  assertion: string
  expected: unknown
  actual: unknown
  path?: string
}> {}

export class StepTimeoutError extends Data.TaggedError("StepTimeoutError")<{
  stepId: string
  timeoutMs: number
}> {}

export class StepExecutionError extends Data.TaggedError("StepExecutionError")<{
  stepId: string
  cause: unknown
}> {}

export class FlowCancelledError extends Data.TaggedError("FlowCancelledError")<{
  flowId: string
  completedSteps: number
}> {}

export class ParseError extends Data.TaggedError("ParseError")<{
  format: string
  message: string
  line?: number
}> {}
