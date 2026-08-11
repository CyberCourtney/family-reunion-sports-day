# Family Reunion Sports Day

A serverless web app for a family reunion rounders tournament: four teams
(green, red, blue, yellow), captains add players and submit match results,
and everyone can see a live league table. Built as a personal AWS
portfolio project — the goal is to demonstrate real, hands-on AWS
experience for a career switch into cloud/AWS roles, not just
certifications.

**Live app:** https://d23lzmogmj156y.cloudfront.net/

The entire stack is defined as code in
[`cloudformation/template.yaml`](cloudformation/template.yaml) — plain
CloudFormation (deliberately not CDK/SAM, to fit ongoing AWS
certification study). See [`cloudformation/README.md`](cloudformation/README.md)
for the deploy workflow.

For the full build log — decisions in order, as they were made — see
[PLAN.md](PLAN.md). This README is the summary.

## Architecture

```
Browser
    |
    v
CloudFront (HTTPS) --- Origin Access Control ---> S3 (private bucket)
    |
    v
API Gateway (REST, eu-west-2)
    |
    v
Lambda (nodejs20.x, one function per operation)
    |
    v
DynamoDB (4 tables, on-demand billing)
```

- **Frontend** — React + TypeScript + Vite (see [`frontend/README.md`](frontend/README.md)),
  built with TanStack Query for `GET /league-table`, `GET /matches`, and
  the two write mutations, Tailwind for the design system, and
  direct-`fetch` Cognito auth (no Amplify). Deliberately **no router** —
  the four screens (Home / Results / Add Player / Log Match) are tabs,
  not deep-linkable pages, so a real router's need for CloudFront
  SPA-fallback config (403/404 → `/index.html`) never came up. The
  homepage is phase-aware — before/during/after the tournament, purely
  date-driven off env vars, since there's no backend concept of
  "tournament state" — showing a countdown + a live tournament bracket
  preview (TBD slots) before the event, the bracket with live results
  plus the standings during, and a champion banner after (`table[0]` off
  the already-sorted league table, no extra endpoint needed). The
  bracket is a deliberate vertical stack, not a literal branching
  diagram with connecting lines — reads far more clearly on a phone.
  Hosted on S3, fronted by CloudFront via
  Origin Access Control (OAC) — the bucket itself has Block Public
  Access fully on and a policy scoped to only this CloudFront
  distribution's ARN, not `Principal: *`. (Two earlier versions existed:
  a single static HTML file with no build step, then briefly served
  straight off the S3 website endpoint with a public-read bucket policy
  — both replaced.) A custom domain is a possible future step, deferred
  since it requires actually owning a registered domain.
- **API** — API Gateway REST API, Lambda proxy integration, one Lambda
  per operation rather than one monolithic handler.
