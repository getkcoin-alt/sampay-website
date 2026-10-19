# SamPay website

Static, multilingual (French at `/`, Kirundi at `/rn/`, English at `/en/`) marketing site for SamPay.

- `src/build.mjs` — page templates and the static site generator
- `src/i18n/{fr,rn,en}.mjs` — all copy
- `static/` — CSS, JS and robots.txt copied as-is

Build: `npm run build` → `dist/`. On Vercel the build command and output directory come from `vercel.json`.
