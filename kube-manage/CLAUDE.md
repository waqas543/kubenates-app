# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

KubePilot (`kube-manage`) is a bare React Native app (0.81, RN CLI — not Expo/expo-router, despite Expo-generated scaffolding files at the repo root) that acts as a mobile Kubernetes dashboard/client. It connects directly from the phone to a Kubernetes API server — there is no backend proxy in the request path for cluster data (the `lib/api.ts` axios-based backend client is legacy/unused; the app talks to clusters via `lib/kubernetesClient.ts`).

## Commands

- `npm run android` — build and run on Android (device/emulator must be running)
- `npm run ios` — build and run on iOS (simulator/device must be running)
- `npm start` — start the Metro bundler
- `npm run lint` — run ESLint (`eslint-config-expo` flat config)

There is no test runner configured (no Jest, no `test` script) and no typecheck script — use `npx tsc --noEmit` if you need to type-check manually. There is no CI-facing build to invoke beyond the platform builds above.

Root files like `_ctx.js`, `drawer.js`, `stack.js`, `tabs.js`, `head.js`, `html.js`, `ui.js`, `index.d.ts` etc. are leftover `expo-router` package entry-point stubs from the original scaffold and are **not used** by this app — the real entry point is `index.js` → `App.tsx`. Don't try to wire routing through them.

## Architecture

### Navigation model (not file-based)

`App.tsx` wraps the app in providers, then `src/navigation/AppNavigator.tsx` (React Navigation native-stack) defines two kinds of screens:
- `Main` → `SidebarLayout`, a single stack screen that owns its **own** internal navigation via local state (`activeScreen: ScreenKey`, see `src/navigation/screenKeys.ts`) rather than nested React Navigation screens. `SidebarLayout` renders a responsive sidebar (persistent on wide screens, slide-in drawer below 768px width) and swaps a `SCREENS[activeScreen]` component with a fade animation.
- Everything else (`Setup`, `Logs`, `*Details`) are real React Navigation stack screens pushed on top of `Main`.

To navigate from a screen rendered *inside* `SidebarLayout` to another sidebar tab, use `MainLayoutNavContext` (`src/navigation/MainLayoutNavContext.tsx`), not `useNavigation()`. To push a stack screen (e.g. `PodDetails`), use the normal `useNavigation<NativeStackNavigationProp<RootStackParamList>>()` from `AppNavigator.tsx`.

Adding a new sidebar-tab resource type touches: `types/kubernetes.ts` (interface), `lib/kubernetesClient.ts` (API path + getters), `context/KubernetesContext.tsx` (fetcher + query), `src/screens/<Resource>Screen.tsx` + optionally `<Resource>DetailsScreen.tsx`, `src/navigation/screenKeys.ts` (add the key), `src/navigation/SidebarLayout.tsx` (`SCREENS` map + `NAV_SECTIONS` entry), and `src/navigation/AppNavigator.tsx` (if it needs a details stack screen + `RootStackParamList` entry).

### Cluster connectivity (`lib/kubernetesClient.ts`)

`kubeRequest()` is the single chokepoint for all Kubernetes API calls. It:
1. Resolves a bearer token — a static token from the kubeconfig, or (for EKS connections) a freshly generated one via `lib/eksAuth.ts`.
2. On Android/iOS, prefers the native `KubeHttpModule` (OkHttp) so it can do custom CA pinning and mTLS with client cert/key — **this native module currently only exists on Android** (`android/app/src/main/java/app/rork/kubemanage_mobile_app/KubeHttpModule.kt`); iOS has no equivalent, so iOS always falls back to plain `axios`, which cannot do custom CA verification or client-cert mTLS (only public-CA / token-auth clusters work on iOS today).
3. `buildPath()` maps a resource kind (e.g. `deployments`, `pods`) to its REST path using the `API_GROUPS` / `NAMESPACED_API_PREFIX` / `CLUSTER_SCOPED` tables — extend these tables (not ad-hoc path strings) when adding a new resource kind.

`lib/eksAuth.ts` implements AWS SigV4-signed STS presigned URLs (`aws eks get-token` equivalent) from scratch in pure JS, including a hand-rolled SHA-256/HMAC — no `crypto` or AWS SDK dependency, because this runs in the RN JS engine without Node's `crypto`. There's a `assertSha256()` self-test run on every token generation; don't remove it silently if refactoring this file.

