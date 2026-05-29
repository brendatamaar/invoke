import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import type { PromptModalProps } from "../../types";

export function PromptModal(props: PromptModalProps) {
  return <PromptModalInner key={`${props.open}-${props.defaultValue ?? ""}`} {...props} />;
}

function PromptModalInner({
  open,
  title,
  label,
  defaultValue = "",
  placeholder,
  multiline,
  confirmLabel = "OK",
  allowEmpty,
  onConfirm,
  onClose,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => {
        inputRef.current?.focus();
        (inputRef.current as HTMLInputElement)?.select?.();
      }, 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  const submit = () => {
    if (allowEmpty) onConfirm(value);
    else if (value.trim()) onConfirm(value.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width="360px"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={!allowEmpty && !value.trim()}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {label && (
        <label
          htmlFor="prompt-input"
          style={{
            display: "block",
            marginBottom: 6,
            fontSize: "var(--t-sm)",
            color: "var(--fg-2)",
          }}
        >
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          id="prompt-input"
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="input"
          style={{ fontFamily: "var(--font-mono)", resize: "none" }}
        />
      ) : (
        <input
          id="prompt-input"
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="input"
        />
      )}
    </Dialog>
  );
}
