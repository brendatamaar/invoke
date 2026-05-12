import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { StreamLanguage } from "@codemirror/language";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { xml } from "@codemirror/lang-xml";
import { python } from "@codemirror/lang-python";
import type { CodeEditorLang, CodeEditorProps } from "../../types";

// Minimal GraphQL stream tokenizer for syntax highlighting
const graphqlStreamLanguage = StreamLanguage.define({
  name: "graphql",
  startState: () => ({ blockString: false }),
  token(stream, state: { blockString: boolean }) {
    if (state.blockString) {
      if (stream.match('"""')) {
        state.blockString = false;
        return "string";
      }
      stream.next();
      return "string";
    }
    if (stream.eatSpace()) return null;
    if (stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match('"""')) {
      state.blockString = true;
      return "string";
    }
    if (stream.match('"')) {
      while (!stream.eol()) {
        if (stream.peek() === "\\") {
          stream.next();
          stream.next();
          continue;
        }
        if (stream.next() === '"') break;
      }
      return "string";
    }
    if (stream.match(/^-?\d+(\.\d+)?(e[+-]?\d+)?/i)) return "number";
    if (stream.match(/^\$[A-Za-z_]\w*/)) return "variable-2";
    if (stream.match(/^@[A-Za-z_]\w*/)) return "meta";
    if (stream.match("...")) return "punctuation";
    if (stream.match(/^[A-Za-z_]\w*/)) {
      const w = stream.current();
      if (["query", "mutation", "subscription", "fragment", "on"].includes(w))
        return "keyword";
      if (
        [
          "type",
          "interface",
          "union",
          "enum",
          "input",
          "scalar",
          "schema",
          "directive",
          "extend",
          "implements",
        ].includes(w)
      )
        return "keyword";
      if (["true", "false", "null"].includes(w)) return "atom";
      if (/^[A-Z]/.test(w)) return "type";
      return "def";
    }
    if (stream.match(/^[{}\[\]()!:=|&,]/)) return "punctuation";
    stream.next();
    return null;
  },
  copyState: (s) => ({ ...s }),
});

function getLangExtension(lang: CodeEditorLang) {
  switch (lang) {
    case "json":
      return json();
    case "javascript":
      return javascript();
    case "xml":
      return xml();
    case "python":
      return python();
    case "graphql":
      return graphqlStreamLanguage;
    default:
      return [];
  }
}

export function CodeEditor({
  value,
  onChange,
  lang = "text",
  readOnly = false,
  minHeight = "120px",
  extensions: extraExtensions = [],
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      basicSetup,
      getLangExtension(lang),
      ...extraExtensions,
      EditorView.theme({
        "&": { minHeight },
        ".cm-scroller": { fontFamily: "'JetBrains Mono', monospace" },
      }),
      EditorView.lineWrapping,
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    } else {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString());
          }
        }),
      );
    }

    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, readOnly, minHeight]);

  // sync external value changes without re-mounting
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full w-full overflow-auto" />;
}
