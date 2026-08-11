# Family Reunion Sports Day

A serverless web app for a family reunion rounders tournament: four teams
(green, red, blue, yellow), captains add players and submit match results,
and everyone can see a live league table. Built as a personal AWS
portfolio project — the goal is to demonstrate real, hands-on AWS
experience for a career switch into cloud/AWS roles, not just
certifications.

**Live app:** http://family-reunion-sports-day-123456789012.s3-website.eu-west-2.amazonaws.com/

For the full build log — decisions in order, as they were made — see
[PLAN.md](PLAN.md). This README is the summary.

## Architecture

```
Browser (S3 static site)
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
  Hosted on S3 with static website hosting. CloudFront + a custom domain
  is a planned next step (would also move the bucket from public-read to
  CloudFront-only access via Origin Access Control).
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
    building the infrastructure itself (this repo's author, via the CLI).
    Root account access keys were deleted once this was working — root
    should never hold day-to-day credentials.
  - `sports-day-lambda-role`, the Lambda execution role, scoped to only
    `AWSLambdaBasicExecutionRole` (CloudWatch Logs) plus an inline policy
    granting read/write on exactly the four project tables and their
    indexes — not account-wide DynamoDB access. Least privilege for the
    thing that's actually internet-facing.
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

Base URL: `https://9yfy3j62g1.execute-api.eu-west-2.amazonaws.com/prod`

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
aws cognito-idp admin-create-user --user-pool-id eu-west-2_cKMOlcy34 --username <email> ...
aws cognito-idp admin-set-user-password --user-pool-id eu-west-2_cKMOlcy34 --username <email> --password <temp-password> --permanent
```

## What's not built yet

See [PLAN.md](PLAN.md#next-steps) for the current list — roughly:
CloudFront + custom domain, infrastructure as code (CDK/SAM/Terraform)
and CI/CD via GitHub Actions to replace the manual `aws s3 cp` /
`aws lambda update-function-code` deploys used to build this so far, and
a real styling pass on the frontend.
