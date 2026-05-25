import type { MutableRefObject } from "react";
import type { FlowResult, FlowStep } from "@invoke/core";
import { FlowCanvas } from "../FlowCanvas";
import { FlowStepList } from "../FlowStepList";
import { StepEditorPanel } from "../StepEditorPanel";

export function FlowModalBody({
  viewMode,
  steps,
  selectedIndex,
  flowResult,
  addingStep,
  dragOver,
  dragIndex,
  onSelect,
  onAddStep,
  onSetAddingStep,
  onSetDragOver,
  onReorderStep,
  onUpdateStep,
  onRemoveStep,
}: {
  viewMode: "list" | "canvas";
  steps: FlowStep[];
  selectedIndex: number | null;
  flowResult: FlowResult | undefined;
  addingStep: boolean;
  dragOver: number | null;
  dragIndex: MutableRefObject<number | null>;
  onSelect: (index: number) => void;
  onAddStep: (type: FlowStep["type"]) => void;
  onSetAddingStep: (adding: boolean) => void;
  onSetDragOver: (index: number | null) => void;
  onReorderStep: (from: number, to: number) => void;
  onUpdateStep: (index: number, step: FlowStep) => void;
  onRemoveStep: (index: number) => void;
}) {
  const selectedStep = selectedIndex !== null ? steps[selectedIndex] : null;

  return (
    <div className="flex flex-1 min-h-0">
      {viewMode === "canvas" && (
        <div className="flex flex-1 min-h-0 min-w-0">
          <div className="flex-1 min-w-0 overflow-hidden">
            <FlowCanvas
              steps={steps}
              selectedIndex={selectedIndex}
              flowResult={flowResult}
              onSelect={onSelect}
              onAddStep={onAddStep}
            />
          </div>
          {selectedIndex !== null && steps[selectedIndex] && (
            <div
              className="border-l border-[var(--border)] overflow-y-auto p-5 shrink-0"
              style={{ width: 280 }}
            >
              <StepEditorPanel
                step={steps[selectedIndex]}
                onChange={(step) => onUpdateStep(selectedIndex, step)}
                onRemove={() => onRemoveStep(selectedIndex)}
              />
            </div>
          )}
        </div>
      )}

      {viewMode === "list" && (
        <>
          <FlowStepList
            steps={steps}
            selectedIndex={selectedIndex}
            flowResult={flowResult}
            addingStep={addingStep}
            dragOver={dragOver}
            dragIndex={dragIndex}
            onSelect={onSelect}
            onAddStep={onAddStep}
            onSetAddingStep={onSetAddingStep}
            onSetDragOver={onSetDragOver}
            onReorderStep={onReorderStep}
            onRemoveStep={onRemoveStep}
          />

          <div className="flex-1 overflow-y-auto p-6">
            {selectedStep && selectedIndex !== null ? (
              <StepEditorPanel
                step={selectedStep}
                onChange={(step) => onUpdateStep(selectedIndex, step)}
                onRemove={() => onRemoveStep(selectedIndex)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1 text-[var(--text-3)]">
                <p className="text-sm">Select a step to edit or add a new step</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
