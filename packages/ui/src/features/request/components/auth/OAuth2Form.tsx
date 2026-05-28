import { CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { Select } from "../../../../components/shared/Select";
import { AuthTextInput } from "./shared/AuthTextInput";
import { Field } from "./shared/Field";
import type { AuthFormProps } from "./types";
import { startAuthorization } from "./oauth2Helpers";

export function OAuth2Form({
  auth,
  setAuth,
  authorizing,
  setAuthorizing,
  setOauthState,
  addToast,
}: AuthFormProps & {
  authorizing: boolean;
  setAuthorizing: (value: boolean) => void;
  setOauthState: (state: string) => void;
  addToast: (kind: "success" | "error" | "info" | "warn", message: string) => void;
}) {
  const flow = auth.flow ?? "client_credentials";
  return (
    <>
      <Field label="Flow">
        <Select
          value={flow}
          onChange={(event) =>
            setAuth({
              ...auth,
              flow: event.target.value as "client_credentials" | "authorization_code",
            })
          }
          className="bg-[var(--surface-2)] text-xs"
        >
          <option value="client_credentials">Client Credentials</option>
          <option value="authorization_code">Authorization Code</option>
        </Select>
      </Field>
      {flow === "authorization_code" && (
        <Field label="Authorization URL">
          <AuthTextInput
            value={auth.authUrl ?? ""}
            onChange={(authUrl) => setAuth({ ...auth, authUrl })}
            placeholder="https://provider.com/oauth/authorize"
          />
        </Field>
      )}
      <OAuth2ClientFields auth={auth} setAuth={setAuth} />
      {flow === "authorization_code" && (
        <>
          <label className="flex items-center gap-2 text-xs text-[var(--text-2)]">
            <span className="w-24 shrink-0">Use PKCE</span>
            <input
              type="checkbox"
              checked={auth.pkce ?? false}
              onChange={(event) => setAuth({ ...auth, pkce: event.target.checked })}
            />
          </label>
          <Field label="Redirect URI">
            <AuthTextInput
              value={auth.redirectUri ?? "http://localhost:4000/api/oauth2/callback"}
              onChange={(redirectUri) => setAuth({ ...auth, redirectUri })}
            />
          </Field>
          <OAuth2AuthorizeRow
            auth={auth}
            authorizing={authorizing}
            setAuthorizing={setAuthorizing}
            setOauthState={setOauthState}
            addToast={addToast}
          />
        </>
      )}
    </>
  );
}

function OAuth2ClientFields({ auth, setAuth }: AuthFormProps) {
  return (
    <>
      <Field label="Token URL">
        <AuthTextInput
          value={auth.tokenUrl ?? ""}
          onChange={(tokenUrl) => setAuth({ ...auth, tokenUrl })}
        />
      </Field>
      <Field label="Client ID">
        <AuthTextInput
          value={auth.clientId ?? ""}
          onChange={(clientId) => setAuth({ ...auth, clientId })}
        />
      </Field>
      <Field label="Client Secret">
        <AuthTextInput
          type="password"
          value={auth.clientSecret ?? ""}
          onChange={(clientSecret) => setAuth({ ...auth, clientSecret })}
        />
      </Field>
      <Field label="Scope">
        <AuthTextInput value={auth.scope ?? ""} onChange={(scope) => setAuth({ ...auth, scope })} />
      </Field>
    </>
  );
}

function OAuth2AuthorizeRow({
  auth,
  authorizing,
  setAuthorizing,
  setOauthState,
  addToast,
}: {
  auth: AuthFormProps["auth"];
  authorizing: boolean;
  setAuthorizing: (value: boolean) => void;
  setOauthState: (state: string) => void;
  addToast: (kind: "success" | "error" | "info" | "warn", message: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-1">
      {auth.accessToken && (
        <span className="flex items-center gap-1 text-2xs text-[var(--ok)]">
          <CheckCircle2 size={11} />
          Token stored
          {auth.tokenExpiresAt && (
            <span className="text-[var(--text-3)]">
              - expires {new Date(auth.tokenExpiresAt).toLocaleString()}
            </span>
          )}
        </span>
      )}
      <button
        disabled={authorizing || !auth.authUrl || !auth.tokenUrl || !auth.clientId}
        onClick={() => startAuthorization(auth, setAuthorizing, setOauthState, addToast)}
        className="ml-auto btn btn-primary text-2xs py-0.5 px-2 flex items-center gap-1"
      >
        {authorizing ? (
          <>
            <RefreshCw size={11} className="animate-spin" /> Waiting...
          </>
        ) : (
          <>
            <ExternalLink size={11} /> Authorize
          </>
        )}
      </button>
    </div>
  );
}
