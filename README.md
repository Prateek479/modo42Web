# Modo42 website

Static marketing site for **Modo42**, the mobile training companion for HYROX athletes. It's plain HTML, CSS and a small JavaScript file. There's no framework, build step, server or database.

| Page | URL | File |
| --- | --- | --- |
| Home | `/` | `index.html` |
| Features | `/features/` | `features/index.html` |
| Coaches | `/coaches/` | `coaches/index.html` |
| Pricing | `/pricing/` | `pricing/index.html` |
| Join the waitlist | `/join-waitlist/` | `join-waitlist/index.html` |
| Not found | any unknown URL | `404.html` |

Other files:

- `styles.css`: all styles. The site is dark-only, to match the app.
- `script.js`: the mobile menu and form validation. Every page works without it.
- `assets/`: the self-hosted fonts, the icon sprite (`icons.svg`), and the favicon, app icons and social image (`og-image.png`).
- `_headers`: Cloudflare Pages security and caching headers.
- `robots.txt` and `sitemap.xml`.

Preview locally from the project root:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening the files directly with `file://` won't work because all paths are root-relative.

---

## 1. Deploy to Cloudflare Pages

1. Push this repository to GitHub or GitLab.
2. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git** and choose this repository.
3. Use these build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/`
4. Click **Save and Deploy**.

Cloudflare serves `/features/` from `features/index.html` and uses `404.html` for unknown URLs. It applies `_headers` automatically.

Alternatively, run `npx wrangler pages deploy . --project-name modo42` from the project root to deploy without Git.

> Because the output directory is the repo root, `README.md` is also publicly reachable at `/README.md`. Move the site into a `public/` folder and set that as the output directory if you'd rather it wasn't.

## 2. Content to supply before launch

Search the code for these markers. Each one is visible on the page or written in a comment, so nothing is published as if it were fact.

| What | Where | Marker |
| --- | --- | --- |
| App Store and Google Play URLs | home CTA band, waitlist page, every footer | `STORE LINK` comment and `data-store-link` |
| Real app screenshots | every phone frame | `SCREENSHOT` comment |
| Plan names, prices, billing period, inclusions, trial terms | `pricing/index.html` | `.tbc` chips and "Working title" badges |
| Verified by coach: review process, turnaround, athlete price, coach terms, start date | `coaches/index.html` | `.tbc` chips |
| Coach qualification requirements | `coaches/index.html` | `.tbc` chip |
| Early-access or founding-member benefits | `join-waitlist/index.html` | `.tbc` chip |
| Privacy policy page and link | both forms | `Privacy policy link` chip |
| Launch date | pricing FAQ ("When does Modo42 launch?") | plain text |

Facts to confirm. These come from the current app code (`trainer-mobile-application`), and the site states them as available:

- Apple Watch and Wear OS companion apps (simulation timer, pause/next/end, sync back to phone)
- Apple Health and Health Connect sync, with per-category sharing and delete
- iPhone and Android as the launch platforms (also in the JSON-LD `operatingSystem`)
- The three MODO formats and their summaries, and up to 64 segments per custom simulation

**Coming soon** features (Verified by coach, adaptive training plans, AI assistant, community) are labelled as planned. When one ships, move its card from the "Coming soon" grid to the main grid on Home and Features, and update the FAQ.

### Replacing a phone placeholder with a screenshot

Replace the `.phone-screen` contents:

```html
<div class="phone-frame"><div class="phone-screen">
  <img src="/assets/images/screens/training.webp" width="1179" height="2556"
       alt="Modo42 Training screen showing the week view and race countdown" loading="lazy">
