# ML Resources — website

A single-page site (Home, Services, Projects, About, Contact) with a
hidden admin panel for editing content, and a contact form wired to
Netlify Forms.

## Deploy to Netlify

### Option A — fastest (drag and drop)
1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page.
3. Netlify gives you a live URL immediately.

This gets the site live and the contact form working right away.
The admin panel will still work, but because drag-and-drop deploys
don't include the Functions folder, content edits are saved only in
your own browser (via localStorage) rather than shown to every
visitor — see Option B for that.

### Option B — full setup, including shared admin edits (recommended)
This uses a Netlify Function + Netlify Blobs so that when you edit
content in the admin panel, every visitor sees the update — not just
your browser.

1. Install the Netlify CLI if you don't have it:
   `npm install -g netlify-cli`
2. From inside this folder, run:
   `npm install`
   `netlify deploy` (follow the prompts to create a new site)
3. Once you're happy with the preview, run:
   `netlify deploy --prod`

Or connect this folder to a GitHub repo and link it in the Netlify
dashboard (New site from Git) — Netlify will detect `netlify.toml`
and deploy the function automatically on every push.

No extra database setup is needed — Netlify Blobs works out of the
box once the function is deployed.

## Image storage

Uploaded photos (project photos, license scans, the logo) are stored via
a second Netlify Function (`netlify/functions/images.mjs`) backed by its
own Netlify Blobs store — separate from the site's text content. This
keeps the content data small and avoids duplicating images into every
save. No extra setup is needed; it deploys automatically alongside the
content function whenever Functions are included (see Option B below).

If you deploy as a static-only site (Option A) without Functions,
uploaded images fall back to being embedded directly in the content —
which still works, just makes saves larger.

## Environment variables

One optional variable, `ADMIN_DEFAULT_PASSCODE`, is supported — see
`.env.example`. Set it so the site never goes live with the public
default passcode (`admin123`):

- **In Netlify:** Site configuration -> Environment variables -> Add a
  variable -> name it `ADMIN_DEFAULT_PASSCODE`, value = whatever you
  want the initial admin passcode to be. Redeploy for it to take
  effect.
- **Locally with `netlify dev`:** copy `.env.example` to `.env` and
  set the value there.

This only sets the *starting* passcode — once you log in and change
it from Admin -> Account, the saved passcode takes over and the
environment variable is no longer used.

No other environment variables are needed. Netlify Blobs and Netlify
Forms both work automatically without any configuration.

## After deploying

- **Admin panel:** click the small "." at the bottom right of the
  footer. Default passcode is `admin123` — change it immediately
  under Admin → Account.
- **Contact form:** submissions will show up under your site's
  Forms tab in the Netlify dashboard, and can be forwarded to your
  email from there (Site configuration → Forms → Form notifications).
- **Background image:** set a real photo URL from Admin → Home →
  Background image. Use a photo you have the rights to use.
- **Custom domain:** add one under Site configuration → Domain
  management once the site is live.

## Important note on the admin passcode

The admin login is a basic deterrent, not real authentication —
there's no user account system behind it. Anyone who inspects the
page or the Netlify Function could potentially read stored content.
If you want a properly secured admin login later (e.g. tied to your
own email/password), that needs real authentication added to the
Function, which is a reasonable next step once the site is live.
