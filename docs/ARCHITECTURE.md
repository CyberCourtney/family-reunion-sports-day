# Architecture reference

The detailed technical reference for
[The Family Rounders Cup](../README.md) — full data model, API contract,
auth mechanics, and the security/production-readiness reasoning. For the
story of *how* it was built, including the real incidents hit along the
way, see [docs/ENGINEERING-LOG.md](ENGINEERING-LOG.md).

## Frontend

React + TypeScript + Vite (see [`frontend/README.md`](../frontend/README.md)),
built with TanStack Query for `GET /league-table`, `GET /matches`, and the
two write mutations, Tailwind for the design system, and direct-`fetch`
Cognito auth (no Amplify). Deliberately **no router** — the four screens
(Home / Results / Add Player / Log Match) are tabs, not deep-linkable
pages, so a real router's need for CloudFront SPA-fallback config
(403/404 → `/index.html`) never came up; the current tab is instead
mirrored in `window.location.hash` so refresh/back/forward behave
correctly without one.

The homepage is phase-aware — before/during/after the tournament, purely
date-driven off env vars — showing a countdown + tournament bracket
preview (TBD slots) before the event, the bracket with live results plus
standings during, and a champion banner after. The Results page
deliberately derives "is the tournament complete" from the data itself
(has a Final actually been logged?) rather than the date, so it always
reflects reality even if the calendar and the data disagree.

Hosted on S3, fronted by CloudFront via Origin Access Control (OAC) — the
bucket itself has Block Public Access fully on and a policy scoped to
only this CloudFront distribution's ARN, not `Principal: *`.

## Compute

Lambda, deliberately kept out of a VPC. DynamoDB is reached over AWS's
public API, not inside a VPC, so putting Lambda in a VPC here would only
add cold-start/NAT overhead with no security benefit. (A more realistic
way to demonstrate VPC/networking skills would be a private resource
like RDS in a private subnet with a security group scoped to one
specific Lambda — noted as a future exercise, not needed by this app's
actual shape.)

## IAM

Two separate identities, deliberately not sharing scope:

- An admin IAM user, used only for deploying the stack via the CLI
  (`aws cloudformation deploy`, not console click-ops). Root account
  access keys were deleted once this was working — root should never
  hold day-to-day credentials.
- The Lambda execution role, scoped to only `AWSLambdaBasicExecutionRole`
  (CloudWatch Logs) plus an inline policy granting read/write on exactly
  the four project tables and their indexes — not account-wide DynamoDB
  access. Least privilege for the thing that's actually internet-facing.

## Data model (DynamoDB)

| Table | Partition key | GSIs | Notes |
|---|---|---|---|
| `Players` | `playerId` | `teamId-index` | |
| `Team` | `teamId` | — | `teamId` is the fixed color slug (`green`/`red`/`blue`/`yellow`); `name` can be changed later (e.g. once captains pick real team names) by re-submitting `POST /teams` with the same `teamId` — DynamoDB `PutItem` overwrites in place, so no separate "edit" endpoint was needed. |
| `Match` | `matchId` | — | |
| `ScoreEvent` | `eventId` | `matchId-index`, `playerId-index` | Logs each individual scoring moment rather than just a final score, so per-player stats (e.g. home runs) could be computed from raw events instead of being locked into one pre-aggregated number. Not yet used by any Lambda — reserved for a future "log a scoring event" feature. |

GSIs exist because DynamoDB has no JOINs — a GSI on `teamId` is what
makes "all players on team X" a queryable operation instead of a full
table scan.

## API

Base URL: `https://ecoayq3mq0.execute-api.eu-west-2.amazonaws.com/prod`

