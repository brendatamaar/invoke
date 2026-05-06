import { useEffect } from "react";
import { Dialog } from "./Dialog";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onConfirm]);

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
            className={`btn text-xs ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-[var(--text-2)]">{message}</p>
    </Dialog>
  );
}
