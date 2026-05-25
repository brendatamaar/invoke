import { useState } from "react";
import { compareResponses } from "@invoke/core";
import { useDiffIgnoreRules, useHistory } from "../../../hooks/useDb";
import { coreStore, useStore } from "../../../store";
import { DiffBody } from "./diff-modal/DiffBody";
import { DiffHeader } from "./diff-modal/DiffHeader";
import { DiffSelectors } from "./diff-modal/DiffSelectors";

export function DiffModal() {
  const { showDiffModal, diffLeftId, diffRightId, set, addToast } = useStore();
  const history = useHistory();
  const diffIgnoreRules = useDiffIgnoreRules();
  const [leftId, setLeftId] = useState(diffLeftId ?? "");
  const [rightId, setRightId] = useState(diffRightId ?? "");
  const [newPath, setNewPath] = useState("");

  if (!showDiffModal) return null;

  const close = () => set({ showDiffModal: false });
  const leftEntry = history.find((entry) => entry.id === leftId);
  const rightEntry = history.find((entry) => entry.id === rightId);
  const diff =
    leftEntry?.response && rightEntry?.response
      ? compareResponses(leftEntry.response, rightEntry.response, {
          ignorePaths: diffIgnoreRules.map((rule) => rule.path),
        })
      : null;

  const addIgnorePath = async (path: string) => {
    const trimmed = path.trim();
    if (!trimmed || diffIgnoreRules.some((rule) => rule.path === trimmed)) return;
    const updated = [
      ...diffIgnoreRules,
      { id: Math.random().toString(36).slice(2), path: trimmed },
    ];
    try {
      await coreStore.saveDiffIgnoreRules(updated);
    } catch (error) {
      addToast("error", String(error));
    }
    setNewPath("");
  };

  const removeIgnorePath = async (id: string) => {
    const updated = diffIgnoreRules.filter((rule) => rule.id !== id);
    try {
      await coreStore.saveDiffIgnoreRules(updated);
    } catch (error) {
      addToast("error", String(error));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: "90vw", maxHeight: "100vh", minHeight: "50vh" }}
        onClick={(event) => event.stopPropagation()}
      >
        <DiffHeader onClose={close} />
        <DiffSelectors
          history={history}
          leftId={leftId}
          rightId={rightId}
          ignoreRules={diffIgnoreRules}
          newPath={newPath}
          onLeftChange={setLeftId}
          onRightChange={setRightId}
          onNewPathChange={setNewPath}
          onAddIgnorePath={addIgnorePath}
          onRemoveIgnorePath={removeIgnorePath}
        />
        <DiffBody
          diff={diff}
          leftEntry={leftEntry}
          rightEntry={rightEntry}
          onAddIgnorePath={addIgnorePath}
        />
      </div>
    </div>
  );
}
