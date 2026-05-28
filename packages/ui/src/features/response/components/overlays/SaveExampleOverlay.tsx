export function SaveExampleOverlay({
  exampleName,
  placeholder,
  onChange,
  onSave,
  onClose,
}: {
  exampleName: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--bg-2)] border border-[var(--line-2)] rounded-md shadow-[var(--shadow-2)] p-3 flex flex-col gap-2 w-60">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">Save as example</span>
      <input
        autoFocus
        value={exampleName}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSave();
          if (event.key === "Escape") onClose();
        }}
        placeholder={placeholder}
        className="input text-xs py-1"
      />
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button onClick={onSave} className="btn btn-primary text-2xs py-0.5 px-2">
          Save
        </button>
      </div>
    </div>
  );
}
