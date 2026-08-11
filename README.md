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

- **Frontend** — a single static HTML file (`frontend/index.html`), no
  build step, styled with [Pico.css](https://picocss.com/) from a CDN.
  Hosted on S3, fronted by CloudFront via Origin Access Control (OAC) —
  the bucket itself has Block Public Access fully on and a policy scoped
  to only this CloudFront distribution's ARN, not `Principal: *`. (An
  earlier version served straight off the S3 website endpoint with a
  public-read bucket policy; that was replaced once CloudFront went in.)
  A custom domain is a possible future step, deferred since it requires
  actually owning a registered domain.
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
| `POST` | `/matches` | `sports-day-submitMatchScore` | |
| `GET` | `/league-table` | `sports-day-getLeagueTable` | Scans `Team` + `Match`, computes played/won/drawn/lost/points/run-difference per team. 2 points for a win, 1 for a draw, 0 for a loss; ties broken by run difference. |

CORS is enabled (`Access-Control-Allow-Origin: *`) so the static frontend
can call the API directly from the browser — each resource has an
`OPTIONS` mock integration handling the preflight request, on top of the
real method.

## Auth

`POST /players`, `POST /teams`, and `POST /matches` require a valid
Cognito ID token (via an API Gateway `COGNITO_USER_POOLS` authorizer);
`GET /league-table` stays public. Captains log in through a form built
into `frontend/index.html`, which calls Cognito's `InitiateAuth` API
directly over `fetch` (`USER_PASSWORD_AUTH` flow) — no Amplify or SDK
bundle needed, keeping the frontend dependency-free. The resulting ID
token is stored in `sessionStorage` and sent as a raw `Authorization`
header (no `Bearer` prefix — that's specifically what the API Gateway
Cognito authorizer expects) on write requests.

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
`frontend/`: it packages and deploys the CloudFormation stack, uploads
`frontend/index.html` to the site bucket, and invalidates the CloudFront
cache. No manual `aws` commands needed for routine changes anymore.

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

## What's not built yet

See [PLAN.md](PLAN.md#next-steps) for the current list — roughly:
a custom domain (needs a registered domain, deferred), and a real
styling pass on the frontend.
