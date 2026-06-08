# react-frontend — React (Vite) event platform UI

Reference for the **react-frontend** app: stack, structure, patterns, and conventions. **When changing react-frontend** (new features, libs, or patterns), update this file so it stays accurate.

---

## Stack

| Area | Choice | Notes |
|------|--------|--------|
| **Build** | Vite + TypeScript | `vite.config.ts`, path alias `@/` → `src/`. |
| **Routing** | `react-router-dom` v7 | `createBrowserRouter` + `RouterProvider`; entry `src/app/routes/index.tsx`, segments in `src/app/routes/*.tsx`. |
| **Server/API state** | TanStack Query (React Query) | API data: cache, loading, error, refetch. Prefer hooks over ad-hoc global server state. |
| **Client state** | React state or Zustand | Zustand for cross-cutting client state (e.g. `shared/stores/screenLoaderStore.ts`). |
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
    events/                 # index.ts (api, hooks); create/ wizard; edit/ tabbed editor; old/ archived reference; guest flow in components/
    settings/               # SettingsLayout, sections, api/hooks/types
  shared/
    api/client.ts
    stores/                 # screenLoaderStore
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

- Card **click** navigates to **edit** (`/events/:id/edit`) or **resume wizard** (`/events/new/:id/identity`) when **`!active && !setup_completed_at`** (**Rascunho** badge). **View** icon hidden for drafts; **edit** icon tooltip **Continuar configuração** for drafts. **`isEventSetupDraft`** in **`shared/eventSetupUtils.ts`**. **`EventEditLayout`** redirects drafts to the wizard.
- Header row: **name** (left), **active** tag + **actions** (right). **Cover** image below; **created** date under the image only (no location on the list card).

### Create event (`/events/new/*` wizard)

- **Wizard routes:** `identity` (`POST /events` draft) → `:eventId/venue` → `:eventId/schedule` (optional skip) → `:eventId/products` (optional skip) → `:eventId/tickets` (optional skip) → `:eventId/invitations` (`POST …/setup/complete`) → finish navigates to **`/events/:id/edit/details`**. Sub-editors at `:eventId/products|tickets|invitations/new` and `:id` paths stay inside the wizard layout.
- **No** cover image on create (added on edit **details** tab via **`PATCH …/identity`**). **`EventCreateWizardLayout`** + step pages under **`features/events/create/`**.
- **Draft events** default **`primary_category: "wedding"`** on the backend when omitted; **`createDraftEvent`** in **`features/events/api.ts`**.

### Edit event (`/events/:id/edit/*` nested tabs)

- **Layout:** **`EventEditLayout`** (`features/events/edit/`) loads event, **`SectionStepsNavLayout`** tab nav, **`EventDirtyRegistryProvider`** + **`useBlocker`** leave guard.
- **Tab routes:** `details`, `venue`, `schedule`, `products`, `tickets`, `invitations`; sub-editors at `products/new`, `products/:productId`, `tickets/new`, `tickets/:ticketId`, `invitations/new`, `invitations/:invitationId`.
- **Per-tab save:** details / venue / schedule tabs **autosave** (debounced, no tab Save button); **`is_paid`** auto-saves on tickets tab; products / invitations / sub-editors save via their own API calls.
- **Dirty snapshots:** **`shared/eventFormUtils.ts`** (`snapshotEventFormValuesForDirty` excludes cover **`imageURL`** from dirty baseline; image uploads PATCH immediately).
- **Archived reference:** previous **`EventForm`** / **`EventEditPage`** live under **`features/events/old/`** (not routed).

### Guest invitation flow (`/events/:id/invitation/:invitationId`)

