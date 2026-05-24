import { describe, expect, it } from "vitest";
import {
  HTTP_METHODS,
  makeRoute,
  makeSequenceItem,
} from "../features/mock/components/mockRouteUtils";

describe("mock route utils", () => {
  it("defines supported HTTP methods", () => {
    expect(HTTP_METHODS).toEqual([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ]);
  });

  it("creates a default route draft", () => {
    const route = makeRoute();

    expect(route).toMatchObject({
      enabled: true,
      method: "GET",
      pathPattern: "/",
      status: 200,
      headers: [],
      body: "",
      latencyMs: 0,
    });
    expect(route.id).toBeTruthy();
  });

  it("creates a default response sequence item", () => {
    expect(makeSequenceItem()).toEqual({
      status: 200,
      headers: [],
      body: "",
    });
  });
});
