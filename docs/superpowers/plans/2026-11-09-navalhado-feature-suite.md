# Navalhado Cortes Incremental Feature Suite Implementation Plan

> **For agentic workers:** Implement the plan one task at a time. Use the existing shared-worktree coordination rules; do not edit files owned by another active conversation.

**Goal:** Deliver the 11 approved Navalhado improvements in small, compatible backend/frontend increments, then run the available regression checks.

**Architecture:** Keep MongoDB models and Express routes as the source of truth for availability, status transitions, prices, authorization, points, and commission. Keep React responsible for presenting server-validated choices, summaries, and explicit WhatsApp actions; do not report an external WhatsApp message as sent until an operator confirms it.

**Tech Stack:** Node.js, Express, Mongoose, React, Vite, built-in Node test runner where pure logic can be isolated without adding dependencies.

**Spec:** `docs/superpowers/specs/2026-11-09-navalhado-feature-suite-design.md`

## Global Constraints

- Preserve existing documents and APIs with additive defaults and compatibility for legacy status values.
- Use `America/Sao_Paulo` for all appointment dates and availability.
- Validate all client-provided IDs, prices, durations, dates, status changes, and permissions on the backend.
- WhatsApp uses a user-triggered `wa.me` link; mark sent only after explicit operator confirmation.
- Commission is calculated only for finalized appointments; do not invent retroactive snapshots for old appointments.
- Do not add a dependency unless the implementation requires it and the manifest is updated.
- The 18 subsequently queued items are not part of this implementation plan.

## Review Focus

- A canceled or concurrently reserved time must not become available or be double-booked; test a reservation race and the existing unique-index conflict response.
- A service with no professional links remains available to all; once links exist, only linked professionals can reserve it.
- A recurring or all-day block must also be rejected by final booking validation, not only hidden in the public list.
- Repeated status updates to a finalized appointment must not duplicate commission or loyalty points.
- Admin-wide operations and professional self-service must remain correctly scoped, including when admin JWTs have no `profissionalId`.

---

### Task 0: Close Shared-Workspace Handoffs

**Files:**
- No product files; gather handoffs from the existing admin/auth, status, date, and administrative UI conversations.

**Interfaces:**
- Consumes: Current shared working tree and the conversation assignments already recorded in the design.
- Produces: An exact inventory of owned changes, validation results, and remaining gaps before assigning overlapping files.

- [x] Record file ownership and handoff results without reverting or staging other conversations' work.
- [x] Close the original admin, status, date, and UI tasks before assigning their next exclusive scopes.

### Task 1: Unify Service Eligibility and Availability Validation

**Files:**
- Modify: `Back/services/agenda.js`
- Modify: `Back/routes/profissionais.js`
- Modify: `Back/routes/servicos.js`
- Modify: `Back/routes/agendamentos.js`
- Test: `Back/test/agenda.test.js`
- Modify: `Back/package.json` only if a `node --test` script is needed.

**Interfaces:**
- Consumes: Existing `servicoDoProfissional`, `horariosDisponiveis`, `validarAgendamento`, and `/profissionais/:id/horarios-disponiveis`.
- Produces: The same availability and service-link policy for public booking, manual admin booking, and final reservation validation. Services with no professional links remain globally eligible; services with one or more links are limited to those professionals.

- [x] Add tests for global-service fallback, linked-service exclusion, professional overrides, and missing services.
- [x] Implement the backend fallback in `servicoDoProfissional` and expose global services in both professional service-list routes.
- [x] Run `node --test test/agenda.test.js` from `Back`; all four service eligibility tests pass.
- [ ] Finish the end-to-end availability checks for public and manual admin booking after the status/UI handoffs.

### Task 2: Add Professional Public Profile Fields

**Files:**
- Modify: `Back/models/Profissional.js`
- Modify: `Back/routes/profissionais.js`
- Modify: `Back/services/validacoes.js`
- Test: `Back/test/profissionais.test.js`
- Modify: `Front/src/pages/Painel.jsx` and `Front/src/styles.css` (only after the UI conversation hands off ownership)
- Modify: `Front/src/pages/Agendar.jsx`

