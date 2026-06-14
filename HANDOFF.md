# HANDOFF — read this first after a context restart

> Single source of truth for continuing this session. Concise on purpose.
> Deeper history: `REDESIGN_PROGRESS.md`, `docs/GO-LIVE-AUDIT.md`, `docs/RUNBOOK.md`.

## Where things stand (2026-06-14)
Nile Valley Logistics — fuel-haulage TMS. **Production-deployed, near go-live.**

- **Branch:** `claude/plan-truck-system-Mfwm8`. Draft **PR #1** open (`druid20/transport-management-`). Commit + push every unit.
- **Prod:** https://transport-management-ruddy.vercel.app · auto-deploys on push (~2–2.5 min).
- **Screenshot/login:** `omazmz@gmail.com` / `Omar2026` (Playwright; run scripts FROM the repo dir so `playwright` resolves; context needs `ignoreHTTPSErrors:true`).
- **Supabase project id:** `jpfvhfcjduimnjijdang` · **org id (nile-valley):** `73aa3af1-5bd5-42cc-b3a9-b60e67f01f1f`.

### Done & verified
- Full DESIGN.md dark UI redesign (sidebar, KPI cards, Mercury tables, Cmd+K, custom Select+DatePicker, toasts/modals/slide-overs/menu, charts, print).
- **Persistence: 26/32 modules in Postgres** (dual-mode via `IS_DEMO_MODE`; repos in `src/server/repos/*`, actions in `src/server/actions/*`). Only tracker/driver-session/assistant/rbac/reports/calendar stay in-memory by design.
- Security: custom auth (bcrypt, lockout, CSPRNG OTP reset + premium email), RLS + grants revoked from anon/authenticated, unique natural-key constraints.
- Branded **Excel** export engine + **PDF** print letterhead (`src/server/reports/workbook.ts`, `src/components/reports/*`).
- CoA seeded (199 accounts) for nile-valley org. `npm run db:seed-coa` + `db:seed-admin` exist. Runbook + go-live audit written.
- **File uploads — DONE & verified on prod.** Supabase Storage private `documents` bucket (25MB, mime allowlist). `src/server/storage/files.ts` (service-role client), `POST /api/files/upload`, `GET /api/files/[...key]` (auth-proxied, org-isolated → cross-org 404), `<FileUpload>` component (`src/components/ui/file-upload.tsx`). Wired into **trip documents** (+ driver POD scan) and **employee HR-compliance** (`<AddComplianceForm>` modal on the employee page). Verified end-to-end: upload→bucket→download→isolation all pass.
- **Vercel env now set:** DATABASE_URL, SESSION_SECRET, RESEND_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (user added the Supabase 3 on 2026-06-14).

## NEXT — DONE (2026-06-14, commit 250e9b4)
1. ✅ **Leave-request attachments.** `attachmentUrl` threaded through validator → action → repo (Postgres + mock store); `<FileUpload namespace="leave">` on the create form; auth-proxied "View attachment" card on the leave detail page.
2. ✅ **Employee profile photo.** `photoUrl` added to `employeeCreateSchema`; threaded through action → repo; `<FileUpload namespace="employee" accept=image/*>` on the create form. New reusable `src/components/hr/employee-avatar.tsx` (`<EmployeeAvatar>`) renders the photo (or initials fallback) on the employee detail header + roster list.

## THEN — go-live ops (USER must do; needs their accounts)
- `RESEND_FROM` → verified domain (currently may be `onboarding@resend.dev` = only reaches own inbox).
- Supabase PITR backups (Database → Backups). Sentry via Vercel integration (replaces the `// TODO Sentry` in `src/app/global-error.tsx`).
- UAT pass per `docs/RUNBOOK.md` §5.

## Optional later (not blockers)
RBAC schema↔type reconcile (JobDescription `code/level/permissions[]` vs schema `title/grade/...`); reports template registry; wire list rows → slide-over; per-segment loading.tsx skeletons (generic `(app)/loading.tsx` already exists).

## Verify loop (always)
`npx tsc --noEmit` + `npx next lint` → `npm run build` → commit + push → wait ~2.5min → Playwright screenshot/fetch on prod → read result.

## Gotchas (already bitten)
- RSC: server components can't pass functions (incl. Lucide icon components) to client components — pass rendered nodes / strings.
- Storage objects can't be deleted via SQL (`storage.protect_delete`) — use the Storage API (`deleteFile` in files.ts).
- DB writes use the `postgres` owner role (bypasses RLS); org scoping is enforced in app code via `requireOrgId()`.
- Numeric columns round-trip as strings (drizzle) → `Number()` on read, `String()` on write. jsonb arrays need `as unknown as` casts.
- Sandbox can't resolve Supabase DNS for direct `db:*` scripts → apply SQL via the Supabase MCP instead.
- One harmless 35-byte orphan test PDF sits in the `documents` bucket — ignore.
