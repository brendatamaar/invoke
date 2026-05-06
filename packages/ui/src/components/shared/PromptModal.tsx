import { useEffect, useRef, useState } from "react";
import { Dialog } from "./Dialog";

interface Props {
  open: boolean;
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  multiline?: boolean;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export function PromptModal({
  open,
  title,
  label,
  defaultValue = "",
  placeholder,
  multiline,
  confirmLabel = "OK",
  onConfirm,
  onClose,
}: Props) {
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
    if (value.trim()) onConfirm(value.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width="360px"
      footer={
        <>
          <button className="btn text-xs" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary text-xs"
            onClick={submit}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {label && (
        <label className="text-xs text-[var(--text-2)] block mb-1.5">
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
          className="input text-xs font-mono resize-none"
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
          className="input text-xs"
        />
      )}
    </Dialog>
  );
}
