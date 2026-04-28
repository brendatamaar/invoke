<script setup lang="ts">
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { defaultHighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  code: string;
  language: "shell" | "javascript" | "python";
}>();

const host = ref<HTMLDivElement>();
let view: EditorView | undefined;

const shellLanguage = StreamLanguage.define({
  name: "shell",
  token(stream) {
    if (stream.match(/\s*#.*/)) return "comment";
    if (stream.match(/"(?:[^"\\]|\\.)*"?/)) return "string";
    if (stream.match(/'(?:[^'\\]|\\.)*'?/)) return "string";
    if (stream.match(/\$[{(]?[A-Za-z_][\w]*[})]?/)) return "variableName";
    if (stream.match(/--?[A-Za-z][\w-]*/)) return "keyword";
    if (stream.match(/\b(curl|wget|http|export|cd|echo|cat|grep|sed|awk|jq)\b/)) return "keyword";
    if (stream.match(/[|&;<>()]/)) return "operator";
    stream.next();
    return null;
  }
});

onMounted(() => {
  view = new EditorView({
    parent: host.value,
    state: createState(props.code, props.language)
  });
});

onBeforeUnmount(() => {
  view?.destroy();
});

watch(
  () => [props.code, props.language] as const,
  ([code, language]) => {
    view?.setState(createState(code, language));
  }
);

function createState(code: string, language: "shell" | "javascript" | "python") {
  return EditorState.create({
    doc: code,
    extensions: [
      lineNumbers(),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      syntaxHighlighting(defaultHighlightStyle),
      languageExtension(language),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          minHeight: "320px",
          backgroundColor: "var(--panel-2)",
          color: "var(--text)"
        },
        ".cm-content": {
          fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
          fontSize: "13px",
          padding: "12px"
        },
        ".cm-gutters": {
          backgroundColor: "var(--panel-2)",
          color: "var(--muted)",
          borderRight: "1px solid var(--line)"
        },
        ".cm-line": {
          paddingLeft: "4px"
        }
      })
    ]
  });
}

function languageExtension(language: "shell" | "javascript" | "python") {
  if (language === "javascript") return javascript();
  if (language === "python") return python();
  return shellLanguage;
}
</script>

<template>
  <div ref="host" class="code-view" data-testid="code-snippet"></div>
</template>
