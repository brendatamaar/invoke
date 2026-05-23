import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import App from "./App";

const rootRoute = createRootRoute({ component: Outlet });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: App });
const collectionsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/collections", component: App });
const historyRoute = createRoute({ getParentRoute: () => rootRoute, path: "/history", component: App });
const environmentsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/environments", component: App });
const flowsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/flows", component: App });
const mocksRoute = createRoute({ getParentRoute: () => rootRoute, path: "/mocks", component: App });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/settings", component: App });
const settingsTabRoute = createRoute({ getParentRoute: () => rootRoute, path: "/settings/$tab", component: App });
const diffRoute = createRoute({ getParentRoute: () => rootRoute, path: "/diff", component: App });

const routeTree = rootRoute.addChildren([
  indexRoute,
  collectionsRoute,
  historyRoute,
  environmentsRoute,
  flowsRoute,
  mocksRoute,
  settingsRoute,
  settingsTabRoute,
  diffRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
