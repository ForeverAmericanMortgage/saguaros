# Black Plate deployment safety

Production project: `blackout-plate`.
Vercel root directory: `saguaros-license-plate/app`.
Public domain: `https://blackplateaz.com`.

## August 31, 2026 recovery

The August 26, 2026 07:48 Phoenix Git deployment for commit `d878e1c`
removed the Black Plate source through the repository-root `.vercelignore`.
Next.js successfully built only `/404`, and Vercel promoted the deployment.
The prior local ignore-file repair had not been committed, so manual repairs
could be overwritten by a later automatic Git deployment.

Broken deployment: `dpl_5U4K3u7tywgCDReNkmkCtCGFtrZb`.
Recovery used the August 20 working deployment:
`dpl_DHDfDFuBCFxULUX9A6D5TJPYp6gK`.

## Release requirements

- Never exclude `saguaros-license-plate` or its `app` directory as a whole.
  Exclude only generated assets, dependencies, exports, and private files.
- Commit deployment configuration repairs. Local fixes alone do not change
  the Git deployment payload.
- Keep the Vercel project build command set to
  `test -s app/page.tsx && test -s app/layout.tsx && npm run build`.
  This independent source check fails even if the repository ignore rules
  accidentally remove the package and its verification script.
- `npm run build` checks required source files before compilation, then checks
  the generated homepage, production API routes, branding, and order link.
- A `Ready` deployment is not sufficient. Verify the public domain returns
  HTTP 200 with the Blackout Plate homepage and the AZMVDNow order link.
- Treat the analytics portal as a separate project. A portal release must not
  be considered proof that the public Black Plate site is healthy.

## Recovery

Inspect the currently serving deployment and its route output. If a faulty
release replaced the public homepage, validate a previous release and use
Vercel Instant Rollback. Confirm both apex and www domain behavior afterward.
Keep automatic domain assignment paused until the corrected production build
has passed its checks and has been explicitly promoted.

Do not submit a lead, send campaign messages, or place a plate order as a
health check. Read-only checks of the homepage, assets, and form/CTA presence
are sufficient for deployment availability verification.
