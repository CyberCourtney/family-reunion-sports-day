# Rounders league app — project plan

## What this is
A web app for a family reunion rounders tournament. Four teams (green, red,
blue, yellow), ~7-9 players each, semi-finals then a final. Team captains
enter players, positions, and match results; the app produces a league
table, points, and home run counts, and lets results be shared afterwards.
Built to be reused every year going forward.

## Why it exists
Personal AWS portfolio project for a career switch into cloud/AWS roles.
Purpose is to demonstrate real, practical AWS experience (not just
certifications) via a public GitHub repo with working code and
infrastructure-as-code.

## Architecture
- **Frontend:** static site on Amazon S3, served via CloudFront
- **Auth:** Amazon Cognito (captain login only; league table/results can be public)
- **API:** API Gateway (REST) → AWS Lambda
- **Compute:** Lambda functions, no VPC (not needed — DynamoDB is accessed
  over AWS's public API, not inside a VPC, so keeping Lambda out of a VPC
  avoids cold-start/NAT overhead for no security benefit here)
- **Data:** DynamoDB (see data model below)
- **CI/CD:** GitHub Actions — deploy frontend to S3, deploy Lambda code on push
- **IaC:** infrastructure defined as code (CDK, SAM, or Terraform — TBD)
  rather than click-ops in the console

Note: VPCs were deliberately *not* used to isolate every layer — for a
serverless app like this, that would add complexity without a real security
benefit. A more realistic way to demonstrate VPC/networking skills, if
wanted later, is putting a private resource (e.g. an RDS instance) in a
private subnet with a security group locking down exactly which Lambda can
reach it.

## Data model (DynamoDB)
Four tables:

- **Team** — `teamId` (PK), `name`, `color`
- **Player** — `playerId` (PK), `teamId` (GSI), `name`, `position`
- **Match** — `matchId` (PK), `round`, `teamAId`, `teamBId`, `teamAScore`, `teamBScore`
- **ScoreEvent** — `eventId` (PK), `matchId` (GSI), `playerId` (GSI), `type`, `points`

ScoreEvent logs each individual scoring moment (not just the final score),
so totals like "home runs per player" or "points per match" can be computed
from raw events rather than being locked into one pre-aggregated number.

GSIs (Global Secondary Indexes) are DynamoDB's way of supporting "get all
X for a given Y" queries, since there are no JOINs — e.g. a GSI on
`teamId` in the Player table supports "all players on team X".

## Build order
1. Data model (done — see above)
2. Lambda functions + DynamoDB tables, tested directly (no API Gateway yet)
3. API Gateway wired up to the Lambdas, tested with curl/Postman
4. Static frontend (S3) calling the real API
5. Cognito login for captains, added once the core app works
6. CloudFront + custom domain (polish)
7. Infrastructure as code + GitHub Actions CI/CD, once the manual version works

## Progress so far
- Architecture and data model agreed (above)
- First Lambda function written: `lambda/addPlayer.js` — validates input,
  writes a player item to a `Players` DynamoDB table, returns the created
  player or an error. Not yet deployed/tested against a real table.
- AWS region chosen: `eu-west-2`
- `Players` DynamoDB table created (on-demand billing, PK `playerId`, GSI
  `teamId-index`)
- Project admin IAM user `sports-day-admin` created (group
  `sports-day-admins`, `AdministratorAccess`), configured locally as CLI
  profile `sports-day`. Root account's access keys deleted — root is no
  longer used for this project; use `--profile sports-day` for all AWS CLI
  work going forward.

- IAM role `sports-day-lambda-role` created for Lambda execution: basic
  CloudWatch Logs access (`AWSLambdaBasicExecutionRole`) + inline policy
  scoped to read/write on just the Players/Team/Match/ScoreEvent tables
  (and their GSIs)
- `addPlayer.js` deployed as Lambda function `sports-day-addPlayer`
  (nodejs20.x, eu-west-2) using that role. Tested via CLI invoke: valid
  input writes to the real `Players` table and returns 201 with the
  created player; missing `name` correctly returns 400. Test data cleaned
  up afterwards.

- Remaining tables created: `Team` (PK `teamId`), `Match` (PK `matchId`),
  `ScoreEvent` (PK `eventId`, GSIs `matchId-index` and `playerId-index`).
  All on-demand billing, eu-west-2, all `ACTIVE`.

- League rules agreed: 2 points win / 1 draw / 0 loss; ties broken by run
  difference (runs for − runs against).
- Remaining core Lambdas written and deployed (all nodejs20.x, using
  `sports-day-lambda-role`):
  - `createTeam.js` → `sports-day-createTeam` — validates teamId/name/color,
    writes to `Team`.
  - `submitMatchScore.js` → `sports-day-submitMatchScore` — validates round/
    teamAId/teamBId/scores, generates matchId, writes to `Match`.
  - `getLeagueTable.js` → `sports-day-getLeagueTable` — scans `Team` and
    `Match`, computes played/won/drawn/lost/points/run difference per team,
    sorted by points then run difference.
  - All three tested end-to-end via Lambda invoke against real tables
    (create two test teams, submit a match, confirm league table computed
    correctly: 2/0 points, +5/-5 run difference). Test data cleaned up
    afterwards.

