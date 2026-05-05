import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { xml } from "@codemirror/lang-xml";
import { python } from "@codemirror/lang-python";

type Lang = "json" | "javascript" | "xml" | "python" | "text";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  lang?: Lang;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
}

function getLangExtension(lang: Lang) {
  switch (lang) {
    case "json":       return json();
    case "javascript": return javascript();
    case "xml":        return xml();
    case "python":     return python();
    default:           return [];
  }
}

export function CodeEditor({ value, onChange, lang = "text", readOnly = false, minHeight = "120px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      basicSetup,
      getLangExtension(lang),
      EditorView.theme({
        "&": { minHeight },
        ".cm-scroller": { fontFamily: "'JetBrains Mono', monospace" }
      }),
      EditorView.lineWrapping
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    } else {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString());
          }
        })
      );
    }

    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: containerRef.current
    });
    viewRef.current = view;

    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, readOnly, minHeight]);

  // sync external value changes without re-mounting
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value }
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full w-full overflow-auto" />;
}
