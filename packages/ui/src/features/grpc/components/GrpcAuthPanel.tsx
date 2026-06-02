import type { AuthConfig } from "@invoke/core";
import { Select } from "../../../components/shared/Select";
import { useStore } from "../../../store";

export function GrpcAuthPanel() {
  const { grpcRequest, setGrpcRequest } = useStore();
  const auth: AuthConfig = grpcRequest.auth ?? { type: "none" };
  const set = (patch: Partial<AuthConfig>) => setGrpcRequest({ auth: { ...auth, ...patch } });
  const inputCls = "input text-xs py-1 flex-1";

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="grpc-auth-type" className="text-xs text-[var(--text-2)] w-20 shrink-0">
          Type
        </label>
        <Select
          id="grpc-auth-type"
          value={auth.type}
          onChange={(e) =>
            setGrpcRequest({
              auth: { type: e.target.value as AuthConfig["type"] },
            })
          }
        >
          {["none", "bearer", "basic", "api-key", "oauth2"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      {auth.type === "bearer" && (
        <div className="flex items-center gap-2">
          <label htmlFor="grpc-auth-token" className="text-xs text-[var(--text-2)] w-20 shrink-0">
            Token
          </label>
          <input
            id="grpc-auth-token"
            className={inputCls}
            value={auth.token ?? ""}
            onChange={(e) => set({ token: e.target.value })}
            placeholder="{{token}}"
          />
        </div>
      )}
      {auth.type === "basic" && (
        <>
          <div className="flex items-center gap-2">
            <label
              htmlFor="grpc-auth-username"
              className="text-xs text-[var(--text-2)] w-20 shrink-0"
            >
              Username
            </label>
            <input
              id="grpc-auth-username"
              className={inputCls}
              value={auth.username ?? ""}
              onChange={(e) => set({ username: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="grpc-auth-password"
              className="text-xs text-[var(--text-2)] w-20 shrink-0"
            >
              Password
            </label>
            <input
              id="grpc-auth-password"
              className={inputCls}
              type="password"
              value={auth.password ?? ""}
              onChange={(e) => set({ password: e.target.value })}
            />
          </div>
        </>
      )}
      {auth.type === "api-key" && (
        <>
          <div className="flex items-center gap-2">
            <label
              htmlFor="grpc-auth-api-key-name"
              className="text-xs text-[var(--text-2)] w-20 shrink-0"
            >
              Key name
            </label>
            <input
              id="grpc-auth-api-key-name"
              className={inputCls}
              value={auth.apiKeyName ?? ""}
              onChange={(e) => set({ apiKeyName: e.target.value })}
              placeholder="x-api-key"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="grpc-auth-api-key-value"
              className="text-xs text-[var(--text-2)] w-20 shrink-0"
            >
              Key value
            </label>
            <input
              id="grpc-auth-api-key-value"
              className={inputCls}
              value={auth.apiKeyValue ?? ""}
              onChange={(e) => set({ apiKeyValue: e.target.value })}
              placeholder="{{api_key}}"
            />
          </div>
        </>
      )}
      {auth.type === "oauth2" && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="grpc-auth-access-token"
            className="text-xs text-[var(--text-2)] w-20 shrink-0"
          >
            Access token
          </label>
          <input
            id="grpc-auth-access-token"
            className={inputCls}
            value={auth.accessToken ?? auth.token ?? ""}
            onChange={(e) => set({ accessToken: e.target.value, token: e.target.value })}
            placeholder="{{access_token}}"
          />
        </div>
      )}
      {auth.type !== "none" && (
        <p className="text-2xs text-[var(--text-3)]">
          Auth is injected as an <code>authorization</code> metadata header on each call.
        </p>
      )}
    </div>
  );
}
