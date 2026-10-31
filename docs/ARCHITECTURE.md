# Architecture reference

This is the detailed technical reference for
[The Family Rounders Cup](../README.md): the full data model, API
contract, auth mechanics, and the security/production-readiness
reasoning. If you want the story of how it was actually built, including
the real incidents I hit along the way, that's in
[docs/ENGINEERING-LOG.md](ENGINEERING-LOG.md).

## Frontend

React + TypeScript + Vite (see [`frontend/README.md`](../frontend/README.md)),
built with TanStack Query for `GET /league-table`, `GET /matches`,
`GET /players`, and the two write mutations, Tailwind for the design
system, and direct-`fetch`
Cognito auth (no Amplify). There's no router on purpose. The four screens
(Home / Results / Add Player / Log Match) are tabs, not deep-linkable
pages, so I never had to deal with a real router's need for CloudFront
SPA-fallback config (403/404 → `/index.html`). The current tab is instead
mirrored in `window.location.hash`, so refresh and back/forward still
work without one.

The homepage is phase-aware: before, during, and after the tournament,
purely date-driven off env vars. It shows a countdown plus a tournament
bracket preview (TBD slots) before the event, the bracket with live
results plus standings during, and a champion banner after. The Results
page works differently on purpose, though. It figures out "is the
tournament complete" from the data itself (has a Final actually been
logged?) instead of the date, so it always reflects reality even if the
calendar and the data disagree.

It's hosted on S3, fronted by CloudFront via Origin Access Control (OAC).
The bucket itself has Block Public Access fully on and a policy scoped to
only this CloudFront distribution's ARN, not `Principal: *`.

## Compute

Lambda, kept out of a VPC on purpose. DynamoDB is reached over AWS's
public API, not inside a VPC, so putting Lambda in a VPC here would just
add cost and complexity for no security benefit. The full reasoning, and
what I give up by not using one, is in [NETWORKING.md](NETWORKING.md). (If I wanted to show
off VPC/networking skills for real, I'd do it with something like RDS in
a private subnet with a security group scoped to one specific Lambda.
Noted as a future exercise, not something this app actually needs.)

## IAM

The full breakdown, with a table of every role, is in
[IAM.md](IAM.md). The short version is that nothing shares permissions:

- My own admin login, through IAM Identity Center (SSO), used for
  deploying the stack by hand from the CLI (`aws cloudformation deploy`,
  not console click-ops). It gives short-lived credentials, with no access
  key stored on my laptop. It replaced an old admin IAM user with a
  long-lived key, which I've switched off. I deleted the root account's
  access keys once this was working too. Root should never hold day-to-day
  credentials. The [security review](security-review.md) has the details.
- A GitHub Actions deploy role, assumed through OIDC (no stored keys),
  scoped to this project's resources and unable to edit itself.
- One execution role per Lambda function, each allowed only the exact
  DynamoDB calls that function makes. The public read endpoints can't
  write anything. Not account-wide DynamoDB access, and not one shared
  role either. Least privilege for the thing that's actually
  internet-facing.
- A separate role for the remediation Lambda, which can change one API
  stage's throttling and publish to one SNS topic.

## Data model (DynamoDB)

| Table | Partition key | GSIs | Notes |
|---|---|---|---|
| `Players` | `playerId` | `teamId-index` | |
| `Team` | `teamId` | | `teamId` is the fixed color slug (`green`/`red`/`blue`/`yellow`). `name` can be changed later (say, once captains pick real team names) by re-submitting `POST /teams` with the same `teamId`. DynamoDB `PutItem` overwrites in place, so there's no separate "edit" endpoint. |
| `Match` | `matchId` | | |
| `ScoreEvent` | `eventId` | `matchId-index`, `playerId-index` | Logs each individual scoring moment instead of just a final score, so per-player stats (home runs, say) could be computed from raw events instead of being locked into one pre-aggregated number. Not used by any Lambda yet. It's there for a future "log a scoring event" feature. |

All four tables have point-in-time recovery switched on, so any of them
can be rolled back to any second in the last 35 days. How to do that, and
a real drill I ran, is in the [restore runbook](dr-runbook.md).

GSIs exist because DynamoDB has no JOINs. A GSI on `teamId` is what makes
"all players on team X" an actual queryable operation instead of a full
table scan.

## API

Base URL: `https://ecoayq3mq0.execute-api.eu-west-2.amazonaws.com/prod`

