import type { Dispatch, SetStateAction } from "react";
import { Minus, Monitor, Moon, Plus, Sun } from "lucide-react";
import type { GeneralDraft, ThemeMode } from "../../../../types";
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "../../constants";
import { clampNumber } from "../../utils/numbers";
import { CheckboxControl } from "../shared/CheckboxControl";
import { FieldRow } from "../shared/FieldRow";
import { SectionTitle } from "../shared/SectionTitle";

export function GeneralTab({
  general,
  setGeneral,
}: {
  general: GeneralDraft;
  setGeneral: Dispatch<SetStateAction<GeneralDraft>>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="Appearance"
        description="Interface preferences for the workspace."
      />

      <FieldRow label="Theme">
        <div className="inline-flex overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-2)] p-0.5">
          {[
            { value: "light" as ThemeMode, label: "Light", Icon: Sun },
            { value: "dark" as ThemeMode, label: "Dark", Icon: Moon },
            { value: "system" as ThemeMode, label: "System", Icon: Monitor },
          ].map(({ value, label, Icon }) => {
            const selected = general.theme === value;
            return (
              <button
                key={value}
                onClick={() =>
                  setGeneral((draft) => ({ ...draft, theme: value }))
                }
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs transition-colors ${
                  selected
                    ? "bg-[var(--accent-faint)] text-[var(--accent)]"
                    : "text-[var(--text-3)] hover:bg-[var(--bg-3)] hover:text-[var(--text-2)]"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </FieldRow>

      <FieldRow label="UI font size" hint="Range: 11 to 16px.">
        <button
          onClick={() =>
            setGeneral((draft) => ({
              ...draft,
              uiFontSize: clampNumber(
                draft.uiFontSize - 1,
                FONT_SIZE_MIN,
                FONT_SIZE_MAX,
              ),
            }))
          }
          disabled={general.uiFontSize <= FONT_SIZE_MIN}
          className="btn p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          title="Decrease font size"
        >
          <Minus size={13} />
        </button>
        <span className="w-10 text-center font-mono text-xs text-[var(--text-1)]">
          {general.uiFontSize}
        </span>
        <button
          onClick={() =>
            setGeneral((draft) => ({
              ...draft,
              uiFontSize: clampNumber(
                draft.uiFontSize + 1,
                FONT_SIZE_MIN,
                FONT_SIZE_MAX,
              ),
            }))
          }
          disabled={general.uiFontSize >= FONT_SIZE_MAX}
          className="btn p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          title="Increase font size"
        >
          <Plus size={13} />
        </button>
      </FieldRow>

      <FieldRow label="Editor word wrap">
        <CheckboxControl
          checked={general.editorWordWrap}
          onChange={(checked) =>
            setGeneral((draft) => ({ ...draft, editorWordWrap: checked }))
          }
          label="Wrap long lines in code editors"
        />
      </FieldRow>
    </div>
  );
}