- **Compute** — Lambda, deliberately kept out of a VPC. DynamoDB is
  reached over AWS's public API, not inside a VPC, so putting Lambda in a
  VPC here would only add cold-start/NAT overhead with no security
  benefit. (A more realistic way to demonstrate VPC/networking skills
  would be a private resource like RDS in a private subnet with a
  security group scoped to one specific Lambda — noted for future work,
  not needed by this app's actual shape.)
- **Data** — DynamoDB, on-demand billing (no idle cost — appropriate for
  a low-traffic seasonal app).
- **IAM** — two separate identities, deliberately not sharing scope:
  - `sports-day-admin`, an IAM user with `AdministratorAccess`, used for
    deploying the stack (this repo's author, via the CLI — `aws
    cloudformation deploy`, not console click-ops). Root account access
    keys were deleted once this was working — root should never hold
    day-to-day credentials.
  - `sports-day-lambda-role`, the Lambda execution role (defined in the
    CloudFormation template), scoped to only `AWSLambdaBasicExecutionRole`
    (CloudWatch Logs) plus an inline policy granting read/write on exactly
    the four project tables and their indexes — not account-wide DynamoDB
    access. Least privilege for the thing that's actually internet-facing.
- **Auth** — Amazon Cognito user pool for captains (see below), plus an
  AWS Budget alarm ($5/month, email at 80% actual / 100% forecasted) as a
  cheap independent safety net against unexpected cost.

## Data model (DynamoDB)

| Table | Partition key | GSIs | Notes |
|---|---|---|---|
| `Players` | `playerId` | `teamId-index` | |
| `Team` | `teamId` | — | `teamId` is the fixed color slug (`green`/`red`/`blue`/`yellow`); `name` can be changed later (e.g. once captains pick real team names) by re-submitting `POST /teams` with the same `teamId` — DynamoDB `PutItem` overwrites in place, so no separate "edit" endpoint was needed. |
| `Match` | `matchId` | — | |
| `ScoreEvent` | `eventId` | `matchId-index`, `playerId-index` | Logs each individual scoring moment rather than just a final score, so per-player stats (e.g. home runs) can be computed from raw events instead of being locked into one pre-aggregated number. Not yet used by any Lambda — reserved for a future "log a scoring event" feature. |

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
`GET /league-table` stays public. Captains log in through a form in the
React app, which calls Cognito's `InitiateAuth` API directly over
`fetch` (`USER_PASSWORD_AUTH` flow) — no Amplify or SDK bundle needed.
The resulting ID token is stored in `sessionStorage` and sent as a raw
`Authorization` header (no `Bearer` prefix — that's specifically what
the API Gateway Cognito authorizer expects) on write requests. The Add
Player / Log Match nav items themselves are hidden entirely until
logged in — they're captain-only tasks, not something to dangle in
front of everyone browsing the public league table.

User pool: email as username, MFA optional (TOTP only — SMS MFA was
deliberately left off to avoid per-message SNS cost), admin-created users
only (self-signup disabled, invite-only). New captains are added with:

```
aws cognito-idp admin-create-user --user-pool-id eu-west-2_wUXy4UDEz --username <email> ...
aws cognito-idp admin-set-user-password --user-pool-id eu-west-2_wUXy4UDEz --username <email> --password <temp-password> --permanent
```

## Infrastructure as code

[`cloudformation/template.yaml`](cloudformation/template.yaml) is the
single source of truth for every AWS resource in this project — 35
resources across DynamoDB, IAM, Lambda, API Gateway, Cognito, S3, and
CloudFront. It was written after building everything manually via the
CLI first (see [PLAN.md](PLAN.md) for that process and the reasoning
behind each choice), then the manually-created resources were torn down
and the stack redeployed from scratch via the template — proving it
actually reproduces the environment, rather than just describing it.
Deployed with `aws cloudformation package` + `aws cloudformation deploy`,
no CDK/SAM/Terraform.

## CI/CD

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on
every push to `main` that touches `cloudformation/`, `lambda/`, or
`frontend/`: packages and deploys the CloudFormation stack, forces a
fresh API Gateway stage deployment (see the debugging note below),
builds the React app (`npm ci && npm run build`) and syncs `frontend/dist`
to the site bucket with `--delete` (Vite's JS/CSS filenames are
content-hashed per build, so without `--delete` every past build's
assets would just accumulate in the bucket forever), then invalidates
the CloudFront cache. No manual `aws` commands needed for routine
changes anymore.

Authentication uses **OIDC federation**, not stored AWS credentials: an
IAM OIDC identity provider trusts `token.actions.githubusercontent.com`,
and an IAM role (`sports-day-github-actions-deploy`) trusts that provider
only for this exact repo on the `main` branch (via a `StringLike`
condition on the token's `sub` claim). GitHub exchanges a short-lived
OIDC token for temporary AWS credentials on each run — nothing long-lived
sits in GitHub Secrets. This is the current recommended pattern over
generating an IAM user's access keys and pasting them into CI.

The deploy role's permissions are scoped by resource ARN everywhere that
was practical — the 4 DynamoDB tables, the 4 Lambda functions, the
specific Lambda execution role, the specific CloudFormation stack, and
the two specific S3 buckets. Cognito, CloudFront, and API Gateway
management-plane actions use `Resource: "*"` instead, because those
services either assign resource IDs at creation time (so nothing to scope
to on a from-scratch deploy) or don't support fine-grained resource-level
permissions on their management APIs in the first place.

**Debugging note:** the first two workflow runs both failed with `Not
authorized to perform sts:AssumeRoleWithWebIdentity`, despite the trust
policy, OIDC provider, and workflow all looking correct. Root-caused with
`aws cloudtrail lookup-events --lookup-attributes
AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity` — the
`Username` field on the failed calls showed the *actual* `sub` claim
GitHub was sending included immutable numeric IDs after the owner/repo
name (`repo:OWNER@ownerId/REPO@repoId:ref:...`), not the plain
`repo:OWNER/REPO:ref:...` the trust policy expected. GitHub adds those
IDs whenever an org or repo has ever been renamed, specifically so a
stale trust policy can't be hijacked by renaming a different repo to
match it. Fixed by updating the trust policy to the exact value
CloudTrail showed.

**Second debugging note:** while building the React frontend's real
Add Player flow, every authenticated write request failed in the
browser with a CORS error — `curl` never caught this, since curl
doesn't enforce CORS, so it went undetected through all the earlier
curl-based API verification. Root cause: the API's CORS preflight
response only ever allowlisted `Content-Type` in
`Access-Control-Allow-Headers`, never `Authorization` — a gap left over
from before Cognito auth existed. Fixing the CloudFormation template and
redeploying wasn't enough on its own, either: CloudFormation doesn't
create a fresh `AWS::ApiGateway::Deployment` just because an underlying
`Method`/`Integration` changed, so the stack update succeeded but the
live `prod` stage kept serving the *old* CORS headers until a manual
`aws apigateway create-deployment` forced it to pick up the change.
Fixed for good by adding an `ApiId` output to the template and a step in
`deploy.yml` that forces a fresh stage deployment after every
`cloudformation deploy`, so no future route change can hit this same
silent-staleness bug again.

**Third debugging note:** adding a fifth Lambda (`sports-day-getMatches`)
broke CI with the stack landing in `UPDATE_ROLLBACK_FAILED` — stuck, not
just failed. Cause: the deploy role's IAM policy scoped `lambda:*` to an
exhaustive list of the original 4 function ARNs, written by hand. All the
Lambdas share one zipped `../lambda` directory as their code source, so
adding a new file changed that zip's hash for *every* function using it —
CloudFormation tried to update all 5 functions' code in one changeset,
including the new one, which wasn't in the allowlist. `AccessDenied`
triggered an automatic rollback, which hit the same permission gap
undoing the change, leaving the stack stuck. `aws cloudformation
describe-stack-events` had the exact IAM error in
`ResourceStatusReason`, no guessing needed. Fixed properly — not just
patched — by replacing the 4-ARN allowlist with a wildcard scoped to
the project's naming convention
(`arn:aws:lambda:...:function:sports-day-*`): same effective boundary,
but it survives adding a function without another manual IAM edit.
Recovered the stuck stack with `aws cloudformation
continue-update-rollback` using the admin profile (the CI role's own
permissions were the thing that needed fixing first, so it couldn't fix
itself).

## What's not built yet

See [PLAN.md](PLAN.md#next-steps) for the current list — roughly: a
custom domain (needs a registered domain, deferred), and the rest of
Phase 4 (match history and the tournament bracket are done; player
statistics beyond a headcount, and a multi-year archive, are still
blocked on backend work that doesn't exist yet — there's still no
`GET /players` roster listing, and no season/year dimension in the data
model for an archive).
