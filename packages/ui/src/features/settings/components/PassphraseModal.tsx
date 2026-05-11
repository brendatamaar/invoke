import { useEffect, useRef, useState } from "react";
import { Lock, Shield } from "lucide-react";
import { Dialog } from "../../../components/shared/Dialog";
import { useStore } from "../../../store";

export function PassphraseModal() {
  const { showPassphraseModal, passphraseMode, passphraseCallback, set } =
    useStore();
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPassphraseModal) {
      setValue("");
      setConfirm("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [showPassphraseModal]);

  const close = (passphrase: string | null) => {
    set({
      showPassphraseModal: false,
      passphraseCallback: null,
    });
    passphraseCallback?.(passphrase);
  };

  const submit = () => {
    if (!value.trim()) {
      setError("Passphrase cannot be empty.");
      return;
    }
    if (passphraseMode === "setup" && value !== confirm) {
      setError("Passphrases do not match.");
      return;
    }
    close(value);
  };

  const isSetup = passphraseMode === "setup";

  return (
    <Dialog
      open={showPassphraseModal}
      onClose={() => close(null)}
      title={isSetup ? "Set Credential Passphrase" : "Unlock Credentials"}
      width="400px"
      footer={
        <>
          <button className="btn text-xs" onClick={() => close(null)}>
            Cancel
          </button>
          <button
            className="btn btn-primary text-xs"
            onClick={submit}
            disabled={!value.trim() || (isSetup && !confirm.trim())}
          >
            <Lock size={12} /> {isSetup ? "Set passphrase" : "Unlock"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-xs text-[var(--text-2)]">
        <div className="flex items-start gap-2 p-2 rounded bg-[var(--surface-2)] border border-[var(--border)]">
          <Shield size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
          <p>
            {isSetup
              ? "This passphrase encrypts saved credentials (tokens, passwords, API keys) at rest using AES-256-GCM. It is never stored — you'll need it each session."
              : "Enter your passphrase to decrypt stored credentials for this session."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--text-2)]">Passphrase</label>
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (!isSetup || confirm)) submit();
            }}
            placeholder="Enter passphrase…"
            className="input text-xs"
          />
        </div>
        {isSetup && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-2)]">
              Confirm passphrase
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && value) submit();
              }}
              placeholder="Confirm passphrase…"
              className="input text-xs"
            />
          </div>
        )}
        {error && <p className="text-2xs text-red-500">{error}</p>}
      </div>
    </Dialog>
  );
}
