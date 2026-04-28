<script setup lang="ts">
import { autocompletion, type Completion, type CompletionContext } from "@codemirror/autocomplete";
import { defaultHighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import {
  formatGraphQLTypeRef,
  graphQLFieldSnippet,
  publicGraphQLTypes,
  rootGraphQLTypes,
  type GraphQLIntrospectionSchema
} from "@invoke/core";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  modelValue: string;
  schema?: GraphQLIntrospectionSchema;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const host = ref<HTMLDivElement>();
let view: EditorView | undefined;

const graphQLLanguage = StreamLanguage.define({
  name: "graphql",
  token(stream) {
    if (stream.match(/\s*#.*/)) return "comment";
    if (stream.match(/"(?:[^"\\]|\\.)*"?/)) return "string";
    if (stream.match(/\$[_A-Za-z][_0-9A-Za-z]*/)) return "variableName";
    if (stream.match(/\b(query|mutation|subscription|fragment|on|true|false|null)\b/)) return "keyword";
    if (stream.match(/[!():=@\[\]{}|]/)) return "operator";
    if (stream.match(/[_A-Za-z][_0-9A-Za-z]*/)) return "propertyName";
    stream.next();
    return null;
  }
});

onMounted(() => {
  view = new EditorView({
    parent: host.value,
    state: createState(props.modelValue)
  });
});

onBeforeUnmount(() => {
  view?.destroy();
});

watch(
  () => props.modelValue,
  (value) => {
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value }
    });
  }
);

function insertText(value: string) {
  if (!view) return;
  const selection = view.state.selection.main;
  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: value },
    selection: { anchor: selection.from + value.length },
    scrollIntoView: true
  });
  view.focus();
}

defineExpose({ insertText });

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      graphQLLanguage,
      syntaxHighlighting(defaultHighlightStyle),
      autocompletion({ override: [schemaCompletionSource] }),
      keymap.of([]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) emit("update:modelValue", update.state.doc.toString());
      }),
      EditorView.theme({
        "&": {
          minHeight: "360px",
          border: "1px solid var(--line)",
          borderRadius: "6px",
          backgroundColor: "var(--panel-2)",
          color: "var(--text)"
        },
        ".cm-content": {
          minHeight: "360px",
          fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
          fontSize: "13px",
          padding: "12px"
        },
        ".cm-gutters": {
          backgroundColor: "var(--panel-2)",
          color: "var(--muted)",
          borderRight: "1px solid var(--line)"
        },
        ".cm-tooltip": {
          border: "1px solid var(--line)",
          borderRadius: "6px",
          backgroundColor: "var(--panel)",
          color: "var(--text)"
        },
        ".cm-completionIcon": {
          color: "var(--accent)"
        }
      })
    ]
  });
}

function schemaCompletionSource(context: CompletionContext) {
  if (!props.schema) return null;
  const word = context.matchBefore(/[_A-Za-z][_0-9A-Za-z]*/);
  if (!word && !context.explicit) return null;
  return {
    from: word?.from ?? context.pos,
    options: completionOptions(props.schema),
    validFor: /^[_A-Za-z][_0-9A-Za-z]*$/
  };
}

function completionOptions(schema: GraphQLIntrospectionSchema): Completion[] {
  const options = new Map<string, Completion>();
  for (const root of rootGraphQLTypes(schema)) {
    for (const field of root.type.fields ?? []) {
      options.set(`${root.label}.${field.name}`, {
        label: field.name,
        type: "property",
        detail: formatGraphQLTypeRef(field.type),
        info: root.label,
        apply: graphQLFieldSnippet(field)
      });
    }
  }
  for (const type of publicGraphQLTypes(schema)) {
    for (const field of type.fields ?? []) {
      options.set(`${type.name}.${field.name}`, {
        label: field.name,
        type: "property",
        detail: formatGraphQLTypeRef(field.type),
        info: type.name,
        apply: graphQLFieldSnippet(field)
      });
    }
  }
  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
}
</script>

<template>
  <div ref="host" class="graphql-codemirror" data-testid="graphql-query-input"></div>
</template>
