import { BasicAuthForm } from "./BasicAuthForm";
import type { AuthFormProps } from "./types";

export function DigestAuthForm(props: AuthFormProps) {
  return <BasicAuthForm {...props} />;
}
