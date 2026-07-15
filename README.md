# The Patio

A responsive multi-page website and admin portal for The Patio in Hartford. The public site is standalone HTML, CSS and browser JavaScript. Only the admin portal uses Vite. Convex is the shared backend.

## Local development

Serve the repository root with any static server, or publish it directly with GitHub Pages. The public site has no install or build step.

The workspace is linked to the existing **The Patio** Convex development deployment. To run the backend watcher in a second terminal:

```bash
npm run convex:dev
```

Customer pages:

- `/index.html`
- `/events.html`
- `/menu.html`
- `/contact.html`

Admin portal:

- `/admin-portal/admin.html`

Run the separate Vite admin application with:

```bash
npm install
npm run admin:dev
```

Build only the admin application with `npm run admin:build`.

Build the locally hosted public Convex client with `npm run public:build`. Run the complete bundle and media budget check with:

```bash
npm run perf:check
```

Performance baselines and enforced limits are documented in `PERFORMANCE.md`.

Admin credentials are stored only in Convex environment variables (`ADMIN_USERNAME` and `ADMIN_PASSWORD`). Change them with `npx convex env set` before production launch.

The admin login locks after five consecutive failed attempts and remains locked until it is manually unlocked. Successful login resets the failed-attempt count. To unlock the development deployment from a trusted terminal, run:

```bash
npx convex run adminAuth:unlock
```

For production, select the production deployment when running the command:

```bash
npx convex run adminAuth:unlock --prod
```

`adminAuth:unlock` is an internal Convex mutation and cannot be called by the browser.

## Backend

The Convex schema includes `menuItems`, `events`, `orders`, and `adminSessions`. Public menu, event, and order-board updates use persistent Convex subscriptions. Admin order and event history is paginated. The seed is idempotent and can be run with:

```bash
npx convex run seed:run
```

## Clover Hosted Checkout

`clover:createHostedCheckout` validates menu IDs, availability, add-ons, quantities, and prices inside Convex before creating a short-lived Clover checkout. Convex generates and stores the order idempotency key before the external request. Repeated browser submissions with the same client request ID reuse the stored order and checkout session.

Set these only in the target Convex deployment under **Settings > Environment Variables**; never use `VITE_` prefixes for payment secrets:

```text
CLOVER_MERCHANT_ID
CLOVER_PRIVATE_TOKEN
CLOVER_API_BASE_URL=https://api.clover.com
CLOVER_WEBHOOK_SECRET
PUBLIC_SITE_URL=https://your-public-site.example
```

For sandbox testing, set `CLOVER_API_BASE_URL=https://apisandbox.dev.clover.com` and use sandbox credentials. Configure Clover Hosted Checkout to send payment webhooks to:

```text
https://precious-gecko-619.convex.site/clover/webhook
```

Generate the webhook signing secret in Clover after entering that URL, then store it as `CLOVER_WEBHOOK_SECRET` in Convex. The signed webhook is the source of truth: only an `APPROVED` Clover payment makes an order visible on the public status board and in the admin portal. Webhook retries are idempotent.

## Production checklist

- Replace the placeholder phone, email and partial Main Street address.
- Replace placeholder social links.
- Change the initial admin password.
- Configure the Clover Hosted Checkout webhook and production Convex environment variables.
- Replace starter event dates/content as the live calendar changes.
- Deploy Convex with `npm run convex:deploy`.
- Publish the repository root directly for the public website; no Vite build or `deploy.yml` is required.
- Deploy `admin-portal/dist/` separately after running `npm run admin:build`.
