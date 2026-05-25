import { AuthTextInput } from "./shared/AuthTextInput";
import { Field } from "./shared/Field";
import type { AuthFormProps } from "./types";

export function NtlmAuthForm({ auth, setAuth }: AuthFormProps) {
  return (
    <>
      <Field label="Username">
        <AuthTextInput
          value={auth.ntlmUsername ?? ""}
          onChange={(ntlmUsername) => setAuth({ ...auth, ntlmUsername })}
        />
      </Field>
      <Field label="Password">
        <AuthTextInput
          type="password"
          value={auth.ntlmPassword ?? ""}
          onChange={(ntlmPassword) => setAuth({ ...auth, ntlmPassword })}
        />
      </Field>
      <Field label="Domain">
        <AuthTextInput
          value={auth.ntlmDomain ?? ""}
          onChange={(ntlmDomain) => setAuth({ ...auth, ntlmDomain })}
          placeholder="optional"
        />
      </Field>
    </>
  );
}
