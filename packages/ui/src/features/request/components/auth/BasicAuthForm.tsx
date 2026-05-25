import { AuthTextInput } from "./shared/AuthTextInput";
import { Field } from "./shared/Field";
import type { AuthFormProps } from "./types";

export function BasicAuthForm({ auth, setAuth }: AuthFormProps) {
  return (
    <>
      <Field label="Username">
        <AuthTextInput
          value={auth.username ?? ""}
          onChange={(username) => setAuth({ ...auth, username })}
        />
      </Field>
      <Field label="Password">
        <AuthTextInput
          type="password"
          value={auth.password ?? ""}
          onChange={(password) => setAuth({ ...auth, password })}
        />
      </Field>
    </>
  );
}
