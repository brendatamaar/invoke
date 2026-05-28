import { HttpServerResponse } from "@effect/platform";
import { Chunk, Duration, Effect, Option, Stream } from "effect";

export const sseHeaders = {
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export function sseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function sseData(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function sseResponse(stream: Stream.Stream<string, never>) {
  return HttpServerResponse.stream(Stream.encodeText(stream), {
    contentType: "text/event-stream",
    headers: sseHeaders,
  });
}

export function pollingSse<A, E, R>(
  poll: Effect.Effect<A, E, R>,
  format: (value: A) => { readonly events: string[]; readonly done: boolean },
  formatError: (error: E) => string,
) {
  const step = poll.pipe(
    Effect.match({
      onFailure: (error) => [Chunk.of(formatError(error)), Option.none<boolean>()] as const,
      onSuccess: (value) => {
        const result = format(value);
        return [
          Chunk.fromIterable(result.events),
          result.done ? Option.none<boolean>() : Option.some(false),
        ] as const;
      },
    }),
  );
  return Stream.paginateChunkEffect(true as boolean, (isFirst) =>
    isFirst ? step : Effect.delay(step, Duration.millis(100)),
  );
}