| Method | Path | Lambda | Notes |
|---|---|---|---|
| `POST` | `/players` | `sports-day-addPlayer` | |
| `POST` | `/teams` | `sports-day-createTeam` | Also how a team's `name` gets updated — same `teamId`, new `name`. |
| `POST` | `/matches` | `sports-day-submitMatchScore` | Takes `teamARuns`/`teamAHomeRuns`/`teamAOuts` (+ the `teamB*` equivalents), not a pre-totalled score — captains log what happened in the match, the Lambda computes `teamAScore`/`teamBScore` server-side (1pt/run, 2pt/home run; outs are a tracked stat only, no scoring effect). `round` must be one of `Semi-Final 1`/`Semi-Final 2`/`Final` — a fixed set, not free text, so the tournament bracket can reliably map a match to a bracket slot. |
| `GET` | `/league-table` | `sports-day-getLeagueTable` | Scans `Team` + `Match` + `Players`, computes played/won/drawn/lost/points/run-difference and `playerCount` per team. 2 points for a win, 1 for a draw, 0 for a loss; ties broken by run difference. |
| `GET` | `/matches` | `sports-day-getMatches` | Scans `Match`, sorted by `submittedAt`. Powers both the Results view and the homepage bracket. |

CORS is enabled (`Access-Control-Allow-Origin: *`) so the static frontend
can call the API directly from the browser — each resource has an
`OPTIONS` mock integration handling the preflight request, on top of the
real method.

## Auth

`POST /players`, `POST /teams`, and `POST /matches` require a valid
Cognito ID token (via an API Gateway `COGNITO_USER_POOLS` authorizer);
`GET /league-table` and `GET /matches` stay public. Captains log in
through a form in the React app, which calls Cognito's `InitiateAuth` API
directly over `fetch` (`USER_PASSWORD_AUTH` flow) — no Amplify or SDK
bundle needed. The resulting ID token is stored in `sessionStorage` and
sent as a raw `Authorization` header (no `Bearer` prefix — that's
specifically what the API Gateway Cognito authorizer expects) on write
requests. The Add Player / Log Match nav items themselves are hidden
entirely until logged in — they're captain-only tasks, not something to
dangle in front of everyone browsing the public league table.

User pool: email as username, MFA optional (TOTP only — SMS MFA was
deliberately left off to avoid per-message SNS cost), admin-created users
only (self-signup disabled, invite-only).

## Security considerations

What's actually enforced:

- **No long-lived AWS credentials anywhere** — CI/CD authenticates via
  OIDC federation (see below), not stored access keys, and the human
  deploy identity is a separate IAM user with root access keys deleted.
- **Least-privilege IAM everywhere it was practical** — the Lambda
  execution role and the CI deploy role are both scoped to exactly the
  resources this project owns (by ARN, or by a stable naming-convention
  wildcard — see the IAM-scoping incident in the engineering log for why
  that distinction mattered in practice), never `AdministratorAccess`.
- **Writes require auth, reads don't** — the three mutating routes sit
  behind a Cognito authorizer; the two read routes are intentionally
  public, matching what a family checking scores actually needs.
- **S3 is not public** — Block Public Access is fully on; CloudFront
  reaches the bucket only via Origin Access Control, with a bucket policy
  scoped to that one distribution's ARN.
- **Server-side input validation** — every Lambda validates its own
  input (required fields, numeric ranges, a fixed `round` enum) rather
  than trusting the client, and match scores are computed server-side
  from raw runs/home-runs rather than accepted as a pre-totalled number.
- **No secrets committed** — the Cognito app client is a public client
  (no client secret to leak) and the account ID is kept out of the
  repository entirely (see CI/CD below), even though it isn't itself a
  credential.

What's deliberately **not** built, and why that's a reasonable call for
a portfolio project rather than an oversight:

- **No WAF or API rate-limiting** in front of API Gateway. For a
  low-traffic family app this is a proportionate trade-off; for anything
  handling real user-facing traffic at scale, this would be a first
  addition (AWS WAF + usage plans/throttling).
- **MFA is optional, not enforced**, for captains. Reasonable for four
  known family members; would be mandatory for any real multi-tenant
  system.
- **Single environment, no staging** — there's one tournament a year, so
  a dev/staging split would be complexity without a real use case here.
- **No automated backup/restore** for DynamoDB beyond what on-demand
  tables provide by default (point-in-time recovery is available but not
  currently enabled) — acceptable risk for reconstructible, low-value
  demo data; would not be for anything with real user data at stake.

