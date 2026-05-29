import { Select } from "../../../../components/shared/Select";
import { VariableAutocompleteInput } from "../../../../components/shared/VariableAutocompleteInput";
import { useStore } from "../../../../store";

export function AuthTab() {
  const { websocketRequest, setWebsocketRequest } = useStore();
  const auth = websocketRequest.auth ?? { type: "none" };

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="ws-auth-type" className="text-xs text-[var(--text-2)] w-20 shrink-0">Type</label>
        <Select
          id="ws-auth-type"
          value={auth.type}
          onChange={(e) =>
            setWebsocketRequest({
              auth: { type: e.target.value as typeof auth.type },
            })
          }
        >
          {["none", "bearer", "basic", "api-key"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {auth.type === "bearer" && (
        <div className="flex items-center gap-2">
          <label htmlFor="ws-auth-token" className="text-xs text-[var(--text-2)] w-20 shrink-0">Token</label>
          <VariableAutocompleteInput
            id="ws-auth-token"
            value={auth.token ?? ""}
            onChange={(v) => setWebsocketRequest({ auth: { ...auth, token: v } })}
            placeholder="{{token}}"
            className="input text-xs flex-1"
          />
        </div>
      )}

      {auth.type === "basic" && (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor="ws-auth-username" className="text-xs text-[var(--text-2)] w-20 shrink-0">Username</label>
            <VariableAutocompleteInput
              id="ws-auth-username"
              value={auth.username ?? ""}
              onChange={(v) => setWebsocketRequest({ auth: { ...auth, username: v } })}
              className="input text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ws-auth-password" className="text-xs text-[var(--text-2)] w-20 shrink-0">Password</label>
            <input
              id="ws-auth-password"
              type="password"
              value={auth.password ?? ""}
              onChange={(e) =>
                setWebsocketRequest({
                  auth: { ...auth, password: e.target.value },
                })
              }
              className="input text-xs flex-1"
            />
          </div>
        </>
      )}

      {auth.type === "api-key" && (
        <>
          <div className="flex items-center gap-2">
            <label htmlFor="ws-auth-apikey-name" className="text-xs text-[var(--text-2)] w-20 shrink-0">Key</label>
            <VariableAutocompleteInput
              id="ws-auth-apikey-name"
              value={auth.apiKeyName ?? ""}
              onChange={(v) => setWebsocketRequest({ auth: { ...auth, apiKeyName: v } })}
              className="input text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ws-auth-apikey-value" className="text-xs text-[var(--text-2)] w-20 shrink-0">Value</label>
            <VariableAutocompleteInput
              id="ws-auth-apikey-value"
              value={auth.apiKeyValue ?? ""}
              onChange={(v) => setWebsocketRequest({ auth: { ...auth, apiKeyValue: v } })}
              className="input text-xs flex-1"
            />
          </div>
        </>
      )}

      {auth.type !== "none" && (
        <p className="text-2xs text-[var(--text-3)]">Applied as handshake headers on connect.</p>
      )}
    </div>
  );
}
