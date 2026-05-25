import { Select } from "../../../../components/shared/Select";
import { AuthTextInput } from "./shared/AuthTextInput";
import { Field } from "./shared/Field";
import type { AuthFormProps } from "./types";

export function ApiKeyAuthForm({ auth, setAuth }: AuthFormProps) {
  return (
    <>
      <Field label="Key">
        <AuthTextInput
          value={auth.apiKeyName ?? ""}
          onChange={(apiKeyName) => setAuth({ ...auth, apiKeyName })}
        />
      </Field>
      <Field label="Value">
        <AuthTextInput
          value={auth.apiKeyValue ?? ""}
          onChange={(apiKeyValue) => setAuth({ ...auth, apiKeyValue })}
        />
      </Field>
      <Field label="Add to">
        <Select
          value={auth.apiKeyIn ?? "header"}
          onChange={(event) =>
            setAuth({
              ...auth,
              apiKeyIn: event.target.value as "header" | "query",
            })
          }
        >
          <option value="header">Header</option>
          <option value="query">Query param</option>
        </Select>
      </Field>
    </>
  );
}
