import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import type { KeyValue } from "@invoke/core";

export type CodeEditorLang = "json" | "javascript" | "xml" | "python" | "text";

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  lang?: CodeEditorLang;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
}

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export interface PromptModalProps {
  open: boolean;
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  multiline?: boolean;
  confirmLabel?: string;
  allowEmpty?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export interface KeyValueEditorProps {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
  variableAutocomplete?: boolean;
}

export interface MethodBadgeProps {
  method: string;
  size?: "sm" | "md";
}

export type SelectSize = "2xs" | "xs" | "sm";

export interface SelectOptionItem {
  value: string;
  label: ReactNode;
}

export interface SelectSizeClasses {
  trigger: string;
  item: string;
  chevron: number;
}

export interface SelectProps {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  size?: SelectSize;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export interface StatusBadgeProps {
  status: number;
}

export interface VariableAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  spellCheck?: boolean;
  disabled?: boolean;
  type?: "text" | "password";
}