Cluster connections (`ClusterConnection` in `types/kubernetes.ts`) are parsed from pasted/imported kubeconfig YAML in `context/KubernetesContext.tsx#parseKubeconfig`, persisted to `AsyncStorage`, and support two auth shapes: static token/cert (`connectionType: 'kubeconfig'`, the default) and EKS IAM exec-credential (`connectionType: 'eks'`, detected when the kubeconfig's user `exec` block calls `aws ... eks get-token`).

### State/data layer

- `context/KubernetesContext.tsx` is a single `@nkzw/create-context-hook` context wrapping TanStack Query (`useQuery`/`useMutation`). All list-fetch/mutate logic for pods/deployments/nodes/services/namespaces lives here; each `fetch*` function maps raw K8s API JSON into the app's flattened display types from `types/kubernetes.ts`. Screens for other resource kinds (configmaps, secrets, jobs, etc.) call `lib/kubernetesClient.ts` directly rather than going through this context — check existing screens for the pattern in use before adding a new one.
- `context/ThemeContext.tsx` is a second `create-context-hook` context holding `dark`/`light` mode + `AppColors` palette, persisted to `AsyncStorage`. Screens consume colors via `useTheme()` and build `StyleSheet` objects with a `createStyles(colors)` factory pattern (see `SidebarLayout.tsx`) rather than static styles, since colors are runtime-dependent.
- `lib/kubeHelpers.ts` has the shared formatting/parsing utilities (`toAge`, `toParsedConfig`, CPU/memory quantity parsing) used across screens and the context — prefer these over reimplementing k8s quantity formatting per-screen.

### Auth (Supabase)

Login is required before the app is usable. `AppNavigator.tsx` gates its entire screen tree on `useAuth().isAuthenticated`: unauthenticated → only `Login`/`Signup` are registered on the stack; authenticated → the full `Main`/`Setup`/details stack from before. While the initial session check is in flight (`isLoading`), it renders a centered spinner instead of either stack — don't add a third branch here, extend the existing two.

- `lib/supabase/client.ts` — the `@supabase/supabase-js` client. Session persistence uses `AsyncStorage` (same as the other contexts); auto-refresh is paused/resumed on `AppState` background/foreground. Includes an Android-emulator loopback rewrite (`127.0.0.1`/`localhost` → `10.0.2.2`) for local Supabase dev, mirroring `lib/api.ts`'s `LOCALHOST` handling — only affects local dev URLs, not hosted `https://*.supabase.co` ones.
- `lib/supabase/auth.ts` — thin wrapper functions (`signInWithEmail`, `signUpWithEmail`, `signOut`, `getSession`) around `supabase.auth.*`, in the same spirit as `kubernetesClient.ts`'s resource getters. Add new Supabase-backed domains (tables, storage, etc.) as sibling files here, not inside `client.ts`.
- `context/AuthContext.tsx` — `create-context-hook` context exposing `session`, `user`, `isAuthenticated`, `isLoading` (initial hydration), `isAuthenticating` (in-flight sign in/up), and `signIn`/`signUp`/`signOut`. Hydrates from `supabase.auth.getSession()` on mount and stays in sync via `supabase.auth.onAuthStateChange` — it does not poll or store its own copy of the session in `AsyncStorage` (Supabase's client already does that).
- Credentials live in `.env` (gitignored; `.env.example` has the shape) as `SUPABASE_URL`/`SUPABASE_ANON_KEY`, exposed at import time via `react-native-dotenv`'s `@env` module (typed in `types/env.d.ts`). Whenever `.env` values change, restart Metro with cache clear (`npm start -- --reset-cache`) — `react-native-dotenv` inlines values at babel-transform time, not runtime.
- Local dev stack: `supabase/` (created by `supabase init`) + Docker via `supabase start`/`supabase stop`. Studio at `http://127.0.0.1:54323`, API at `http://127.0.0.1:54321`, Mailpit (catches signup confirmation emails instead of sending real ones) at `http://127.0.0.1:54324`. `supabase/config.toml` is version-controlled; `supabase/.temp` and `.branches` are gitignored by Supabase's own generated `.gitignore`.
- Google/LinkedIn sign-in uses Supabase's OAuth + PKCE flow, not a native SDK. `lib/supabase/auth.ts#signInWithOAuth` calls `supabase.auth.signInWithOAuth({ skipBrowserRedirect: true })` and opens the returned URL with `Linking.openURL` (system browser, not an in-app webview). The provider redirects to the `rork-app://auth-callback` deep link — registered via an `intent-filter` in `AndroidManifest.xml` and `CFBundleURLTypes` in `ios/*/Info.plist` (both already present in this repo, inherited from the original scaffold). `AuthContext` listens for that URL via `Linking.addEventListener('url', ...)` (plus `Linking.getInitialURL()` for the cold-start case where the app was killed while the user was in the browser) and calls `exchangeCodeFromUrl`, which pulls the `code` query param and calls `supabase.auth.exchangeCodeForSession()`. This requires `flowType: 'pkce'` in `lib/supabase/client.ts` — the default implicit flow won't work here since `detectSessionInUrl` is `false`.
- Getting Google/LinkedIn working (dashboard-only, not code): create an OAuth client in Google Cloud Console and an app in the LinkedIn Developer Portal (enable "Sign In with LinkedIn using OpenID Connect"), both with redirect URI `http://127.0.0.1:54321/auth/v1/callback` (swap the host for your hosted project's URL in production), then put the client id/secret in the root `.env` as `SUPABASE_AUTH_GOOGLE_CLIENT_ID`/`_SECRET` and `SUPABASE_AUTH_LINKEDIN_CLIENT_ID`/`_SECRET` (the Supabase CLI reads this file directly for `env(...)` substitution in `supabase/config.toml` — it's a separate mechanism from `react-native-dotenv`'s `@env`, so these never end up in the JS bundle), and flip `enabled = true` on the corresponding `[auth.external.*]` blocks in `supabase/config.toml`, then `supabase stop && supabase start`.
- Email confirmation is required (`enable_confirmations = true` under `[auth.email]` in `supabase/config.toml`) — signup returns a user with no session until confirmed. Locally, confirmation emails land in Mailpit (`http://127.0.0.1:54324`) instead of a real inbox.

### Path aliases

`@/*` maps to the repo root (configured in both `tsconfig.json` paths and `babel.config.js` module-resolver) — e.g. `@/context/KubernetesContext`, `@/lib/kubernetesClient`, `@/types/kubernetes`. Use this alias for cross-directory imports; use relative imports within `src/navigation` and `src/screens`.