## Infrastructure as code

[`cloudformation/template.yaml`](../cloudformation/template.yaml) is the
single source of truth for every AWS resource in this project — 35+
resources across DynamoDB, IAM, Lambda, API Gateway, Cognito, S3, and
CloudFront. It was written after building everything manually via the
CLI first (see the engineering log for that process and the reasoning
behind each choice), then the manually-created resources were torn down
and the stack redeployed from scratch via the template — proving it
actually reproduces the environment, rather than just describing it.
Deployed with `aws cloudformation package` + `aws cloudformation deploy`,
no CDK/SAM/Terraform (a deliberate choice to fit ongoing AWS
certification study, which covers CloudFormation directly).

## CI/CD

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs on
every push to `main` that touches `cloudformation/`, `lambda/`, or
`frontend/`: packages and deploys the CloudFormation stack, forces a
fresh API Gateway stage deployment (CloudFormation doesn't always create
a new deployment just because an underlying route changed — see the
engineering log), builds the React app, syncs it to the site bucket, and
invalidates the CloudFront cache. No manual `aws` commands needed for
routine changes.

Authentication uses **OIDC federation**, not stored AWS credentials: an
IAM OIDC identity provider trusts `token.actions.githubusercontent.com`,
and an IAM role trusts that provider only for this exact repo on the
`main` branch. GitHub exchanges a short-lived OIDC token for temporary
AWS credentials on each run — nothing long-lived sits in GitHub Secrets.
The account ID itself lives in a repo secret rather than in the workflow
file, so it isn't disclosed just by reading a public workflow — though
the OIDC trust policy's repo/branch restriction is what actually gates
who can assume the role, not keeping the ID out of view.

The deploy role's permissions are scoped by resource ARN everywhere that
was practical, and use `Resource: "*"` only for services (Cognito,
CloudFront, API Gateway management-plane actions) that assign resource
IDs at creation time or don't support fine-grained resource-level
permissions in the first place.

**Three real production incidents were hit and fixed building this**,
each root-caused with real diagnostic tooling rather than guessed at:
a CORS/API-Gateway-staleness bug found via browser console + `curl`, a
CloudFormation stack that got stuck in `UPDATE_ROLLBACK_FAILED` from an
IAM scoping gap (diagnosed with `describe-stack-events`), and an OIDC
trust-policy mismatch root-caused via CloudTrail. Full write-ups —
symptoms, root cause, fix, and how each was verified — are in
[docs/ENGINEERING-LOG.md](ENGINEERING-LOG.md).

## What I'd do differently for a real production deployment

This project intentionally scopes some things down for what it actually
is — a low-traffic annual event for four family teams. If this were a
real multi-tenant product instead, the honest list of what would change:

- Add AWS WAF and API Gateway usage plans/throttling in front of the
  public routes.
- Enforce MFA for all write-capable accounts, not just make it available.
- Add a staging environment and a proper promotion pipeline, instead of
  one environment deployed straight from `main`.
- Add CloudWatch alarms on Lambda error rates and API Gateway 5xxs, not
  just a cost-based Budget alarm — cost and correctness are different
  failure modes and need different alarms.
- Enable DynamoDB point-in-time recovery and consider a proper seed/reset
  tooling instead of ad hoc CLI commands for demo/test data.
- Move from CloudFormation to CDK/SAM once the certification-study reason
  for plain CloudFormation stops being the priority — plain CloudFormation
  was a deliberate learning choice here, not a claim that it's the best
  tool for a larger, longer-lived system.

## What's not built yet

Roughly: a custom domain (needs a registered domain, deferred), and the
rest of a planned "Phase 4" — player statistics beyond a headcount, and a
multi-year archive — both blocked on backend work that doesn't exist yet
(there's still no `GET /players` roster listing, and no season/year
dimension in the data model). Match history and the tournament bracket,
which were also part of that phase, are done. See
[docs/ENGINEERING-LOG.md](ENGINEERING-LOG.md#next-steps) for the full
current list.