</div></div>
```

Export screens as WebP at about 600–800px wide (around 60–120 KB each). Use `loading="lazy"` on everything except the home hero. The CSS already crops the image to the frame. Once real images are in, you can remove the dashed border by deleting `border: 1px dashed …` from `.phone-screen`.

### Replacing a store placeholder

Swap the `<span class="store-link" …>` for a link with the official badge artwork:

```html
<a class="store-link" href="https://apps.apple.com/app/idXXXXXXXX">…badge…</a>
```


## 3. Connect the forms

Two forms are not connected yet. Each one has a visible notice saying nothing is sent or stored. If someone submits a valid form, they're told it isn't live yet. **No data leaves the browser today.**

| Form | File | Fields sent |
| --- | --- | --- |
| Waitlist | `join-waitlist/index.html` | `email` |
| Coach interest | `coaches/index.html` | `name`, `email`, `focus`, `experience` (optional), `consent` |

Both also send `source` (`waitlist` or `coach`) and `page`. The hidden `company` field is a bot trap: submissions that fill it are dropped, and it's never sent.

**How it works:** `script.js` validates the fields and then POSTs JSON to the URL in the form's `data-endpoint` attribute, with `Content-Type: application/json`. Any 2xx response shows the success message, set by `data-success` and `data-success-body`. Anything else shows a retry error.

### Steps

1. Choose a service that accepts a JSON POST and returns 2xx. Options:
   - **A Cloudflare Pages Function**, e.g. `functions/api/waitlist.js`, that writes to Cloudflare D1 or KV or forwards to your email tool. This keeps everything on Cloudflare, and the endpoint would be `/api/waitlist`.
   - **A `trainer-be` endpoint**, e.g. `POST /v1/waitlist`. You'd need CORS for the site's domain, rate limiting, and an export/deletion entry in the personal-data registry.
   - **A form service** that accepts JSON, such as Formspree or Basin, or the API of an email tool like Buttondown, Mailchimp or Brevo through a small proxy.
2. Set the endpoint on the form:
   ```html
   <form data-form="waitlist" data-endpoint="/api/waitlist" …>
   ```
3. If the endpoint is on another domain, add its origin to `connect-src` in `_headers`.
4. Delete the `.integration-notice` paragraph from each form, and update the waitlist FAQ answer if needed.
5. Publish a privacy policy and replace the `Privacy policy link` chips with a real link. The coach form collects names and free-text experience, so state how long you keep it.

### Verify submissions

1. Deploy a preview branch on Cloudflare Pages.
2. Submit each form empty (field errors should appear), then with a bad email (format error), then with valid data (success message).
3. Confirm the record arrived in your service, with `source` set correctly and no `company` field.
4. Temporarily point `data-endpoint` at a URL that returns 500 and check that the error state appears.
5. Check the browser console for CSP errors. If `connect-src` is missing your endpoint's origin, the request is blocked.

## 4. Production domain, canonical URLs and sitemap

1. In Cloudflare Pages, go to **Custom domains → Set up a domain**.
2. The site already uses `https://modo42.com/` (apex) in canonical URLs, `og:url`, `og:image`, `twitter:image`, JSON-LD `@id`/`url` values, `sitemap.xml` and `robots.txt`.
3. Redirect `www.modo42.com` to `modo42.com` in Cloudflare (**Rules → Redirect Rules**).
4. Update `<lastmod>` in `sitemap.xml` when page content changes.
5. Submit `https://modo42.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
6. Validate with the [Rich Results Test](https://search.google.com/test/rich-results) and the [Schema.org validator](https://validator.schema.org/). Preview link sharing with the opengraph.xyz or LinkedIn Post Inspector tools.

### Structured data rules

- Every page has `WebSite`, `SoftwareApplication` and `WebPage`. Sub-pages also have `BreadcrumbList`.
- `FAQPage` is only on Home and Pricing, where the questions are visible. **If you edit FAQ text, edit the JSON-LD answer to match word for word.**
- The JSON-LD has no `offers`, prices, ratings or reviews, so `SoftwareApplication` won't produce a rich result yet. Add `offers` only once pricing is confirmed and shown on the page.
- `featureList` (Home and Features) matches the six "available" card titles.

### Content Security Policy

`_headers` allows one inline script, the one-line `document.documentElement.classList.add('js')` in each `<head>`, by its SHA-256 hash. If you change that line, recompute the hash:

```sh
printf "%s" "document.documentElement.classList.add('js')" | openssl dgst -sha256 -binary | base64
```

## 5. Assumptions about the design references

- **One design reference was supplied**, `modo42-promo-pages.pdf` (Home, Features, Coaches, Pricing, Waitlist). The build brief mentioned three; the site follows the one received.
- **Five pages, per the design**, instead of the brief's three. Coaches and Pricing are separate pages.
- **Feature copy follows the app**, not the design mock-up. Features that exist in the app are shown as available. Adaptive plans, the AI assistant (MCP), community/following and shared simulations aren't in the app, so they're marked **Coming soon**. "Verified by coach" is presented as planned, as requested.
- **Prices were removed.** The design's Free and €9.99/month tiers and "founding-member pricing" were replaced with TBC placeholders, and plan names are marked as working titles.
- **The design's promises were softened**, e.g. "in final development", "beta access" and "locked for life". The site says Modo42 is in development and keeps early-access benefits as TBC.
- **Phone screens are labelled placeholders** until real screenshots arrive.
- **Fonts** are Space Grotesk and IBM Plex Mono, the app's design fonts. Both are self-hosted and licensed under the SIL Open Font License. Icons are from Lucide (ISC licence), the set the app uses.
- **Dark only.** The design and the app have no light theme.
- **British English** spelling (practise, centred), to suit the Ireland and India launch markets.
- **Not affiliated with HYROX.** This is stated in the footer and the FAQ.