- **Routes are not `Protected`** — guests open the magic link without Firebase.
- URL shape: **`/events/{eventId}/invitation/{invitationId}?token={access_token}`** (`features/events/lib/invitationAccessStorage.ts` helpers).
- **`invitationGuestLoader`** (`features/events/loaders/invitationGuestLoader.ts`) runs before the flow page: validates **`GET /events/{id}`** and **`GET /invitations/{id}`** with the token, seeds React Query cache, or **`redirect`**s to **`/events/{eventId}/invitation/{invitationId}/unavailable?reason=...`** (`required`, `invitation_expired`, `invitation_access_token_invalid`, `generic`). The heavy guest-flow bundle is not loaded on failure.
- **`InvitationGuestFlowPage`** — loader-gated; **`InvitationAccessProvider`** + lazy **`EventDetailComposition`** / **`EventGuestFlow`**.
- **`InvitationUnavailablePage`** — light page with **`GuestInvitationAccessErrorPanel`** only (no guest-flow imports).
- Organizer **`events/:id`** (protected) still uses **`EventDetailPage`** without invitation token.
- Hooks (`useEvent`, `useInvitation`, ticket/gift products) pass **`invitation_id` + `token`** on GETs and **`X-Invitation-Token`** on writes via **`fetchApi(..., invitationAccess)`**. Guest catalog uses **`GET /invitations/{id}/products`** (`useInvitationTicketProducts`, `useInvitationGiftProducts`); organizer event product lists use **`GET /events/{eventId}/products`** (Firebase). **`useFieldDefinitions`** is public (no invite token); results are cached in **localStorage** (~24h stale) so guest/organizer flows avoid refetching on every refresh.
- Organizers get **`access_token`** once on **POST `/events/{eventId}/invitations`** (create) or **`POST /events/{eventId}/invitations/{id}/access-token`** (refresh); token is stored in **`sessionStorage`** per invitation id for the invitations table **Link** / **Refresh link** actions (`EventInvitationsSection`).
- **`POST /invitations/{id}/guest-submit`** requires the same token (`guestSubmitPersistence`).
- Router factory: **`createAppRouter(queryClient)`** in **`app/routes/index.tsx`**; **`main.tsx`** passes the shared **`QueryClient`** into event routes for loader cache seeding.

### API types (`features/events/api.ts`)

- Section APIs: **`createDraftEvent`**, **`patchEventIdentity`**, **`patchEventVenue`**, **`patchEventCommerce`**, **`getEventSetup`**, **`completeEventSetup`**.
- Nested resources under **`/events/{eventId}/schedules|products|invitations`**.
- **`PatchEventIdentityPayload.imageURL`**: `string | null` clears cover image.
- **`CreateInvitationResponse`**: `Invitation & { access_token?: string }` (one-time; not returned on list GET).

### Event products and tickets (`EventProductsSection`)

- **`Product.type`**: `TICKET` \| `GIFT` (organizer products tab; see `shared/types/api.ts`). Listings use **`listEventProducts(..., { type: 'GIFT' | 'TICKET' })`**; backend defaults **`deleted=false`** on list routes.
- **`fulfillment_type`**: optional on create/update; labels live under **`events.products.*`** and **`events.tickets.*`** (en + pt-BR).

---

## Routing

- **Router**: `createBrowserRouter` in `routes.tsx` with nested routes under `Layout`.
- **Lazy loading**: Heavy pages use `React.lazy` + `SuspensePage` wrapper with a small fallback (`PageFallback` with `Spin`).
- **Protected areas**: Wrap segments with `ProtectedRoute` where only signed-in users should enter (e.g. organizer flows, settings).
- **Settings**: `/settings` with `?section=` query (`profile`, `notifications`, `appearance`, `language`, `security`). Legacy paths like `/settings/profile` redirect to `/settings?section=profile`. `/settings/privacy` redirects to `?section=profile` (privacy UI deferred; see repo root `docs/privacy-settings-deferred.md`).
- **Section menus (mandatory)**: Any in-page section menu or dropdown that switches content on the **same** route must sync the active section to the URL with **query params** (**`SettingsLayout`** — key **`section`**). Prefer `replace: true` on updates; normalize invalid params. Add redirects if old path-based URLs existed.
- **Event edit exception**: organizer event edit uses **nested routes** under **`/events/:id/edit/*`** (not `?section=`). Create wizard uses **`/events/new/*`** routes.
- **Breadcrumbs (mandatory)**: Use **`PageBreadcrumbBar`** (`shared/components/PageBreadcrumbBar.tsx`) whenever showing a breadcrumb so the **link icon** (copy full page URL) always appears next to the trail. Do not use raw `Breadcrumb` alone on feature pages.

Cursor rule: **`.cursor/rules/react-nav-menus-and-breadcrumbs.mdc`**.

---

## Patterns

- **Server state**: TanStack Query hooks in features (e.g. `features/settings/hooks.ts`, `features/events/…`).
- **Auth**: Consume `useAuth()` from `AuthContext` for `user`, `loading`, `getIdToken`, sign-in/out, profile updates, reauth helpers, etc.
- **Appearance**: Server-backed `UserPreferences` (theme, density, font size, reduced motion) plus local merge in `appearance/`; `AppearanceSettingsSection` persists via user PATCH; root provider applies Ant theme and optional `.reduce-motion` on `document.documentElement`.
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
