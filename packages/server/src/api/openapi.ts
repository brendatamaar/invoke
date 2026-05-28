import { OpenApi } from "@effect/platform";
import { InvokeApi } from "./index.js";

/**
 * Generated OpenAPI 3.1 spec for the typed HttpApi surface.
 * Raw routes are intentionally served separately and excluded.
 */
export const openApiSpec = OpenApi.fromApi(InvokeApi);
