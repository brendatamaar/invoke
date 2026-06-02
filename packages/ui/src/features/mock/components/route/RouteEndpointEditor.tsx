import type { MockRoute } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";
import { HTTP_METHODS } from "../../mockRouteUtils";

export function RouteEndpointEditor({
  method,
  pathPattern,
  onMethodChange,
  onPathPatternChange,
}: {
  method: MockRoute["method"];
  pathPattern: string;
  onMethodChange: (method: MockRoute["method"]) => void;
  onPathPatternChange: (pathPattern: string) => void;
}) {
  return (
    <div className="px-5 pt-4 pb-3 flex flex-col gap-1.5 shrink-0 border-b border-[var(--border)]">
      <label htmlFor="route-path-pattern" className="text-xs font-medium text-[var(--text-2)]">
        Endpoint
      </label>
      <div className="flex gap-2">
        <Select
          value={method}
          onChange={(event) => onMethodChange(event.target.value as MockRoute["method"])}
          size="sm"
        >
          {HTTP_METHODS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <input
          id="route-path-pattern"
          className="input text-xs py-1.5 flex-1"
          placeholder="/api/users"
          value={pathPattern}
          onChange={(event) => onPathPatternChange(event.target.value)}
        />
      </div>
    </div>
  );
}
