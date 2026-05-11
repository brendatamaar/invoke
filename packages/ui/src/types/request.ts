import type { ReactNode } from "react";

export type RequestTab =
  | "params"
  | "headers"
  | "auth"
  | "body"
  | "graphql"
  | "graphqlVariables"
  | "websocket"
  | "grpc"
  | "assertions"
  | "extract"
  | "scripts"
  | "options";

export interface URLBarProps {
  onSend: () => void;
  loading: boolean;
}

export interface RequestBuilderProps {
  onSend: () => void;
}

export interface AuthTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
}

export interface FieldProps {
  label: string;
  children: ReactNode;
}

export type GraphQLSchemaImportSource = "url" | "file";