- API Gateway REST API created and deployed (`sports-day-api`, id
  `9yfy3j62g1`, region eu-west-2, stage `prod`). Base URL:
  `https://9yfy3j62g1.execute-api.eu-west-2.amazonaws.com/prod`
  - `POST /players` → `sports-day-addPlayer`
  - `POST /teams` → `sports-day-createTeam`
  - `POST /matches` → `sports-day-submitMatchScore`
  - `GET /league-table` → `sports-day-getLeagueTable`
  - Lambda proxy integration (AWS_PROXY), each function has an
    `apigateway.amazonaws.com` invoke permission scoped to this API's ARN.
  - All 4 routes tested end-to-end with curl over real HTTPS (create two
    teams → add a player → submit a match → league table reflects it
    correctly). Test data cleaned up afterwards.
  - **No auth yet** — all routes are currently public (`authorization-type
    NONE`). Cognito auth for the write routes (players/teams/matches) is
    a planned next step; `GET /league-table` is meant to stay public.

- CORS enabled: all 4 Lambdas return `Access-Control-Allow-Origin: *`, and
  each API Gateway resource (`/players`, `/teams`, `/matches`,
  `/league-table`) has an `OPTIONS` MOCK integration handling preflight.
  Verified with curl (preflight + real request) and from an actual browser.
- `frontend/index.html` built — single static page, no build step, styled
  with Pico.css from a CDN (classless, minimal — functionality first,
  design later per decision above). Sections: League Table (default view,
  refresh button), Add Team, Add Player (team dropdown), Submit Match
  Score (team A/B dropdowns). Team dropdowns are populated by reusing
  `GET /league-table`, so no separate "list teams" endpoint was needed.
  Tested the full flow live in-browser against the real API: add two
  teams → add a player → submit a match → league table updates correctly
  (2/0 points, ±5 run difference). Test data cleaned up afterwards.
  Currently opened directly as a local file (`file://`); not yet deployed
  to S3.

- Real team data created (not test data): 4 teams, `teamId` = color slug
  (`green`/`red`/`blue`/`yellow`), `name` = "<Color> Team" as a placeholder
  until captains are chosen and real names decided. `color` field is
  permanent; `name` can be changed later by resubmitting `POST /teams`
  with the same `teamId` (Put overwrites in place — no separate edit
  endpoint needed).

- Frontend deployed to S3: bucket `family-reunion-sports-day-123456789012`
  (eu-west-2), static website hosting enabled, public-read bucket policy
  (`s3:GetObject` on `*`, all Block Public Access settings off — required
  for a direct S3 website endpoint; will tighten to CloudFront + OAC
  later). Live at:
  `http://family-reunion-sports-day-123456789012.s3-website.eu-west-2.amazonaws.com/`
  Verified working end-to-end from the real hosted origin (not just
  `file://`) — league table correctly loads all 4 real teams via the API.

- AWS Budget alarm created (`family-reunion-sports-day-monthly`, $5/month,
  emails on 80% actual / 100% forecasted spend) — cheap safety net against
  unexpected cost from the public write routes, independent of the auth
  work below.
- "Add Team" removed from the frontend UI — the 4 teams are fixed, no need
  to create more. `createTeam.js` / `POST /teams` kept as-is; it's still
  how a team's `name` gets updated later (same `teamId`, new `name`,
  `PutItem` overwrites in place).
- Cognito auth added for captains:
  - User pool `sports-day-captains` (`eu-west-2_cKMOlcy34`): email as
    username, password policy (min 10 chars, upper/lower/number/symbol),
    MFA optional (TOTP only, no SMS — avoids SNS cost), admin-created
    users only (self-signup disabled — invite-only, reduces public attack
    surface).
  - App client `sports-day-frontend` (`4l7f4gtg0aovgtns71nv1ppejs`):
    public client (no secret), `ALLOW_USER_PASSWORD_AUTH` — lets the
    static frontend call Cognito's `InitiateAuth` directly via `fetch`
    with no SDK/build step, consistent with the rest of the frontend.
  - API Gateway authorizer `sports-day-cognito-authorizer`
    (COGNITO_USER_POOLS) attached to `POST /players`, `/teams`, `/matches`.
    `GET /league-table` deliberately left public.
  - Frontend: login bar (email/password → Cognito `InitiateAuth`), ID
    token stored in `sessionStorage`, sent as a raw `Authorization` header
    (no `Bearer` prefix — that's what the API Gateway Cognito authorizer
    expects) on write requests. Add Player / Submit Match forms are
    hidden behind a "must be logged in" notice until authenticated. 401/
    403 responses clear the session and prompt re-login.
  - One real captain account created (`courtney@cybercourtney.uk`) via
    `admin-create-user` + `admin-set-user-password --permanent`. More
    captains: same two commands with their email.
  - Tested end-to-end: no token → 401; valid token → 201; public route
    unaffected; full login → add player → logout flow verified live in
    browser, against both `file://` and the real S3-hosted site.

