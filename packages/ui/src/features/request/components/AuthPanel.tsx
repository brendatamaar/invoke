import { useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { Select } from "../../../components/shared/Select";
import { VariableAutocompleteInput } from "../../../components/shared/VariableAutocompleteInput";
import { useStore } from "../../../store";
import { oauth2AuthCodeResult, oauth2AuthCodeStart } from "../../oauth2/api";
import type { AuthTextInputProps, FieldProps } from "../../../types";

export function AuthPanel() {
  const { request, setRequest, addToast } = useStore();
  const auth = request.auth ?? { type: "none" };
  const [authorizing, setAuthorizing] = useState(false);

  return (
    <div className="p-3 flex flex-col gap-3">
      <Field label="Type">
        <Select
          value={auth.type}
          onChange={(e) =>
            setRequest({ auth: { type: e.target.value as typeof auth.type } })
          }
        >
          {[
            "none",
            "bearer",
            "basic",
            "api-key",
            "oauth2",
            "digest",
            "aws-sigv4",
          ].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </Field>

      {auth.type === "bearer" && (
        <Field label="Token">
          <AuthTextInput
            value={auth.token ?? ""}
            onChange={(value) =>
              setRequest({ auth: { ...auth, token: value } })
            }
            placeholder="{{token}}"
          />
        </Field>
      )}

      {auth.type === "basic" && (
        <>
          <Field label="Username">
            <AuthTextInput
              value={auth.username ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, username: value } })
              }
            />
          </Field>
          <Field label="Password">
            <AuthTextInput
              type="password"
              value={auth.password ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, password: value } })
              }
            />
          </Field>
        </>
      )}

      {auth.type === "api-key" && (
        <>
          <Field label="Key">
            <AuthTextInput
              value={auth.apiKeyName ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, apiKeyName: value } })
              }
            />
          </Field>
          <Field label="Value">
            <AuthTextInput
              value={auth.apiKeyValue ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, apiKeyValue: value } })
              }
            />
          </Field>
          <Field label="Add to">
            <Select
              value={auth.apiKeyIn ?? "header"}
              onChange={(e) =>
                setRequest({
                  auth: {
                    ...auth,
                    apiKeyIn: e.target.value as "header" | "query",
                  },
                })
              }
            >
              <option value="header">Header</option>
              <option value="query">Query param</option>
            </Select>
          </Field>
        </>
      )}

      {auth.type === "oauth2" && (
        <>
          <Field label="Flow">
            <Select
              value={auth.flow ?? "client_credentials"}
              onChange={(e) =>
                setRequest({
                  auth: {
                    ...auth,
                    flow: e.target.value as
                      | "client_credentials"
                      | "authorization_code",
                  },
                })
              }
              className="bg-[var(--surface-2)] text-xs"
            >
              <option value="client_credentials">Client Credentials</option>
              <option value="authorization_code">Authorization Code</option>
            </Select>
          </Field>
          {(auth.flow ?? "client_credentials") === "authorization_code" && (
            <Field label="Authorization URL">
              <AuthTextInput
                value={auth.authUrl ?? ""}
                onChange={(value) =>
                  setRequest({ auth: { ...auth, authUrl: value } })
                }
                placeholder="https://provider.com/oauth/authorize"
              />
            </Field>
          )}
          <Field label="Token URL">
            <AuthTextInput
              value={auth.tokenUrl ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, tokenUrl: value } })
              }
            />
          </Field>
          <Field label="Client ID">
            <AuthTextInput
              value={auth.clientId ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, clientId: value } })
              }
            />
          </Field>
          <Field label="Client Secret">
            <AuthTextInput
              type="password"
              value={auth.clientSecret ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, clientSecret: value } })
              }
            />
          </Field>
          <Field label="Scope">
            <AuthTextInput
              value={auth.scope ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, scope: value } })
              }
            />
          </Field>
          {(auth.flow ?? "client_credentials") === "authorization_code" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-24 shrink-0">
                  Use PKCE
                </label>
                <input
                  type="checkbox"
                  checked={auth.pkce ?? false}
                  onChange={(e) =>
                    setRequest({ auth: { ...auth, pkce: e.target.checked } })
                  }
                />
              </div>
              <Field label="Redirect URI">
                <AuthTextInput
                  value={
                    auth.redirectUri ??
                    "http://localhost:4000/api/oauth2/callback"
                  }
                  onChange={(value) =>
                    setRequest({ auth: { ...auth, redirectUri: value } })
                  }
                />
              </Field>
              <div className="flex items-center gap-2 mt-1">
                {auth.accessToken && (
                  <span className="flex items-center gap-1 text-2xs text-[var(--ok)]">
                    <CheckCircle2 size={11} />
                    Token stored
                    {auth.tokenExpiresAt && (
                      <span className="text-[var(--text-3)]">
                        - expires{" "}
                        {new Date(auth.tokenExpiresAt).toLocaleString()}
                      </span>
                    )}
                  </span>
                )}
                <button
                  disabled={
                    authorizing ||
                    !auth.authUrl ||
                    !auth.tokenUrl ||
                    !auth.clientId
                  }
                  onClick={async () => {
                    if (!auth.authUrl || !auth.tokenUrl || !auth.clientId)
                      return;
                    setAuthorizing(true);
                    try {
                      const redirectUri =
                        auth.redirectUri ??
                        "http://localhost:4000/api/oauth2/callback";
                      const usePkce = auth.pkce ?? false;
                      let codeVerifier = "";
                      let codeChallenge = "";
                      if (usePkce) {
                        const raw = new Uint8Array(43);
                        crypto.getRandomValues(raw);
                        codeVerifier = btoa(String.fromCharCode(...raw))
                          .replace(/\+/g, "-")
                          .replace(/\//g, "_")
                          .replace(/=/g, "");
                        const digest = await crypto.subtle.digest(
                          "SHA-256",
                          new TextEncoder().encode(codeVerifier),
                        );
                        codeChallenge = btoa(
                          String.fromCharCode(...new Uint8Array(digest)),
                        )
                          .replace(/\+/g, "-")
                          .replace(/\//g, "_")
                          .replace(/=/g, "");
                      }
                      const { authUrl: url, state } = await oauth2AuthCodeStart(
                        {
                          authUrl: auth.authUrl,
                          tokenUrl: auth.tokenUrl,
                          clientId: auth.clientId,
                          clientSecret: auth.clientSecret ?? "",
                          scope: auth.scope ?? "",
                          redirectUri,
                          pkce: usePkce,
                          codeChallenge,
                          codeChallengeMethod: usePkce ? "S256" : "",
                          codeVerifier,
                        },
                      );
                      window.open(url, "_blank");
                      const poll = async () => {
                        const result = await oauth2AuthCodeResult(state);
                        if (result.status === "pending") {
                          setTimeout(poll, 1500);
                          return;
                        }
                        setAuthorizing(false);
                        if (result.status === "done" && result.accessToken) {
                          const expiresAt = result.expiresIn
                            ? Date.now() + result.expiresIn * 1000
                            : undefined;
                          setRequest({
                            auth: {
                              ...auth,
                              accessToken: result.accessToken,
                              refreshToken: result.refreshToken,
                              tokenExpiresAt: expiresAt,
                            },
                          });
                          addToast("success", "OAuth2 token obtained");
                        } else {
                          addToast(
                            "error",
                            `OAuth2 failed: ${result.error ?? "unknown"}`,
                          );
                        }
                      };
                      setTimeout(poll, 1500);
                    } catch (e) {
                      setAuthorizing(false);
                      addToast("error", String(e));
                    }
                  }}
                  className="ml-auto btn btn-primary text-2xs py-0.5 px-2 flex items-center gap-1"
                >
                  {authorizing ? (
                    <>
                      <RefreshCw size={11} className="animate-spin" />{" "}
                      Waiting...
                    </>
                  ) : (
                    <>
                      <ExternalLink size={11} /> Authorize
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {auth.type === "digest" && (
        <>
          <Field label="Username">
            <AuthTextInput
              value={auth.username ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, username: value } })
              }
            />
          </Field>
          <Field label="Password">
            <AuthTextInput
              type="password"
              value={auth.password ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, password: value } })
              }
            />
          </Field>
        </>
      )}

      {auth.type === "aws-sigv4" && (
        <>
          <Field label="Access Key">
            <AuthTextInput
              value={auth.awsAccessKeyId ?? ""}
              onChange={(value) =>
                setRequest({
                  auth: { ...auth, awsAccessKeyId: value },
                })
              }
            />
          </Field>
          <Field label="Secret Key">
            <AuthTextInput
              type="password"
              value={auth.awsSecretAccessKey ?? ""}
              onChange={(value) =>
                setRequest({
                  auth: { ...auth, awsSecretAccessKey: value },
                })
              }
            />
          </Field>
          <Field label="Region">
            <AuthTextInput
              value={auth.awsRegion ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, awsRegion: value } })
              }
            />
          </Field>
          <Field label="Service">
            <AuthTextInput
              value={auth.awsService ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, awsService: value } })
              }
            />
          </Field>
          <Field label="Session Token">
            <AuthTextInput
              type="password"
              value={auth.awsSessionToken ?? ""}
              onChange={(value) =>
                setRequest({ auth: { ...auth, awsSessionToken: value } })
              }
              placeholder="optional"
            />
          </Field>
        </>
      )}
    </div>
  );
}

function AuthTextInput({
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

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--text-2)] w-24 shrink-0">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
