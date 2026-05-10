export interface VariableSuggestion {
  name: string;
  source: "environment" | "session" | "dynamic";
  value?: string;
  sensitive?: boolean;
}
