import { AuthTextInput } from "./shared/AuthTextInput";
import { Field } from "./shared/Field";
import type { AuthFormProps } from "./types";

export function AwsSigV4Form({ auth, setAuth }: AuthFormProps) {
  return (
    <>
      <Field label="Access Key">
        <AuthTextInput
          value={auth.awsAccessKeyId ?? ""}
          onChange={(awsAccessKeyId) => setAuth({ ...auth, awsAccessKeyId })}
        />
      </Field>
      <Field label="Secret Key">
        <AuthTextInput
          type="password"
          value={auth.awsSecretAccessKey ?? ""}
          onChange={(awsSecretAccessKey) =>
            setAuth({ ...auth, awsSecretAccessKey })
          }
        />
      </Field>
      <Field label="Region">
        <AuthTextInput
          value={auth.awsRegion ?? ""}
          onChange={(awsRegion) => setAuth({ ...auth, awsRegion })}
        />
      </Field>
      <Field label="Service">
        <AuthTextInput
          value={auth.awsService ?? ""}
          onChange={(awsService) => setAuth({ ...auth, awsService })}
        />
      </Field>
      <Field label="Session Token">
        <AuthTextInput
          type="password"
          value={auth.awsSessionToken ?? ""}
          onChange={(awsSessionToken) => setAuth({ ...auth, awsSessionToken })}
          placeholder="optional"
        />
      </Field>
    </>
  );
}
