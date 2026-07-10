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

Admin credentials are stored only in Convex environment variables (`ADMIN_USERNAME` and `ADMIN_PASSWORD`). Change them with `npx convex env set` before production launch.

## Backend

The Convex schema includes `menuItems`, `events`, `orders`, and `adminSessions`. The seed is idempotent and can be run with:

```bash
npx convex run seed:run
```

Orders currently record `paid: false` until Stripe is connected. The admin can manually update payment state and move orders through Received, In Progress, Ready, Completed, or Cancelled.

## Production checklist

- Replace the placeholder phone, email and partial Main Street address.
- Replace placeholder social links.
- Change the initial admin password.
- Connect Stripe and update order payment confirmation from a verified webhook.
- Replace starter event dates/content as the live calendar changes.
- Deploy Convex with `npm run convex:deploy`.
- Publish the repository root directly for the public website; no Vite build or `deploy.yml` is required.
- Deploy `admin-portal/dist/` separately after running `npm run admin:build`.
