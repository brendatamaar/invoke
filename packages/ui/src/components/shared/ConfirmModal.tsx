import { useEffect, useRef } from "react";
import { Dialog } from "./Dialog";
import type { ConfirmModalProps } from "../../types";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onConfirmRef.current();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

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
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p
        style={{
          fontSize: "var(--t-base)",
          color: "var(--fg-1)",
          margin: 0,
          overflowWrap: "break-word",
        }}
      >
        {message}
      </p>
    </Dialog>
  );
}
