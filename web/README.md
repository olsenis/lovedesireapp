# Love Desire — marketing site

Static Astro + Tailwind site. Lives here so app + marketing copy ship in one PR. Deployed as a **separate Vercel project** (root directory: `web`) at `lovedesireapp.com`. The mobile-app Vercel project at repo root is unaffected — Metro's blocklist ignores this folder.

## Dev

```bash
cd web
npm install
npm run dev       # localhost:4321
npm run build     # static site into web/dist/
npm run preview   # preview the built site
```

## Structure

```
web/
├── public/                 static assets (favicon, og-image, screenshots, APK)
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro    <head> + nav + footer
│   ├── components/             reusable UI blocks
│   │   ├── FeatureCard.astro
│   │   ├── Hero.astro
│   │   └── StoreBadge.astro
│   └── pages/                  file-based routing
│       ├── index.astro         /
│       ├── features.astro      /features        (TODO)
│       ├── pricing.astro       /pricing         (TODO)
│       ├── faq.astro           /faq             (TODO)
│       ├── about.astro         /about           (TODO)
│       ├── support.astro       /support         (TODO)
│       ├── android.astro       /android         (TODO)
│       ├── privacy-policy.astro  /privacy-policy  (TODO, port from app/privacy-policy.tsx)
│       └── terms-of-service.astro /terms-of-service (TODO, port from app/terms-of-service.tsx)
├── astro.config.mjs
├── tailwind.config.mjs        Colors + fonts kept in sync with mobile app's constants/
├── tsconfig.json
└── package.json
```

## Brand tokens

Tailwind config mirrors `constants/colors.ts` and `constants/fonts.ts` from the mobile app. If the app's palette changes, update `tailwind.config.mjs` here to match.

- Colors: burgundy `#880E4F`, cream `#FFF8F0`, rose `#F4A7B9`, blush `#FCE4EC`, muted `#9E7B84`, border `#F0D5DC`
- Fonts: Cormorant Garamond SemiBold (headings), Lato (body) — loaded from Google Fonts CDN

## Adding a page

1. Create `src/pages/{slug}.astro`
2. Import `BaseLayout` and wrap content
3. Add a nav link in `BaseLayout.astro` if it's top-level (Features / Pricing / FAQ / About)
4. Add a footer link if it's secondary (Support / Android / Legal)

## Deploy

Vercel project autodetects Astro. Root Directory set to `web`. Custom domain: `lovedesireapp.com` (assign after purchase). Any push to `main` triggers a deploy of both projects (mobile-app dev preview + this marketing site).
