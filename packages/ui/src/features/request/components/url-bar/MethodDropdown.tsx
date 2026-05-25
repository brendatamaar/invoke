import type { HttpMethod } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";
import { METHOD_COLORS, METHODS } from "./constants";

export function MethodDropdown({
  method,
  onChange,
}: {
  method: HttpMethod;
  onChange: (method: HttpMethod) => void;
}) {
  return (
    <Select
      value={method}
      onChange={(event) => onChange(event.target.value as HttpMethod)}
      size="xs"
      wrapperClassName="w-24"
      className={`font-semibold ${METHOD_COLORS[method] ?? "text-[var(--fg-2)]"}`}
    >
      {METHODS.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </Select>
  );
}