| Method | Path | Lambda | Notes |
|---|---|---|---|
| `POST` | `/players` | `sports-day-addPlayer` | |
| `POST` | `/teams` | `sports-day-createTeam` | Also how a team's `name` gets updated: same `teamId`, new `name`. |
| `POST` | `/matches` | `sports-day-submitMatchScore` | Takes `teamARuns`/`teamAHomeRuns`/`teamAOuts` (plus the `teamB*` equivalents), not a pre-totalled score. Captains log what happened in the match, and the Lambda computes `teamAScore`/`teamBScore` server-side (1pt/run, 2pt/home run; outs are just a tracked stat, no scoring effect). `round` has to be one of `Semi-Final 1`/`Semi-Final 2`/`Final`, a fixed set rather than free text, so the tournament bracket can reliably map a match to a bracket slot. |
| `GET` | `/league-table` | `sports-day-getLeagueTable` | Scans `Team` + `Match` + `Players`, computes played/won/drawn/lost/points/run-difference and `playerCount` per team. 2 points for a win, 1 for a draw, 0 for a loss, ties broken by run difference. |
| `GET` | `/matches` | `sports-day-getMatches` | Scans `Match`, sorted by `submittedAt`. Powers both the Results view and the homepage bracket. |
| `GET` | `/players?teamId=X` | `sports-day-getPlayers` | Queries the `teamId-index` GSI (not a scan). 400s if `teamId` is missing - there's no "all players" listing, only per-team rosters. Powers the roster sheet opened by tapping a team's colour icon. |

CORS is enabled (`Access-Control-Allow-Origin: *`) so the static frontend
can call the API directly from the browser. Each resource has an
`OPTIONS` mock integration handling the preflight request, on top of the
real method.

## Auth

`POST /players`, `POST /teams`, and `POST /matches` all require a valid
Cognito ID token, via an API Gateway `COGNITO_USER_POOLS` authorizer.
`GET /league-table`, `GET /matches`, and `GET /players` stay public - a
roster is exactly the kind of thing every family member browsing the
site should be able to see, not just captains. Captains log in
through a form in the React app, which calls Cognito's `InitiateAuth` API
directly over `fetch` (`USER_PASSWORD_AUTH` flow), no Amplify or SDK
bundle needed. The resulting ID token gets stored in `sessionStorage` and
sent as a raw `Authorization` header (no `Bearer` prefix, that's just
what the API Gateway Cognito authorizer expects) on write requests. The
Add Player and Log Match nav items are hidden entirely until you're
logged in. They're captain-only tasks, not something to dangle in front
of everyone browsing the public league table.

User pool setup: email as username, MFA optional (TOTP only, I skipped
SMS MFA to avoid per-message SNS cost), admin-created users only
(self-signup disabled, invite-only).

## Security considerations

What's actually enforced:

- **No long-lived AWS credentials anywhere.** CI/CD authenticates via
  OIDC federation (more below), not stored access keys, and the human
  deploy identity is a separate IAM user with root access keys deleted.
- **Least-privilege IAM everywhere it was practical.** The Lambda
  execution role and the CI deploy role are both scoped to exactly the
  resources this project owns, either by ARN or by a stable
  naming-convention wildcard (see the IAM-scoping incident in the
  engineering log for why that distinction actually mattered). Never
  `AdministratorAccess`.
- **Writes require auth, reads don't.** The three mutating routes sit
  behind a Cognito authorizer. The two read routes are public on
  purpose, matching what a family checking scores actually needs.
- **S3 isn't public.** Block Public Access is fully on. CloudFront
  reaches the bucket only via Origin Access Control, with a bucket
  policy scoped to that one distribution's ARN.
- **Server-side input validation.** Every Lambda validates its own
  input (required fields, numeric ranges, a fixed `round` enum) instead
  of trusting the client, and match scores are computed server-side
  from raw runs/home-runs instead of being accepted as a pre-totalled
  number.
- **No secrets committed.** The Cognito app client is a public client
  (no client secret to leak), and the account ID is kept out of the
  repository entirely (see CI/CD below), even though it isn't really a
  credential itself.

What's deliberately not built, and why that's a reasonable call for a
portfolio project rather than an oversight:

- **No WAF or API rate-limiting** in front of API Gateway. For a
  low-traffic family app that's a fine trade-off. For anything handling
  real user-facing traffic at scale, it'd be the first thing I'd add
  (AWS WAF plus usage plans/throttling).
- **MFA is optional, not enforced,** for captains. That's fine for four
  known family members. It'd be mandatory for any real multi-tenant
  system.
