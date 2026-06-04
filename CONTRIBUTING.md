# Contributing to Invoke

## Security Issues

Please do not open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

## Dev Setup

Requires Node.js (pnpm), Bun, and Go.

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts all packages in watch mode via Turbo.

## Package Overview

| Package | Tech |
|---------|------|
| `packages/core` | Effect, Dexie — shared data layer and domain logic |
| `packages/server` | Bun, Hono — HTTP API server |
| `packages/ui` | React 19, Vite, Zustand — web frontend |
| `packages/executor` | Go — request execution engine |

## Code Style

We use oxlint for linting and oxfmt for formatting. Run both with:

```sh
pnpm lint
```

Fix any lint errors before submitting a PR.

## PR Process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Open a PR against `main` with a clear description of what changed and why
4. Link any related issues

Small, focused PRs are easier to review than large ones. If you're planning a significant change, open an issue first to discuss the approach.
