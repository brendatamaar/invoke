import { KeyValueEditor } from "../../../../components/shared/KeyValueEditor";
import { parseKeyValueBody } from "./bodyMode";

export function UrlEncodedBodyEditor({
  body,
  onChange,
}: {
  body: string;
  onChange: (body: string) => void;
}) {
  return (
    <KeyValueEditor
      rows={parseKeyValueBody(body)}
      onChange={(rows) => onChange(JSON.stringify(rows))}
      keyPlaceholder="key"
      valuePlaceholder="value"
    />
  );
}
