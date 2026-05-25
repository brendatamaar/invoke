import { VariableAutocompleteInput } from "../../../../../components/shared/VariableAutocompleteInput";
import type { AuthTextInputProps } from "../../../../../types";

export function AuthTextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: AuthTextInputProps) {
  return (
    <VariableAutocompleteInput
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="input text-xs py-1 font-mono"
    />
  );
}
