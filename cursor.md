# react-frontend — React (Vite) event platform UI

Reference for the **react-frontend** app: stack, structure, patterns, and conventions. **When changing react-frontend** (new features, libs, or patterns), update this file so it stays accurate.

---

## Stack

| Area | Choice | Notes |
|------|--------|--------|
| **Build** | Vite + TypeScript | `vite.config.ts`, path alias `@/` → `src/`. |
| **Routing** | `react-router-dom` v7 | `createBrowserRouter` + `RouterProvider`; definitions in `src/app/routes.tsx`. |
| **Server/API state** | TanStack Query (React Query) | API data: cache, loading, error, refetch. Prefer hooks over ad-hoc global server state. |
| **Client state** | React state or Zustand | Zustand for cross-cutting client state (e.g. `shared/stores/guestListStore.ts`, `shared/stores/screenLoaderStore.ts`). |
| **Forms** | Ant Design `Form`, `react-hook-form`, Zod | Use what fits the screen: Ant Form with Zod where validation is centralized; `react-hook-form` + `@hookform/resolvers` + Zod where that pattern is already used. |
| **HTTP** | `fetch` | Centralized in `src/shared/api/client.ts` (`fetchApi`); TanStack Query hooks call feature or shared API helpers. |
| **UI** | Ant Design v6 | `ConfigProvider` theme from `src/app/antdTheme.ts` (`lightTheme` / `darkTheme`). `AppearanceThemeProvider` wraps the app and switches theme, `componentSize`, token tweaks (e.g. font size). |
| **Auth** | Firebase Auth (client SDK) | `src/app/firebase.ts`, `AuthContext` in `src/app/auth/AuthContext.tsx`. |
| **Styling** | Ant tokens + global CSS + Tailwind (PostCSS) | Global rules in `src/index.css` (e.g. `.reduce-motion` for accessibility). Tailwind available for utilities where used. |
| **Testing** | Vitest + React Testing Library + jsdom | `npm run test` / `npm run test:run`. |
| **E2E** | — | Not configured in this package (no Playwright in `package.json`). Add here if introduced. |

Avoid parallel stacks for the same concern (e.g. no Redux for server state, no Jest) unless this doc is updated.

---

## Bootstrap and providers

Order in `src/main.tsx`:

1. `QueryClientProvider`
2. `AuthProvider` (`AuthContext`)
3. `AppearanceThemeProvider` (Ant `ConfigProvider` + theme from user profile + local appearance storage; uses `useUserProfile` when signed in)
4. `RouterProvider` with router from `src/app/routes.tsx`

---

## API client (`src/shared/api/client.ts`)

- `fetchApi(path, init?)` builds URL from `VITE_API_URL` (trailing slash stripped).
- `setApiAuthGetter(() => Promise<string | null>)` is set from `AuthContext` so requests use the current Firebase ID token.
- If the getter returns null, `resolveIdToken` falls back to `firebaseAuth.currentUser?.getIdToken()`.
- `setApiGuestListGetter` maps a request URL to an optional guest-list token; `AuthContext` wires it to `guestListStore.getState().getTokenForRequest(url)`.
- Responses with status **401** dispatch a browser event `api:unauthorized` (listeners can sign out or redirect).

---

## Project structure

Feature-oriented layout under `src/`:

```
src/
  app/
    routes.tsx              # createBrowserRouter, lazy routes, Suspense fallbacks
    Layout.tsx              # Ant layout, AppHeader, Outlet, ScreenLoader
    ProtectedRoute.tsx      # auth gate; loading Spin; redirect to /signin
    AuthContext.tsx
    AppearanceThemeProvider.tsx
    antdTheme.ts
    firebase.ts
    appearance/             # mergeAppearancePreferences, storage keys
    components/             # AppHeader, ScreenLoader, …
  features/
    auth/                   # SignIn, SignUp, email link, phone, AuthComplete, …
    home/
    events/                 # list, create, detail, schedules, products, invitations, user products, …
    invitations/            # public invitation flows (view, confirmed, declined, expired)
    settings/               # SettingsPage, sections (profile, notifications, appearance, language, security), api/hooks/types
    orders/
    payment/
    tickets/
    favorites/
  shared/
    api/client.ts
    stores/                 # guestListStore, screenLoaderStore
    components/, hooks/, utils/, types/
  assets/
```

- **`app/`**: Shell, routing, auth, theme, shared layout components.
- **`features/`**: Own components, hooks, API hooks, types. Prefer `shared/` for generic reuse; avoid importing another feature’s internals.
- **`shared/`**: API client, stores, cross-feature utilities.

Tests: colocate `*.test.ts(x)` or `__tests__/` next to source.

---

## Routing

- **Router**: `createBrowserRouter` in `routes.tsx` with nested routes under `Layout`.
- **Lazy loading**: Heavy pages use `React.lazy` + `SuspensePage` wrapper with a small fallback (`PageFallback` with `Spin`).
- **Protected areas**: Wrap segments with `ProtectedRoute` where only signed-in users should enter (e.g. organizer flows, settings).
- **Settings**: Nested under `/settings` with sections `profile`, `notifications`, `appearance`, `language`, `security`. Route `/settings/privacy` redirects to `/settings/profile` (privacy UI deferred; see repo root `docs/privacy-settings-deferred.md`).

---

## Patterns

- **Server state**: TanStack Query hooks in features (e.g. `features/settings/hooks.ts`, `features/events/…`).
- **Auth**: Consume `useAuth()` from `AuthContext` for `user`, `loading`, `getIdToken`, sign-in/out, profile updates, reauth helpers, etc.
- **Appearance**: Server-backed `UserPreferences` (theme, density, font size, reduced motion) plus local merge in `appearance/`; `AppearanceSettingsSection` persists via user PATCH; root provider applies Ant theme and optional `.reduce-motion` on `document.documentElement`.
- **Guest list**: Zustand store holds per-event guest token for API calls on event-scoped routes.
- **Full-screen loading**: `ScreenLoader` + `screenLoaderStore` for global blocking UI when needed.
- **Code splitting**: Route-level `lazy()` imports in `routes.tsx`.
- **TypeScript**: Strict; feature types in `features/<name>/types.ts` or colocated.

---

## Conventions

- **Naming**: Components `PascalCase`; hooks `useSomething`; files `PascalCase.tsx` for components, `kebab-case` or `camelCase.ts` for utilities (follow existing neighbors in the same folder).
- **Imports**: Use `@/` alias.
- **Env**: Only `VITE_*` for client; no secrets in the frontend.
- **No comments in code** (project rule); names and this doc carry intent.
- **Python debugging rule** from repo does not apply to TS; use browser devtools or temporary logging as needed.

---

## AppHeader search behavior

For `src/app/components/AppHeader.tsx`:

- Always show the **search icon** in the navbar.
- On click, show the **search input inline** in the nav when space allows; otherwise **below** the nav (popover).
- On close (blur, outside click, Escape), hide/unmount the input.
- While the input is open below the nav, keep the **search icon** in hovered/active styling.

---

## Adding a feature

1. Add `features/<feature>/` with `components/`, `hooks/`, `api` helpers, `types.ts` as needed.
2. Wire API through `fetchApi` and TanStack Query; reuse auth and env patterns from existing features.
3. Register routes in `app/routes.tsx` with `lazy` where appropriate.
4. Update this file if you add a library or change global patterns.

---

This file is the source of truth for react-frontend stack and structure; keep it aligned with the codebase.