- CloudFront + Origin Access Control put in front of S3, replacing the
  direct public S3 website endpoint:
  - Origin Access Control `sports-day-oac` created; CloudFront
    distribution `EYSQG0GZHZ2SK` created targeting the bucket's S3 REST
    endpoint (not the website endpoint), `PriceClass_100`, default cache
    behavior uses the AWS managed **CachingDisabled** policy (deliberate
    — while still actively iterating on the frontend, avoids needing a
    cache invalidation after every manual deploy; revisit once CI/CD
    exists to automate invalidations).
  - Bucket policy replaced: only `cloudfront.amazonaws.com`, scoped by
    `AWS:SourceArn` to this specific distribution — no more `Principal: *`.
  - S3 Block Public Access fully re-enabled (all 4 settings back on).
  - Static website hosting config removed from the bucket entirely (no
    longer needed — CloudFront reaches S3 via its API now, not the
    website endpoint). Confirmed the old website endpoint now 404s.
  - New live URL (HTTPS): `https://d3lxf9ncgfwzho.cloudfront.net/`
  - Verified end-to-end from the new domain: league table loads, login
    works, CORS still fine (API Gateway CORS config is origin-agnostic —
    `Access-Control-Allow-Origin: *` — so the origin change needed no
    API-side updates).
  - Custom domain deliberately not set up yet — would need a registered
    domain (real annual cost) plus a Route 53 hosted zone (~$0.50/month);
    deferred until wanted.

- Entire stack rebuilt under CloudFormation (`cloudformation/template.yaml`
  — plain CloudFormation, not CDK/SAM, chosen deliberately to fit ongoing
  AWS certification study). See `cloudformation/README.md` for the deploy
  workflow.
  - Approach: tore down every manually-created resource from this point
    in the log onward (DynamoDB tables, Lambda functions, the Lambda
    execution role, the API Gateway REST API, the Cognito user pool, the
    CloudFront distribution + OAC, the S3 site bucket) and deployed a
    fresh stack from the template — rather than importing the existing
    resources. Chosen because it actually proves the template works
    end-to-end from nothing, which is the stronger thing to be able to
    say happened, versus resource import (technically fine, but fiddlier
    via CLI and a less commonly-tested skill). Cost of this choice: new
    resource IDs (API URL, CloudFront domain, Cognito pool/client),
    recreating the captain account and the 4 placeholder teams — trivial,
    no real data existed yet.
  - Template covers all 35 resources: 4 DynamoDB tables (with GSIs), the
    scoped Lambda execution role, all 4 Lambda functions (sharing one
    deployment package — `lambda/` — since they're small and dependency-
    free; each just points `Handler` at a different file), the full API
    Gateway setup (4 resources, CORS OPTIONS mocks, the Cognito
    authorizer on the 3 write routes, Lambda invoke permissions,
    deployment + `prod` stage), the Cognito user pool + app client
    (same config as before: email username, optional TOTP MFA, invite-
    only), and S3 + CloudFront with OAC (same lockdown as before: bucket
    policy scoped to the distribution's `AWS:SourceArn`, Block Public
    Access fully on).
  - Deployed via `aws cloudformation package` (zips `lambda/`, uploads to
    a small dedicated artifacts bucket, `sports-day-cfn-artifacts-
    123456789012`) then `aws cloudformation deploy` — stack name
    `sports-day`, `CAPABILITY_NAMED_IAM` (needed since the template names
    the IAM role explicitly rather than letting CloudFormation
    auto-generate a name).
  - New stack outputs: API `https://ecoayq3mq0.execute-api.eu-west-2
    .amazonaws.com/prod`, CloudFront `https://d23lzmogmj156y.cloudfront
    .net/`, site bucket `sports-day-sitebucket-qaduylz8wh7i`. DynamoDB
    table names and Lambda function names were kept identical to before
    (set explicitly in the template) since nothing else forced them to
    change.
  - Re-seeded: captain account (`courtney@cybercourtney.uk`, same
    password) and the 4 real teams. `frontend/index.html`'s `API_BASE`
    and `COGNITO_CLIENT_ID` constants updated to the new values,
    redeployed to the new bucket. Verified end-to-end live in browser
    against the new CloudFront domain: league table, login, all working.

## Next steps
- Once captains are chosen, update each team's `name` (same `teamId`,
  new `name`, via `POST /teams`)
- Custom domain (Route 53 + ACM cert) in front of the CloudFront
  distribution, once a domain is registered
- GitHub Actions CI/CD: on push, package + deploy the CloudFormation
  stack, sync `frontend/index.html` to the site bucket, and invalidate
  CloudFront — would replace the remaining manual steps (`aws s3 cp`
  after every frontend change, `aws cloudformation package && deploy`
  after every backend change)
- Styling pass on the frontend (currently intentionally minimal/unstyled
  beyond Pico.css defaults)
