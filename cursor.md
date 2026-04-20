# react-frontend — React (Vite) event platform UI

Reference for the **react-frontend** app: stack, structure, patterns, and conventions. **When changing react-frontend** (new features, libs, or patterns), update this file so it stays accurate.

---

## Stack

| Area | Choice | Notes |
|------|--------|--------|
| **Build** | Vite + TypeScript | `vite.config.ts`, path alias `@/` → `src/`. |
| **Routing** | `react-router-dom` v7 | `createBrowserRouter` + `RouterProvider`; entry `src/app/routes/index.tsx`, segments in `src/app/routes/*.tsx`. |
| **Server/API state** | TanStack Query (React Query) | API data: cache, loading, error, refetch. Prefer hooks over ad-hoc global server state. |
| **Client state** | React state or Zustand | Zustand for cross-cutting client state (e.g. `shared/stores/guestListStore.ts`, `shared/stores/screenLoaderStore.ts`). |
| **Forms** | Ant Design `Form`, `react-hook-form`, Zod | Use what fits the screen: Ant Form with Zod where validation is centralized; `react-hook-form` + `@hookform/resolvers` + Zod where that pattern is already used. |
| **HTTP** | `fetch` | Centralized in `src/shared/api/client.ts` (`fetchApi`); TanStack Query hooks call feature or shared API helpers. |
| **UI** | Ant Design v6 | `ConfigProvider` theme from `src/app/antdTheme.ts` (`lightTheme` / `darkTheme`). `AppearanceThemeProvider` wraps the app and switches theme, `componentSize`, token tweaks (e.g. font size). |
| **Auth** | Firebase Auth (client SDK) | `src/app/firebase.ts`, `AuthContext` in `src/app/auth/AuthContext.tsx`. |
| **Styling** | Ant tokens + global CSS + Tailwind (PostCSS) | Global rules in `src/index.css` (e.g. `.reduce-motion` for accessibility). Tailwind available for utilities where used. |
| **i18n** | i18next + react-i18next | See **[Internationalization (i18n)](#internationalization-i18n)**. Init in [`src/i18n/config.ts`](src/i18n/config.ts); resources in [`src/locales/en/translation.json`](src/locales/en/translation.json) and [`src/locales/pt-BR/translation.json`](src/locales/pt-BR/translation.json). Active language: signed-in users follow `UserPreferences.language` (synced in [`AppearanceThemeProvider`](src/app/AppearanceThemeProvider.tsx)); otherwise `localStorage` ([`I18N_STORAGE_KEY`](src/i18n/constants.ts)) then `navigator.language`. Ant Design `ConfigProvider` `locale` follows `i18n.language` (`en_US` / `pt_BR`). |
| **Testing** | Vitest + React Testing Library + jsdom | `npm run test` / `npm run test:run`. Test setup imports [`src/i18n/config`](src/i18n/config) so `useTranslation` works in tests. |
| **E2E** | — | Not configured in this package (no Playwright in `package.json`). Add here if introduced. |

Avoid parallel stacks for the same concern (e.g. no Redux for server state, no Jest) unless this doc is updated.

---

## Bootstrap and providers

Order in `src/main.tsx`:

1. `QueryClientProvider`
2. `AuthProvider` (`AuthContext`)
3. `AppearanceThemeProvider` (Ant `ConfigProvider` + theme + **locale** + `document.documentElement.lang`; appearance + **i18n** sync from user profile when signed in)
4. `RouterProvider` with router from `@/app/routes/index` in `main.tsx`

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
  i18n/                   # i18next init, storage key, supported locale helpers
  locales/                # translation JSON per language
  app/
    routes/                 # index.tsx (createBrowserRouter), shell, auth/events/settings/home route modules
    auth/                   # AuthContext (and related) lives here
    Layout.tsx              # Ant layout, AppHeader, Outlet, ScreenLoader
    ProtectedRoute.tsx      # auth gate; loading Spin; redirect to /signin
    AppearanceThemeProvider.tsx
    antdTheme.ts
    firebase.ts
    appearance/             # mergeAppearancePreferences, storage keys
    components/             # AppHeader, ScreenLoader, …
  features/
    auth/                   # index.ts (AuthFooterLink); pages/ lazy-loaded from app/routes
    home/
    events/                 # index.ts (api, hooks); pages/ lazy-loaded; components/EventForm
    settings/               # SettingsLayout, sections, api/hooks/types
  shared/
    api/client.ts
    stores/                 # guestListStore, screenLoaderStore
    components/, types/     # api.ts types (no barrel); add hooks/utils when needed
  assets/
```

- **`app/`**: Shell, routing, auth, theme, shared layout components.
- **`features/`**: Own components, hooks, API hooks, types. Prefer `shared/` for generic reuse; avoid importing another feature’s internals. Agent-facing conventions for new pages, route modules, and barrels: **`.cursor/rules/react-frontend-feature-structure.mdc`** (repo root).
- **`shared/`**: API client, stores, cross-feature utilities. **`ImageEditModal`** (`shared/components/ImageEditModal.tsx`): Firebase upload + remove in a modal; profile uses `avatars/{uid}/…` and persists photo via profile PATCH immediately; event **edit** uses `event-images/{uid}/{eventId}/…` then **`updateEvent`** immediately (same pattern as profile), not on “Save changes”.

Tests: colocate `*.test.ts(x)` or `__tests__/` next to source.

---

## Internationalization (i18n)

**Every change that introduces or edits user-visible copy must ship with translations** for **both** supported locales: **English** (`en`) and **Portuguese (Brazil)** (`pt-BR`).

### Rules

1. **No raw user-facing strings** in components for labels, titles, buttons, placeholders, helper text, toasts (`message.*`), modal titles/bodies, `aria-label`, table headers, empty states, or validation messages—unless explicitly exempt (e.g. a proper noun, a URL, or a technical identifier that must stay fixed). Use `useTranslation()` and `t('some.key')`.
2. **Add keys to both files** in the same change: [`src/locales/en/translation.json`](src/locales/en/translation.json) and [`src/locales/pt-BR/translation.json`](src/locales/pt-BR/translation.json). Keep key paths and nesting aligned between locales.
3. **Key organization**: Prefer grouped namespaces, e.g. `settings.profile.*`, `settings.security.*`, `auth.signIn.*`, `shell.*`. New features may add a new top-level group (e.g. `events.list.title`)—stay consistent with existing patterns.
4. **Interpolation**: Use i18next placeholders (`{{name}}`) in JSON and `t('key', { name: value })` in code.
5. **Forms and Zod**: Validation messages must come from `t(...)` (often `useMemo` on schema when `t` changes). Reuse shared keys under `auth.validation` where appropriate.
6. **Firebase / API errors**: Map error codes to `t('…')` (see [`securityAuthErrorMessage`](src/features/settings/utils/securityAuthErrorMessage.ts) pattern); avoid hardcoded English error strings in UI.
7. **Ant Design built-ins**: Date formats, empty text, etc. are covered by `ConfigProvider` `locale` in `AppearanceThemeProvider`; app-specific copy still uses `t()`.

### Implemented areas (extend as you add features)

Settings (`settings.*`): menu, profile, notifications, appearance, language, security. Auth pages (`auth.*`). Shell / header (`shell.*`).

---

## Events (my events, create, edit)

### My events list (`features/events/UserEventsListPage.tsx`)

- Card **click** navigates to **edit** (`/events/:id/edit`). **View** / **edit** icon buttons use **`Tooltip`** + **`aria-label`** (`userEvents.viewTooltip`, `userEvents.editTooltip`, and aria keys with event name). See **`.cursor/rules/react-icon-only-tooltip.mdc`**.
- Header row: **name** (left), **active** tag + **actions** (right). **Cover** image below; **created** date under the image only (no location on the list card).

### Create event (`EventCreatePage` + `EventForm` `mode="create"`)

- **No** cover image block (image is added on **edit** only). **No** full-page **`Spin`** while submitting—only the submit button **`loading`** state.
- **Section menu** uses **local state only** — no **`?section=`** in the URL (any `section` query is removed on this flow).
- **Wizard footer:** **Next** validates the current step and advances (**Details** → **Tags & visibility** → **Venue** → **Schedules**). **Back** moves to the previous step without validating. **Create** (`events.create.submit`) appears only on **Schedules** and runs full-form submit (same as before).

### Edit event (`EventEditPage` + `EventForm` `mode="edit"`)

- **Section menu (URL `?section=`)**: `details` (identity), `tags`, `venue`, `schedule` (single-day schedule: one date, start/end time, IANA time zone on the same `Form` as the event; API stores the same `start_date` and `end_date`). **Save changes** persists event fields and/or schedule when either side is dirty. Create flow shows a hint on **Schedules** until the event exists.
- **Collapse** (`Venue & location`, **`Media`** for cover): both start **collapsed** on open (`activeKey` initially `undefined`). Validation can open the right panel via `panelKeyByField` (e.g. location fields → `venue`, `imageURL` → `media`).
- **Unsaved-changes / dirty pattern** (reusable for other edit pages): **`.cursor/rules/react-edit-page-dirty.mdc`**.
- **“Save changes”** is **disabled** until the form is dirty. Dirty state uses **`Form.useWatch([], form)`** and compares to a baseline; **cover `imageURL` is excluded** from dirty snapshots (`snapshotEventFormValuesForDirty` / `snapshotFromInitialForDirty`) because the image is persisted separately.
- **Cover image**: after Firebase upload, call **`updateEvent`**, then **`queryClient.setQueryData(['event', eventId], updated)`** and **`invalidateQueries`** for `userEvents`. Clearing the image uses **`updateEvent` with `imageURL: null`** (JSON must include `null`, not omit the field). Toasts: `events.form.imageUpdated` / `events.form.imageRemoved`. Do not reset the whole form on every cache bump: **sync `setFieldsValue` from `initialValues` on edit only when `eventId` changes**, not on every `initialValues` reference change.
- **Leave guard**: `useBlocker(formDirty)`, `beforeunload` when dirty, Ant **`modal.confirm`** for in-app navigation. After a **successful** main-form save, use **`flushSync(() => setFormDirty(false))`** before **`navigate(...)`** so programmatic navigation is not blocked while `formDirty` is still true.

### API types (`features/events/api.ts`)

- **`UpdateEventPayload.imageURL`**: `string | null` so the client can **clear** the server field with `"imageURL": null` in the PATCH body.

### Event products and tickets (`EventProductsSection`)

- **`Product.type`**: `TICKET` \| `MERCH` (see `shared/types/api.ts`). New creates send an explicit kind; ticket listings use **`listEventProducts(..., { type: 'TICKET' })`**. Merchandise still loads all products for the event and **filters client-side** (`type !== 'TICKET'`) so older API rows without `type` stay visible as non-tickets.
- **`fulfillment_type`** / **`fulfillment_profile_id`**: optional on create/update; labels live under **`events.products.*`** and **`events.tickets.*`** (en + pt-BR).

---

## Routing

- **Router**: `createBrowserRouter` in `routes.tsx` with nested routes under `Layout`.
- **Lazy loading**: Heavy pages use `React.lazy` + `SuspensePage` wrapper with a small fallback (`PageFallback` with `Spin`).
- **Protected areas**: Wrap segments with `ProtectedRoute` where only signed-in users should enter (e.g. organizer flows, settings).
- **Settings**: `/settings` with `?section=` query (`profile`, `notifications`, `appearance`, `language`, `security`). Legacy paths like `/settings/profile` redirect to `/settings?section=profile`. `/settings/privacy` redirects to `?section=profile` (privacy UI deferred; see repo root `docs/privacy-settings-deferred.md`).
- **Section menus (mandatory)**: Any in-page section menu or dropdown that switches content on the **same** route must sync the active section to the URL with **query params** (**`SettingsLayout`**, **`EventForm` `mode="edit"`** — slugs `details`, `tags`, `venue`, `schedule`; **create** event form omits URL params). Prefer key **`section`** and `replace: true` on updates; normalize invalid params. Add redirects if old path-based URLs existed.
- **Breadcrumbs (mandatory)**: Use **`PageBreadcrumbBar`** (`shared/components/PageBreadcrumbBar.tsx`) whenever showing a breadcrumb so the **link icon** (copy full page URL) always appears next to the trail. Do not use raw `Breadcrumb` alone on feature pages.

Cursor rule: **`.cursor/rules/react-nav-menus-and-breadcrumbs.mdc`**.

---

## Patterns

- **Server state**: TanStack Query hooks in features (e.g. `features/settings/hooks.ts`, `features/events/…`).
- **Auth**: Consume `useAuth()` from `AuthContext` for `user`, `loading`, `getIdToken`, sign-in/out, profile updates, reauth helpers, etc.
- **Appearance**: Server-backed `UserPreferences` (theme, density, font size, reduced motion) plus local merge in `appearance/`; `AppearanceSettingsSection` persists via user PATCH; root provider applies Ant theme and optional `.reduce-motion` on `document.documentElement`.
- **Guest list**: Zustand store holds per-event guest token for API calls on event-scoped routes.
- **Full-screen loading**: `ScreenLoader` + `screenLoaderStore` for global blocking UI when needed.
- **Code splitting**: Route-level `lazy()` imports in `routes.tsx`.
- **TypeScript**: Strict; feature types in `features/<name>/types.ts` or colocated.
- **i18n**: Follow **[Internationalization (i18n)](#internationalization-i18n)** for all new and changed UI copy.
- **Icon-only controls**: **`.cursor/rules/react-icon-only-tooltip.mdc`** — `Tooltip` + `t()` + `aria-label`; optional `<span style={{ display: 'inline-flex' }}>` for `Link` / `Dropdown` triggers.

---

## Conventions

- **Naming**: Components `PascalCase`; hooks `useSomething`; files `PascalCase.tsx` for components, `kebab-case` or `camelCase.ts` for utilities (follow existing neighbors in the same folder).
- **Translations**: Mandatory for both `en` and `pt-BR` on any user-visible text you add or change; see **[Internationalization (i18n)](#internationalization-i18n)**.
- **Imports**: Use `@/` alias.
- **Env**: Only `VITE_*` for client; no secrets in the frontend. Copy `VITE_API_URL` from [`react-frontend/.env.example`](.env.example); for production, set it to the deployed Firebase Function `api` URL (see [`backend_api/DEPLOY.md`](../backend_api/DEPLOY.md)).
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
2. **Strings**: Add English and Portuguese keys under `src/locales/{en,pt-BR}/translation.json` and use `useTranslation()` in UI. Do not merge user-visible copy without both locales.
3. Wire API through `fetchApi` and TanStack Query; reuse auth and env patterns from existing features.
4. Register routes in `app/routes/` (e.g. `eventsRoutes.tsx`) with `lazy` where appropriate.
5. Update this file if you add a library or change global patterns.

---

This file is the source of truth for react-frontend stack and structure; keep it aligned with the codebase.
