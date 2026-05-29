import { Select } from "../../../components/shared/Select";
import { useStore } from "../../../store";

export function ExtractPanel() {
  const { extractRules, set } = useStore();
  const add = () =>
    set((state) => ({
      extractRules: [
        ...state.extractRules,
        { variableName: "", source: "body" as const, expression: "" },
      ],
    }));
  const remove = (index: number) =>
    set((state) => ({
      extractRules: state.extractRules.filter((_, idx) => idx !== index),
    }));
  const update = (index: number, patch: object) =>
    set((state) => ({
      extractRules: state.extractRules.map((rule, idx) =>
        idx === index ? { ...rule, ...patch } : rule,
      ),
    }));

  return (
    <div className="p-3 flex flex-col gap-2">
      {extractRules.length > 0 && <ExtractHeader />}
      {extractRules.map((rule, index) => {
        const source = rule.source ?? "body";
        const exprPlaceholder = source === "header" ? "Header-Name" : "$.path.to.value";
        return (
          <div
            key={`${rule.variableName}-${rule.source}-${index}`}
            className="flex items-center gap-2 border border-[var(--border)] rounded p-2"
          >
            <div className="w-32 shrink-0">
              <input
                value={rule.variableName ?? ""}
                onChange={(e) => update(index, { variableName: e.target.value })}
                placeholder="variableName"
                aria-label="Variable name"
                className="input py-0.5 text-2xs font-mono"
              />
            </div>
            <div className="w-24 shrink-0">
              <Select
                size="2xs"
                value={source}
                onChange={(e) => update(index, { source: e.target.value })}
              >
                {["body", "header", "status"].map((sourceOption) => (
                  <option key={sourceOption} value={sourceOption}>
                    {sourceOption}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              {source !== "status" ? (
                <input
                  value={rule.expression ?? ""}
                  onChange={(e) => update(index, { expression: e.target.value })}
                  placeholder={exprPlaceholder}
                  aria-label="Expression"
                  className="input py-0.5 text-2xs font-mono"
                />
              ) : (
                <span className="text-2xs text-[var(--text-3)] px-2">no expression needed</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="shrink-0 text-[var(--text-3)] hover:text-[var(--danger)]"
            >
              x
            </button>
          </div>
        );
      })}
      <button type="button" onClick={add} className="btn text-xs self-start">
        + Add rule
      </button>
    </div>
  );
}

function ExtractHeader() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="w-32 shrink-0 text-2xs text-[var(--text-3)]">Variable</span>
      <span className="w-24 shrink-0 text-2xs text-[var(--text-3)]">Source</span>
      <span className="flex-1 text-2xs text-[var(--text-3)]">Expression</span>
    </div>
  );
}
