import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";
import type { PromptModalProps } from "../../types";

export function PromptModal({
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
      setValue(defaultValue);
      setTimeout(() => {
        inputRef.current?.focus();
        (inputRef.current as HTMLInputElement)?.select?.();
      }, 30);
    }
  }, [open, defaultValue]);

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
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
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
