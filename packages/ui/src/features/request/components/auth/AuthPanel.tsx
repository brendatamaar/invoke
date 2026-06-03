import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuthConfig } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";
import { useStore } from "../../../../store";
import { oauth2AuthCodeResult } from "../../../oauth2/api";
import { ApiKeyAuthForm } from "./ApiKeyAuthForm";
import { AwsSigV4Form } from "./AwsSigV4Form";
import { BasicAuthForm } from "./BasicAuthForm";
import { BearerAuthForm } from "./BearerAuthForm";
import { DigestAuthForm } from "./DigestAuthForm";
import { NtlmAuthForm } from "./NtlmAuthForm";
import { OAuth2Form } from "./OAuth2Form";
import { Field } from "./shared/Field";

const AUTH_TYPES = [
  "none",
  "bearer",
  "basic",
  "api-key",
  "oauth2",
  "digest",
  "aws-sigv4",
  "ntlm",
] as const;

export function AuthPanel() {
  const { request, setRequest, setGraphqlRequest, addToast } = useStore();
  const auth = request.auth ?? { type: "none" };
  const isGraphql = request.protocol === "graphql";
  const [authorizing, setAuthorizing] = useState(false);
  const oauthStateRef = useRef<string | null>(null);
  const { data: oauthResult } = useQuery({
    queryKey: ["oauth2Result", oauthStateRef.current],
    queryFn: () => oauth2AuthCodeResult(oauthStateRef.current!),
    enabled: !!oauthStateRef.current,
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status;
      return !status || status === "pending" ? 1500 : false;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!oauthResult || oauthResult.status === "pending") return;
    oauthStateRef.current = null;
    setAuthorizing(false);
    if (oauthResult.status === "done" && oauthResult.accessToken) {
      const currentAuth = useStore.getState().request.auth ?? { type: "oauth2" };
      const nextAuth = {
        ...currentAuth,
        accessToken: oauthResult.accessToken,
        refreshToken: oauthResult.refreshToken,
        tokenExpiresAt: oauthResult.expiresIn
          ? Date.now() + oauthResult.expiresIn * 1000
          : undefined,
      };
      setRequest({ auth: nextAuth });
      if (isGraphql) setGraphqlRequest({ auth: nextAuth });
      addToast("success", "OAuth2 token obtained");
    } else {
      addToast("error", `OAuth2 failed: ${oauthResult.error ?? "unknown"}`);
    }
  }, [addToast, oauthResult, setRequest, setGraphqlRequest, isGraphql]);

  const setOauthState = (state: string) => {
    oauthStateRef.current = state;
    setAuthorizing(true);
  };

  const setAuth = (nextAuth: AuthConfig) => {
    setRequest({ auth: nextAuth });
    if (isGraphql) setGraphqlRequest({ auth: nextAuth });
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <Field label="Type">
        <Select
          value={auth.type}
          onChange={(event) => setAuth({ type: event.target.value as AuthConfig["type"] })}
        >
          {AUTH_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </Field>
      {auth.type === "bearer" && <BearerAuthForm auth={auth} setAuth={setAuth} />}
      {auth.type === "basic" && <BasicAuthForm auth={auth} setAuth={setAuth} />}
      {auth.type === "api-key" && <ApiKeyAuthForm auth={auth} setAuth={setAuth} />}
      {auth.type === "oauth2" && (
        <OAuth2Form
          auth={auth}
          setAuth={setAuth}
          authorizing={authorizing}
          setAuthorizing={setAuthorizing}
          setOauthState={setOauthState}
          addToast={addToast}
        />
      )}
      {auth.type === "digest" && <DigestAuthForm auth={auth} setAuth={setAuth} />}
      {auth.type === "ntlm" && <NtlmAuthForm auth={auth} setAuth={setAuth} />}
      {auth.type === "aws-sigv4" && <AwsSigV4Form auth={auth} setAuth={setAuth} />}
    </div>
  );
}
