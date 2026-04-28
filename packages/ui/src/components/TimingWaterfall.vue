<script setup lang="ts">
import { computed } from "vue";
import type { ExecuteResponse, Timing, TimingAttempt, TimingPhaseName } from "@invoke/core";

const phaseDefinitions = [
  { name: "dns", label: "DNS" },
  { name: "tcp", label: "TCP" },
  { name: "tls", label: "TLS" },
  { name: "ttfb", label: "TTFB" },
  { name: "transfer", label: "Transfer" }
] as const;

type PhaseDefinition = (typeof phaseDefinitions)[number];

type PhaseView = PhaseDefinition & {
  startMs: number;
  durationMs: number;
  leftPct: number;
  widthPct: number;
};

interface AttemptView {
  key: string;
  label: string;
  url: string;
  status?: number;
  totalMs: number;
  phases: PhaseView[];
}

const props = defineProps<{ response?: ExecuteResponse }>();

const attempts = computed(() => {
  if (!props.response) return [];
  const source = props.response.attempts?.length ? props.response.attempts : [fallbackAttempt(props.response)];

  return source.map((attempt, index) => {
    const phases = phasesForAttempt(attempt);
    const totalMs = Math.max(
      attempt.timing?.totalMs ?? 0,
      ...phases.map((phase) => phase.startMs + phase.durationMs),
      1
    );

    return {
      key: `${attempt.url || "attempt"}-${index}`,
      label: attempt.redirect ? `Redirect ${index + 1}` : source.length > 1 ? "Final" : "Request",
      url: attempt.url || props.response?.statusText || "Request",
      status: attempt.status,
      totalMs,
      phases: phases.map((phase) => ({
        ...phase,
        leftPct: clampPercent((phase.startMs / totalMs) * 100),
        widthPct: clampPercent((phase.durationMs / totalMs) * 100)
      }))
    } satisfies AttemptView;
  });
});

const timingRows = computed(() => {
  const timing = props.response?.timing;
  if (!timing) return [];
  return [
    { key: "dnsMs", label: "DNS", value: timing.dnsMs },
    { key: "tcpMs", label: "TCP", value: timing.tcpMs },
    { key: "tlsMs", label: "TLS", value: timing.tlsMs },
    { key: "ttfbMs", label: "TTFB", value: timing.ttfbMs },
    { key: "transferMs", label: "Transfer", value: timing.transferMs },
    { key: "totalMs", label: "Total", value: timing.totalMs }
  ];
});

function fallbackAttempt(response: ExecuteResponse): TimingAttempt {
  return {
    url: response.statusText || "Request",
    status: response.status,
    headers: response.headers,
    timing: response.timing,
    phases: [],
    redirect: false
  };
}

function phasesForAttempt(attempt: TimingAttempt): PhaseView[] {
  const byName = new Map(attempt.phases?.map((phase) => [phase.name, phase]) ?? []);
  const synthetic = syntheticPhases(attempt.timing);

  return phaseDefinitions.map((definition) => {
    const phase = byName.get(definition.name) ?? synthetic.get(definition.name);
    return {
      ...definition,
      startMs: phase?.startMs ?? 0,
      durationMs: Math.max(0, phase?.durationMs ?? 0),
      leftPct: 0,
      widthPct: 0
    };
  });
}

function syntheticPhases(timing?: Timing) {
  const phases = new Map<TimingPhaseName, { startMs: number; durationMs: number }>();
  if (!timing) return phases;

  let cursor = 0;
  for (const definition of phaseDefinitions) {
    const durationMs = Math.max(0, timing[`${definition.name}Ms` as keyof Timing] ?? 0);
    phases.set(definition.name, { startMs: cursor, durationMs });
    cursor += durationMs;
  }
  return phases;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatMs(value?: number) {
  const safe = Math.max(0, Number(value ?? 0));
  if (safe < 1 && safe > 0) return `${safe.toFixed(2)} ms`;
  if (safe < 100) return `${safe.toFixed(1)} ms`;
  return `${Math.round(safe)} ms`;
}

function tooltip(phase: PhaseView) {
  return `${phase.label}: ${formatMs(phase.durationMs)} (starts at ${formatMs(phase.startMs)})`;
}
</script>

<template>
  <div v-if="response" class="timing-waterfall" data-testid="timing-waterfall">
    <header class="waterfall-header">
      <div>
        <strong>Timing waterfall</strong>
        <span>{{ attempts.length > 1 ? `${attempts.length} hops` : "Single request" }}</span>
      </div>
      <strong>{{ formatMs(response.timing?.totalMs) }} total</strong>
    </header>

    <div class="waterfall-attempts">
      <article v-for="attempt in attempts" :key="attempt.key" class="waterfall-attempt">
        <div class="waterfall-label">
          <strong>{{ attempt.label }}</strong>
          <span>{{ attempt.url }}</span>
          <em v-if="attempt.status">{{ attempt.status }}</em>
        </div>

        <div class="waterfall-track" :aria-label="`${attempt.label} timing waterfall`">
          <span class="waterfall-zero">0</span>
          <span class="waterfall-end">{{ formatMs(attempt.totalMs) }}</span>
          <span
            v-for="phase in attempt.phases"
            :key="phase.name"
            class="waterfall-segment"
            :class="[`phase-${phase.name}`, { zero: phase.durationMs === 0 }]"
            :style="{ left: `${phase.leftPct}%`, width: `${phase.widthPct}%` }"
            :data-tooltip="tooltip(phase)"
            :title="tooltip(phase)"
          >
            <span v-if="phase.widthPct >= 10">{{ phase.label }} {{ formatMs(phase.durationMs) }}</span>
          </span>
        </div>

        <div class="waterfall-legend">
          <span
            v-for="phase in attempt.phases"
            :key="phase.name"
            class="waterfall-chip"
            :class="`phase-${phase.name}`"
            :data-tooltip="tooltip(phase)"
            :title="tooltip(phase)"
          >
            <i aria-hidden="true" />
            {{ phase.label }}
            <strong>{{ formatMs(phase.durationMs) }}</strong>
          </span>
        </div>
      </article>
    </div>

    <div class="timing-grid compact">
      <div v-for="row in timingRows" :key="row.key">
        <span>{{ row.label }}</span>
        <strong>{{ formatMs(row.value) }}</strong>
      </div>
    </div>
  </div>

  <p v-else class="empty-timing">Send a request to see timing data.</p>
</template>