**Interfaces:**
- Consumes: Existing `foto`, legacy `descricao`/`especialidade`, and per-professional `servicos`.
- Produces: `especialidade` and `bio` (maximum 120 characters) in the admin form and public professional response; preserve `descricao` as the legacy fallback and use a visual photo fallback.

- [x] Confirm legacy-only `descricao` values remain exposed as `especialidade` in the API and both admin/public UI fallbacks.
- [x] Implement server validation for bio length and HTTP(S) photo URLs without credentials.
- [x] Run backend tests for the 120-character limit, URL schemes, credentials, and empty photo.
- [x] Render the photo fallback, specialty, and optional short bio in the public professional-selection step.
- [x] Add profile URL/specialty/bio editing to the admin team form with a visible preview/fallback.
- [x] Build `Front` after admin integration and confirm the public and edit flows remain usable.

### Task 3: Complete Public Appointment Review and Confirmation

**Files:**
- Modify: `Back/models/Appointment.js`
- Modify: `Back/routes/agendamentos.js`
- Modify: `Back/services/agenda.js`
- Modify: `Front/src/pages/Agendar.jsx`

**Interfaces:**
- Consumes: The validated service/professional/date/time selection from Task 1.
- Produces: Optional appointment observation; a pre-submit review with professional, service, price, duration, date/time, customer name/phone, and observation; a success view with the saved appointment summary and a professional WhatsApp action.

- [x] Add validation for observation length and tests for persistence/serialization of absent, present, boundary, and invalid observations (500-character maximum).
- [x] Implement the review and success states using server-returned appointment values.
- [x] Generate an encoded WhatsApp link to the selected professional only when their contact is configured; present a clear unavailable state otherwise.
- [x] Build `Front` and verify the existing public booking path remains usable.

### Task 4: Add Confirmation and Reminder WhatsApp Actions

**Files:**
- Modify: `Back/models/Appointment.js`
- Modify: `Back/routes/agendamentos.js`
- Modify: `Back/services/agenda.js`
- Modify: `Front/src/pages/Painel.jsx` and `Front/src/styles.css` (only with the UI ownership handoff)

**Interfaces:**
- Consumes: Appointment and populated professional/service details.
- Produces: Distinct confirmation/reminder `wa.me` URLs and separate sent timestamps/statuses. A button opening the external link does not itself mark a message sent; the operator confirms the send in the panel.

- [x] Add tests for phone normalization, message URL encoding, and different confirmation/reminder copy.
- [x] Add an authorized endpoint to record an operator-confirmed message type and timestamp.
- [x] Add admin confirmation/reminder actions with visible sent indicators; public success has a customer-authored WhatsApp summary action (Task 3).
- [x] Build `Front` and verify missing phone/configuration is surfaced rather than producing a broken link.

### Task 5: Complete Admin Manual Booking and Appointment History

**Files:**
- Modify: `Back/routes/agendamentos.js`
- Modify: `Back/services/agenda.js`
- Modify: `Front/src/pages/Painel.jsx` and `Front/src/styles.css` (only with the UI ownership handoff)

**Interfaces:**
- Consumes: Task 1's authoritative availability checks.
- Produces: An admin-only manual create flow accepting professional, service, date, currently free time, customer name/phone, and observation; history is derived from the last five finalized appointments for the normalized phone.

- [ ] Add route checks for incomplete input, unauthorized role, and a slot that became occupied after it was listed.
- [x] Load actual available times when the admin selects professional, service, and date.
- [ ] Display the last five finalized visits for the customer phone when creating or viewing an appointment.
- [ ] Verify conflict responses are clear and no appointment is saved on a stale slot.

### Task 6: Add Finalization Snapshots and Commission Balance

**Files:**
- Modify: `Back/models/Appointment.js`
- Modify: `Back/routes/agendamentos.js`
- Modify: `Back/routes/profissional-admin.js`
- Modify: `Back/routes/profissional.js` only if it remains mounted as a separate role-specific API after Task 0.
- Modify: `Front/src/pages/Painel.jsx` and `Front/src/styles.css` (only with the UI ownership handoff)

**Interfaces:**
- Consumes: Finalized appointment transition and the professional's commission percentage.
- Produces: Immutable finalization price/percentage snapshots and scoped totals for finalized services, professional commission, and salon share.

