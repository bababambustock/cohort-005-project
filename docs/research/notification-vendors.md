# Notification vendors compared: Knock, Novu, Courier, MagicBell, SuprSend

Research for [#2](https://github.com/bababambustock/cohort-005-project/issues/2) on the map [#1 Notifications in Cadence](https://github.com/bababambustock/cohort-005-project/issues/1). Checked on 2026-11-17 against each vendor's own docs, pricing page, GitHub repos and npm registry entries. Prices and plans change, so recheck the pricing pages before deciding. This file states facts; picking the vendor is [#4](https://github.com/bababambustock/cohort-005-project/issues/4).

"unconfirmed" means the vendor's own sources do not state it. It does not mean "no".

## Hard criteria at a glance

The map's hard criteria are a prebuilt React inbox component, an email channel that keeps Postmark as the underlying provider, and a free tier that covers Cadence. EU data hosting is a plus.

| | React inbox | Postmark as email provider | Free tier | EU hosting |
|---|---|---|---|---|
| Knock | Yes ([docs](https://docs.knock.app/in-app-ui/react/overview)) | Yes ([docs](https://docs.knock.app/integrations/email/postmark)) | 10,000 messages/mo ([pricing](https://knock.app/pricing)) | No, "coming soon", expected by end of 2026 ([plans](https://docs.knock.app/manage-your-account/knock-plans)) |
| Novu | Yes ([docs](https://docs.novu.co/platform/inbox/overview)) | Yes ([docs](https://docs.novu.co/platform/integrations/email/postmark)) | 10,000 workflow runs/mo ([pricing](https://novu.co/pricing)) | Yes, Frankfurt, all plans incl. Free ([security](https://docs.novu.co/platform/additional-resources/security)) |
| Courier | Yes ([docs](https://www.courier.com/docs/sdk-libraries/courier-react-web)) | Yes ([docs](https://www.courier.com/docs/integrations/email/postmark)) | 10,000 sends/mo ([pricing](https://www.courier.com/pricing)) | Yes, Ireland, paid plans only ([docs](https://www.courier.com/docs/platform/workspaces/eu-datacenter)) |
| MagicBell | Yes ([docs](https://www.magicbell.com/docs/libraries/magicbell-react)) | **Not listed** among email providers; generic SMTP only, Postmark via SMTP unconfirmed ([docs](https://www.magicbell.com/docs/channels/email)) | 1,000 deliveries/mo ([pricing](https://www.magicbell.com/pricing)) | unconfirmed, nothing found ([security](https://www.magicbell.com/security)) |
| SuprSend | Yes ([docs](https://docs.suprsend.com/docs/react-sdk)) | Yes ([docs](https://docs.suprsend.com/docs/postmark)) | 10,000 notifications/mo ([pricing](https://www.suprsend.com/pricing)) | EU region exists ([docs](https://docs.suprsend.com/docs/what-is-suprsend)); on which plans unconfirmed, pricing ticks "Custom Data Center Region" for Enterprise only ([pricing](https://www.suprsend.com/pricing)) |

**Fails a hard criterion:** MagicBell. Its email channel docs do not list Postmark as a provider ([docs](https://www.magicbell.com/docs/channels/email)). A marketing page names Postmark ([magicbell.com/email](https://www.magicbell.com/email)) but the same page's provider section and the docs do not, so Postmark support is at best "through generic SMTP", which MagicBell does not document for Postmark. Its free tier is also a tenth of the others (1,000 deliveries).

Whether a free tier "covers Cadence" depends on Cadence's monthly volume, which this ticket did not measure. Note that the vendors count differently (next section): one Notification sent to the inbox and by email is 2 units on Knock, MagicBell and SuprSend, but 1 unit on Novu and Courier.

## Pricing

| | Free tier | How usage is counted | First paid tier | Overage on first paid tier |
|---|---|---|---|---|
| Knock | $0, "up to 10,000" messages/mo, unlimited channels; no hard cap, Knock contacts you ([pricing](https://knock.app/pricing)) | "A single message delivered to a single user on a single channel"; usage in every environment counts; sandboxed messages do not ([plans](https://docs.knock.app/manage-your-account/knock-plans)) | Starter, "$ 250/ month + additional usage", 50,000 messages ([pricing](https://knock.app/pricing)) | "$0.005/ea" ([pricing](https://knock.app/pricing)) |
| Novu | $0, "10,000 workflow runs / month", all channels, up to 5 workflows, 2 environments, 24 h activity retention; new runs rejected with HTTP 402 at the cap ([pricing](https://novu.co/pricing), [billing](https://docs.novu.co/platform/account/billing)) | One workflow run = one workflow for one subscriber, regardless of channels; Development runs count too ([billing](https://docs.novu.co/platform/account/billing)) | Pro, "Starting from $30 / month", "30,000+ workflow runs / month" ([pricing](https://novu.co/pricing)) | "$1.20 per 1K" runs ([pricing](https://novu.co/pricing)) |
| Courier | Developer, $0, "10,000 sends per month", no channel add-on fees ([pricing](https://www.courier.com/pricing)) | "One send is one template sent to one recipient", across all its channels; Test and custom environments count the same as Production ([pricing](https://www.courier.com/pricing)) | Business, no base fee, $0.005 per send ([pricing](https://www.courier.com/pricing)) | "Business charges $0.005 for every send, including the first 10,000" ([pricing](https://www.courier.com/pricing)) |
| MagicBell | Builder, "$0 /month", "1,000 Deliveries/mo.", 1 project, unlimited users ([pricing](https://www.magicbell.com/pricing)) | Each channel a user receives a notification on counts (100 in-app + 50 email = 150) ([pricing](https://www.magicbell.com/pricing), FAQ) | Startup, "$249 /month", 50,000 deliveries, 5 projects ([pricing](https://www.magicbell.com/pricing)) | "$0.0025 per additional Delivery"; $99 per extra project ([pricing](https://www.magicbell.com/pricing)) |
| SuprSend | $0, "10k Notifications/mo", unlimited channels, 30-day logs, SuprSend branding ([pricing](https://www.suprsend.com/pricing)) | "a message triggered to a single user or object on any downstream channel", so per channel per recipient ([pricing](https://www.suprsend.com/pricing)) | Essentials, "$100/month", "Billed annually at $1,200", 50k notifications; a month-to-month price is unconfirmed ([pricing](https://www.suprsend.com/pricing)) | "$2 per 1,000 additional notifications" ([pricing](https://www.suprsend.com/pricing)) |

Recipient caps: none stated for Knock messaging ([pricing](https://knock.app/pricing)), Courier (unconfirmed, [pricing](https://www.courier.com/pricing)) or SuprSend ([pricing](https://www.suprsend.com/pricing)); Novu's pricing table shows Subscribers "Unlimited" ([pricing](https://novu.co/pricing)); MagicBell "Unlimited Users" ([pricing](https://www.magicbell.com/pricing)).

## React inbox component and restyling

| | Package | Restyling |
|---|---|---|
| Knock | `@knocklabs/react`, peer React ^17/^18/^19 ([package.json](https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/package.json)); `NotificationFeedPopover`, `NotificationFeed`, `NotificationIconButton` ([docs](https://docs.knock.app/in-app-ui/react/overview)) | `--rnf-` CSS variables, unique `rnf-` classes, CSS can be replaced entirely, `renderItem` for the whole cell ([feed](https://docs.knock.app/in-app-ui/react/feed)); headless hooks `useNotifications`, `useNotificationStore` ([headless](https://docs.knock.app/in-app-ui/react/headless/feed)) |
| Novu | `@novu/react` `<Inbox />`, peer React ^18 or ^19 ([npm](https://registry.npmjs.org/@novu/react/latest)) | `appearance` prop: base theme, variables, per-element styles (style objects, Tailwind or CSS Modules), icons, animations ([styling](https://docs.novu.co/platform/inbox/configuration/styling)); `renderNotification`, `renderBell` and other render props ([SDK](https://docs.novu.co/platform/sdks/react)); headless hooks ([headless](https://docs.novu.co/platform/inbox/headless-mode)) |
| Courier | `@trycourier/courier-react`, peer React >=18; the v7 packages `@trycourier/react-inbox` etc. are deprecated ([docs](https://www.courier.com/docs/sdk-libraries/courier-react-web), [migration](https://www.courier.com/docs/sdk-libraries/courier-react-v8-migration-guide)) | Light/dark theme objects ([customize](https://www.courier.com/docs/in-app/customize-the-inbox)); render slots for header, list item, empty/loading/error states; headless `useCourier()` ([custom inbox](https://www.courier.com/docs/in-app/build-a-custom-inbox)); plain CSS/class overrides unconfirmed |
| MagicBell | `@magicbell/react` (`Inbox`, `FloatingInbox`, `Provider`); `@magicbell/magicbell-react` and `@magicbell/react-headless` are deprecated per their READMEs ([npm](https://registry.npmjs.org/@magicbell/magicbell-react)); React 19 support unconfirmed (no React peer dependency declared) | Prebuilt CSS, CSS variables, fixed class names, `ItemComponent`/`InboxComponent` overrides ([docs](https://www.magicbell.com/docs/libraries/magicbell-react)); headless React hooks unconfirmed (the headless package is deprecated) |
| SuprSend | `@suprsend/react`; `@suprsend/react-inbox` is discontinued ([migration](https://docs.suprsend.com/docs/react-migration-guide)) | `theme` object, light/dark, custom components for notification, bell, badge, header, empty state ([customising](https://docs.suprsend.com/docs/react-customising-feed)); headless hooks `useFeedData`, `useFeed` ([headless](https://docs.suprsend.com/docs/react-sdk-headless-feed)) |

## Recipient identity and inbox authentication

| | How the app identifies a recipient | How the inbox proves who is viewing |
|---|---|---|
| Knock | Own user id as `id` (immutable), upsert via `PUT /v1/users/{id}` or inline in a workflow trigger ([users](https://docs.knock.app/concepts/users)) | With enhanced security mode on: JWT signed RS256 with a dashboard signing key, `sub` = user id, passed as `userToken` ([security](https://docs.knock.app/in-app-ui/security-and-authentication)) |
| Novu | `subscriberId` (recommended: own user id), upserted on every trigger ([subscribers](https://docs.novu.co/platform/concepts/subscribers)) | HMAC-SHA256 of `subscriberId` with the environment's secret key, passed as `subscriberHash`, enforced once HMAC is enabled ([production](https://docs.novu.co/platform/inbox/prepare-for-production#secure-your-inbox-with-hmac-encryption)) |
| Courier | Own `user_id` plus a stored profile (email etc.); a send does not create the profile ([users](https://www.courier.com/docs/platform/users/users)) | Backend mints a JWT via `POST /auth/issue-token` with the API key, scoped to `user_id:<id>`; no expiry unless `expires_in` is set; the client key alone no longer authenticates ([auth](https://www.courier.com/docs/platform/inbox/authentication)) |
| MagicBell | `external_id` (recommended, immutable) or email; users are upserted ([user](https://www.magicbell.com/docs/primitive/user)) | User JWT signed HS256 with the project secret key, passed as `token` to `Provider` ([auth](https://www.magicbell.com/docs/api/authentication/user)) |
| SuprSend | `distinct_id` ([users](https://docs.suprsend.com/docs/users)) | With enhanced security mode on: ES256 JWT signed with the workspace signing key, `entity_id` = distinct_id, passed as `userToken`, renewable via `refreshUserToken` ([client auth](https://docs.suprsend.com/docs/client-authentication)) |

## Server-rendered React Router app

No vendor documents React Router (framework mode) or Remix SSR, except a Novu Remix quickstart. All of them render the inbox in the browser, so Cadence would mount it client-only. Whether each package imports cleanly during server rendering is unconfirmed until tried in the app.

| | What the vendor's sources say |
|---|---|
| Knock | Quick starts say the file "will need to be a client component"; Next.js example uses `"use client"`; React Router unconfirmed ([quick start](https://docs.knock.app/getting-started/quick-start/nextjs)) |
| Novu | Remix quickstart mounts `<Inbox />` in `app/root.tsx` ([Remix](https://docs.novu.co/platform/quickstart/remix)); the package ships a server build whose components render empty "to fix build errors in SSR" ([source](https://raw.githubusercontent.com/novuhq/novu/next/packages/react/src/server/index.tsx)); React Router 8 unconfirmed |
| Courier | "Courier Inbox and Toast support Next.js but render client-side only" ([docs](https://www.courier.com/docs/sdk-libraries/courier-react-web#nextjs-and-ssr)); React Router unconfirmed |
| MagicBell | Docs say nothing about SSR; the published components start with `"use client"` ([package file](https://unpkg.com/@magicbell/react@1.14.0/dist/esm/context-provider.js)); React Router unconfirmed |
| SuprSend | Next.js named as supported ([JS SDK](https://docs.suprsend.com/docs/integrate-javascript-sdk)); nothing on SSR; React Router unconfirmed |

## Local development and tests without real Notifications

| | What exists |
|---|---|
| Knock | Separate environments with own keys; per-channel sandbox mode (all channels except in-app) renders without sending and does not count toward usage; `settings.sandbox_mode` per trigger ([environments](https://docs.knock.app/concepts/environments), [testing](https://docs.knock.app/send-notifications/testing-workflows)); local emulator or mocking guidance unconfirmed |
| Novu | Development and Production environments with own keys and integrations (Dev runs count toward quota) ([environments](https://docs.novu.co/platform/concepts/environments)); demo email provider sends only to the account owner, 300/mo ([demo](https://docs.novu.co/platform/integrations/demo-integration)); `npx novu dev` only for Novu Framework ([studio](https://docs.novu.co/framework/studio)); test mode or mocking guidance unconfirmed |
| Courier | Production, Test and custom environments with own keys; Test ships a test email provider that delivers only to the signup address; "Test sends are billable" ([environments](https://www.courier.com/docs/platform/workspaces/environments-api-keys)); mock mode unconfirmed |
| MagicBell | Separate projects as staging/production (Builder has 1 project) ([quick start](https://www.magicbell.com/docs/quick-start)); test mode, sandbox or mocking unconfirmed |
| SuprSend | Sandbox, Staging and Production workspaces with own keys ([workspaces](https://docs.suprsend.com/docs/workspaces)); Test Mode in staging blocks or redirects email/SMS/WhatsApp delivery to test users; whether it covers in-app is unconfirmed ([test mode](https://docs.suprsend.com/docs/developer/test-mode)) |

None of the five documents a local emulator for the hosted product or how to mock its SDK in unit tests, so Cadence's own seam (like today's `.outbox/` fallback) stays relevant.

## Unconfirmed, worth checking before the decision

- Knock: which plans will get EU data residency once it ships.
- Novu: the docs disagree on the Inbox prop for the EU API URL (`backendUrl` vs `apiUrl`) ([setup](https://docs.novu.co/platform/inbox/setup-inbox), [production](https://docs.novu.co/platform/inbox/prepare-for-production)).
- Courier: whether plain CSS can restyle the inbox; whether the EU workspace is available to a Business account from day one.
- MagicBell: Postmark via SMTP, EU hosting, React 19 support.
- SuprSend: which plans can pick the EU region; the month-to-month Essentials price; Test Mode for in-app.
- All five: rendering inside React Router 8 framework mode with SSR.
