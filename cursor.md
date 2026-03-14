# react-frontend — React (Vite) event platform UI

This document is the reference for the **react-frontend** app: stack, structure, patterns, and conventions. **When changing react-frontend** (new features, libs, or patterns), update this file so it stays accurate.

---

## Stack (mandatory)

| Area | Choice | Notes |
|------|--------|--------|
| **Build** | Vite + TypeScript | Already in place. |
| **Routing** | React Router (v6) | Use for all routes. |
| **Server/API state** | TanStack Query (React Query) | All API data: cache, loading, error, refetch. No global store for server state. |
| **Client state** | React state or Zustand | Zustand only when shared client state is needed across many components. |
| **Forms** | React Hook Form + Zod | Validation with Zod; avoid uncontrolled forms without validation. |
| **HTTP** | fetch or Axios | Centralized in an API layer; TanStack Query hooks call this layer. |
| **Styling** | Tailwind CSS or MUI | One of these; avoid mixing multiple styling systems. |
| **Testing** | Vitest + React Testing Library | Unit and component tests. |
| **E2E** | Playwright | When E2E is added. |

Do not introduce alternatives for these areas (e.g. no Redux for server state, no Formik, no Jest) unless this doc is updated.

---

## Project structure

Use a **feature-based** layout under `src/`:

```
src/
  app/                 # App shell: router, providers (QueryClient, auth, theme)
  features/            # One folder per feature (auth, events, attendees, …)
    <feature>/
      components/
      hooks/
      api.ts           # TanStack Query hooks + API calls for this feature
      types.ts         # Feature-specific types
  shared/              # Reusable across features
    components/
    hooks/
    api/               # Base HTTP client, interceptors, env
    utils/
    types/
  assets/
```

- **app/**: Root layout, `BrowserRouter`, `QueryClientProvider`, auth provider, theme. Route definitions can live here or in a dedicated `routes/` (or inside `app/`).
- **features/**: Feature folders own their components, hooks, API hooks, and types. No cross-feature imports of internals; use `shared/` for common code.
- **shared/**: UI primitives, generic hooks, base API client, shared types and utils.

Colocate tests next to the code (e.g. `*.test.tsx` or `__tests__/`) or in a single `__tests__` per feature.

---

## Patterns

- **Server state**: Always via TanStack Query. Create one (or more) hooks per endpoint or use case (e.g. `useEvent(id)`, `useEvents(params)`). Keep API functions in `features/<name>/api.ts` or `shared/api/` and call them from the hooks.
- **Client state**: Prefer React state. Use Zustand only for state shared across many components (e.g. global UI state, selected tenant).
- **API layer**: Single place for all HTTP calls. Use env (e.g. `VITE_API_URL`) for base URL. Do not scatter `fetch`/`axios` across components; components use TanStack Query hooks that call the API layer.
- **Custom hooks**: Encapsulate reusable logic (data fetching, auth, form state). Name them `useSomething`.
- **Composition**: Prefer small components and composition over large components and prop drilling.
- **Error boundaries**: At least one at app level; add more per route or feature if needed.
- **Code splitting**: Use `React.lazy` and `Suspense` for route-level (or heavy) components.
- **TypeScript**: Strict mode. Type API responses (hand-written or generated). Shared types in `shared/types/` or next to the feature in `features/<name>/types.ts`.

---

## Conventions

- **Naming**: Components `PascalCase`; hooks `useSomething`; utils/constants `camelCase` or `UPPER_SNAKE` for constants. Files: `PascalCase.tsx` for components or `kebab-case.ts` for non-components (choose one and stick to it).
- **Imports**: Prefer path aliases (e.g. `@/shared/...`, `@/features/...`) configured in Vite/TypeScript.
- **Env**: Only `VITE_*` for client-side env. No secrets in the frontend.
- **No comments in code** (per project rule); use clear names and this doc.
- **Debugging**: Use `import ipdb; ipdb.set_trace();` only in dev (or the JS equivalent if needed in browser).

---

## Adding a new feature

1. Add `features/<feature>/` with `components/`, `hooks/`, `api.ts`, `types.ts` as needed.
2. In `api.ts`: define API functions and TanStack Query hooks that call the backend; use the shared API base URL.
3. Add routes in the app router; use lazy loading for the feature page if appropriate.
4. Use React Hook Form + Zod for forms; TanStack Query for any server state.
5. Update this file if you introduce a new lib or change structure.

---

This file is the single source of truth for react-frontend stack and structure; follow it and keep it in sync with the codebase.