- [ ] Test 0%, 50%, and 100% commission calculations and repeated finalization.
- [ ] Snapshot values only on the first transition to a finalized status; do not backfill old appointments.
- [ ] Return balance fields scoped to the professional or whole-salon admin as authorized.
- [ ] Verify the balance excludes pending, canceled, and no-show appointments and does not include product sales twice.

### Task 7: Add Idempotent Loyalty Points and Redemption

**Files:**
- Create: `Back/models/ClienteFidelidade.js`
- Create: `Back/routes/fidelidade.js`
- Modify: `Back/app.js`
- Modify: `Back/routes/agendamentos.js`
- Modify: `Front/src/pages/Painel.jsx` and `Front/src/styles.css` (only with the UI ownership handoff)

**Interfaces:**
- Consumes: Finalization transitions from Task 6 and normalized customer phones.
- Produces: One point per finalized appointment, a 10-point reward threshold, auditable admin correction/redemption, and no duplicate points for a repeated status update.

- [ ] Test phone normalization, duplicate-finalization idempotency, threshold, and admin-only point adjustment.
- [ ] Add the persistence model and route authorization.
- [ ] Show the customer point balance and allow an admin-confirmed redeem/reset action with a reason.
- [ ] Verify no public route can change another customer's points.

### Task 8: Expand Blocks and Add Waitlist

**Files:**
- Modify: `Back/models/Bloqueio.js`
- Modify: `Back/routes/bloqueios.js`
- Modify: `Back/services/agenda.js`
- Create: `Back/models/ListaEspera.js`
- Create: `Back/routes/lista-espera.js`
- Modify: `Back/app.js`
- Modify: `Front/src/pages/Agendar.jsx`
- Modify: `Front/src/pages/Painel.jsx` and `Front/src/styles.css` (only with the UI ownership handoff)

**Interfaces:**
- Consumes: Task 1's availability and booking validation contract.
- Produces: Specific, interval, all-day, and weekly recurring blocks with optional end date/motive; public waitlist registration and admin list/notify/remove actions.

- [x] Test block date boundaries, recurring weekday matching, interval overlap, and legacy block behavior.
- [x] Make public time listing and final reservation validation use the same expanded block rules.
- [x] Add and validate an optional end date for weekly recurrence while preserving legacy blocks with no end date.
- [ ] Add validated waitlist creation with normalized phone and optional professional preference.
- [ ] Add admin-only waitlist listing/removal and operator-triggered WhatsApp notification with explicit notification confirmation.
- [ ] Verify no available time offers a waitlist entry and a blocked time cannot be booked.

### Task 9: Enforce Password Policy and Add Recovery

**Files:**
- Modify: `Back/models/User.js`
- Modify: `Back/models/Profissional.js`
- Modify: `Back/routes/auth.js`
- Create: `Back/services/recuperacaoSenha.js`
- Modify: `Back/routes/profissionais.js`
- Modify: `Back/app.js`
- Modify: `Front/src/pages/Login.jsx`

**Interfaces:**
- Consumes: Existing bcrypt hashes and JWT login flows.
- Produces: Eight-character minimum for newly set passwords; forced change for legacy `1234`; one-time hashed recovery token with expiry; neutral recovery response; explicit SMTP-unavailable behavior.

- [ ] Test password length, token hashing/expiry/reuse, and generic recovery responses without requiring a live email provider.
- [ ] Implement password change before granting normal panel access when a legacy default is detected.
- [ ] Implement recovery with configured SMTP only; return a clear service-unavailable result when no provider is configured.
- [ ] Verify old hashes remain usable until the required change and no password/token value is returned in API responses.

### Task 10: Integration and Regression Verification

**Files:**
- Review all touched backend and frontend files; no unrelated cleanup.

**Interfaces:**
- Consumes: Completed Tasks 0–9.
- Produces: Verified implementation with no accidental loss of existing shared-worktree changes.

- [ ] Run backend built-in tests and syntax checks for changed routes/models.
- [ ] Run `npm run build` in `Front`.
- [ ] Review the entire diff and compare each changed file with its owning task/handoff.
- [ ] Confirm public, admin, and professional authorization paths; appointment availability; status compatibility; and explicit failure messages.
- [ ] Report any validation that cannot run because a database, SMTP, or external provider is not configured.