- **One environment, no staging.** There's one tournament a year, so a
  dev/staging split would just be complexity with no real use case here.
- **No automated backup/restore** for DynamoDB beyond what on-demand
  tables give you by default (point-in-time recovery is available but I
  haven't turned it on). That's an acceptable risk for reconstructible,
  low-value demo data. It wouldn't be for anything with real user data
  on the line.

## Infrastructure as code

[`cloudformation/template.yaml`](../cloudformation/template.yaml) is the
single source of truth for every AWS resource in this project: 35+
resources across DynamoDB, IAM, Lambda, API Gateway, Cognito, S3, and
CloudFront. I wrote it after building everything manually via the CLI
first (see the engineering log for that process and the reasoning behind
each choice), then tore down the manually-created resources and
redeployed the stack from scratch via the template, to actually prove it
reproduces the environment instead of just describing it. Deployed with
`aws cloudformation package` + `aws cloudformation deploy`, no
CDK/SAM/Terraform. That's a deliberate choice to fit ongoing AWS
certification study, which covers CloudFormation directly.

## CI/CD

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs on
every push to `main` that touches `cloudformation/`, `lambda/`, or
`frontend/`. It packages and deploys the CloudFormation stack, forces a
fresh API Gateway stage deployment (CloudFormation doesn't always create
a new deployment just because an underlying route changed, see the
engineering log), builds the React app, syncs it to the site bucket, and
invalidates the CloudFront cache. No manual `aws` commands needed for
routine changes.

Authentication uses **OIDC federation**, not stored AWS credentials. An
IAM OIDC identity provider trusts `token.actions.githubusercontent.com`,
and an IAM role trusts that provider only for this exact repo on the
`main` branch. GitHub exchanges a short-lived OIDC token for temporary
AWS credentials on each run, so nothing long-lived sits in GitHub
Secrets. The account ID itself lives in a repo secret rather than the
workflow file, so it's not just sitting there in a public workflow.
Though really, the OIDC trust policy's repo/branch restriction is what
actually gates who can assume the role, not keeping the ID out of view.

The deploy role's permissions are scoped by resource ARN everywhere that
was practical, and use `Resource: "*"` only for services (Cognito,
CloudFront, API Gateway management-plane actions) that assign resource
IDs at creation time or don't support fine-grained resource-level
permissions in the first place.

**I hit and fixed three real production incidents building this,** each
one root-caused with real diagnostic tooling instead of guessed at: a
CORS/API-Gateway-staleness bug found via the browser console plus `curl`,
a CloudFormation stack that got stuck in `UPDATE_ROLLBACK_FAILED` from an
IAM scoping gap (diagnosed with `describe-stack-events`), and an OIDC
trust-policy mismatch root-caused via CloudTrail. Full write-ups, with
symptoms, root cause, fix, and how I verified each one, are in
[docs/ENGINEERING-LOG.md](ENGINEERING-LOG.md).

## What I'd do differently for a real production deployment

This project scopes some things down on purpose, for what it actually
is: a low-traffic annual event for four family teams. If this were a
real multi-tenant product instead, here's the honest list of what I'd
change:

- Add AWS WAF and API Gateway usage plans/throttling in front of the
  public routes.
- Enforce MFA for all write-capable accounts, not just make it
  available.
- Add a staging environment and a proper promotion pipeline, instead of
  one environment deployed straight from `main`.
- Put WAF with rate-based rules in front of the API. The throttling
  I have is global to the stage, not per person, so one noisy user can
  slow everyone down. The CloudWatch alarms and the traffic-spike
  remediation are built (see the engineering log), but they only cut the
  limit for everybody at once.
- Build proper seed/reset tooling instead of ad hoc CLI commands for
  demo/test data. (Point-in-time recovery is already on, see the
  [restore runbook](dr-runbook.md).)
- Move from CloudFormation to CDK/SAM once the certification-study
  reason for plain CloudFormation stops being the priority. Plain
  CloudFormation was a deliberate learning choice here, not a claim
  that it's the best tool for a larger, longer-lived system.

## What's not built yet

Roughly: a custom domain (needs a registered domain, so it's on hold),
and the rest of a planned "Phase 4": player statistics beyond a
headcount, and a multi-year archive, both blocked on backend work that
doesn't exist yet (there's still no `GET /players` roster listing, and
no season/year dimension in the data model). Match history and the
tournament bracket, which were also part of that phase, are done. See
[docs/ENGINEERING-LOG.md](ENGINEERING-LOG.md#next-steps) for the full
current list.
