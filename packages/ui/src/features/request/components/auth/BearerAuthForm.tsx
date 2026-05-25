import { AuthTextInput } from "./shared/AuthTextInput";
import { Field } from "./shared/Field";
import type { AuthFormProps } from "./types";

export function BearerAuthForm({ auth, setAuth }: AuthFormProps) {
  return (
    <Field label="Token">
      <AuthTextInput
        value={auth.token ?? ""}
        onChange={(token) => setAuth({ ...auth, token })}
        placeholder="{{token}}"
      />
    </Field>
  );
}
