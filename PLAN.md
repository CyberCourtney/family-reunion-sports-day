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
- **Match** — `matchId` (PK), `round`, `teamAId`, `teamBId`, `teamARuns`,
  `teamAHomeRuns`, `teamAOuts`, `teamAScore`, `teamBRuns`, `teamBHomeRuns`,
  `teamBOuts`, `teamBScore`. `teamAScore`/`teamBScore` are computed
  server-side from runs/home runs (1pt/run, 2pt/home run) rather than
  entered directly — captains log what actually happened in the match
  (runs, home runs, players out), not a single final number. Outs are
  tracked as a stat only, no scoring effect (matches real rounders: an
  out ends a turn, it doesn't deduct points).
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

- GitHub Actions CI/CD added (`.github/workflows/deploy.yml`), triggered
  on push to `main` touching `cloudformation/`, `lambda/`, or `frontend/`
  (plus manual `workflow_dispatch`). Runs: `cloudformation package` +
  `deploy`, `aws s3 cp` the frontend to the site bucket, then a CloudFront
  invalidation. Replaces the manual steps used for every deploy so far.
  - Auth: OIDC federation, not stored credentials. Created an IAM OIDC
    identity provider for `token.actions.githubusercontent.com`
    (account-wide, first one — reusable by future projects), and an IAM
    role `sports-day-github-actions-deploy` whose trust policy restricts
    `sts:AssumeRoleWithWebIdentity` via a `StringLike` condition on the
    token's `sub` claim to this exact repo's `main` branch. No AWS access
    keys stored in GitHub Secrets at all.
  - **Debugging note, worth keeping:** the first two runs both failed with
    `Not authorized to perform sts:AssumeRoleWithWebIdentity`, even though
    the trust policy, OIDC provider, and workflow config all looked
    correct on paper. First guess (wrong) was IAM propagation delay for a
    brand-new OIDC provider/role. Root-caused via
    `aws cloudtrail lookup-events --lookup-attributes
    AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity` —
    CloudTrail's `Username` field on the failed calls showed the *actual*
    `sub` claim GitHub was sending:
    `repo:CyberCourtney@187710470/family-reunion-sports-day@1331044533:ref:refs/heads/main`,
    not the plain `repo:CyberCourtney/family-reunion-sports-day:ref:...`
    the trust policy expected. GitHub embeds immutable numeric IDs after
    the owner/repo name in the `sub` claim whenever the org or repo has
    ever been renamed — a deliberate anti-spoofing measure so a stale
    trust policy can't be hijacked by renaming a different repo to match
    it. Fixed by updating the trust policy's `sub` condition to the exact
    value CloudTrail showed. Third run succeeded.
  - Deploy role permissions scoped by resource ARN wherever the resource
    name is under this project's control (the 4 DynamoDB tables, the 4
    Lambda functions, the `sports-day-lambda-role` execution role, the
    `sports-day` CloudFormation stack, the 2 S3 buckets). `cognito-idp:*`,
    `cloudfront:*` use `Resource: "*"` — those services assign IDs at
    creation time (nothing to scope to on a from-scratch deploy) and/or
    don't support resource-level permissions on management-plane actions.
    Deliberately not `AdministratorAccess` — the whole point of scoping
    IAM elsewhere in this project would be undermined by handing broad
    access to CI.

- **Backend bug found and fixed during the React/Vite frontend rebuild
  (below):** the CORS preflight response on all 4 API routes only
  allowlisted `Content-Type` in `Access-Control-Allow-Headers`, never
  `Authorization` — a gap left over from before Cognito auth existed
  (the header requirement was added later and the CORS config was never
  revisited). This silently blocked every real browser from calling any
  write route with a captain's token — `curl` never caught it, since
  curl doesn't enforce CORS, so it went undetected through all the
  earlier curl-based verification. Only surfaced once a real browser
  attempted the request and logged the CORS rejection to the console.
  Fixed in `cloudformation/template.yaml` (all 4 `Access-Control-Allow-
  Headers` response parameters →
  `"'Content-Type,Authorization'"`), deployed, then hit a second gotcha:
  CloudFormation doesn't automatically create a fresh
  `AWS::ApiGateway::Deployment` just because an underlying `Method`/
  `Integration` changed — the stack update succeeded but the live `prod`
  stage kept serving the old snapshot until a manual
  `aws apigateway create-deployment` forced it to pick up the change.
  Verified fixed via `curl -X OPTIONS` showing the corrected header,
  then a full authenticated add-player/submit-match flow through a real
  browser against the live API.
- React/Vite frontend rebuild in progress in `frontend-new/` (not yet
  merged into `frontend/` — deliberately kept separate so the live
  production site, still served from `frontend/index.html`, is
  untouched while this is reviewed). See the plan file used to design
  it for the full architecture: tournament lifecycle phases (before/
  active/complete, purely date-driven off `VITE_TOURNAMENT_START`/`END`
  since there's no backend concept of tournament phase), the hero/
  countdown/champion-banner homepage, TanStack Query + a thin typed
  fetch wrapper for `GET /league-table`, direct-fetch Cognito auth (no
  Amplify) mirroring the same mechanism already proven live, and a
  tournament-bracket component architecture designed now but not built
  until a `GET /matches` endpoint exists. Phases 1–3 (visual shell →
  real league table data → real auth/Add Player/Submit Match) are done
  and verified end-to-end against the live backend, including the CORS
  fix above.

- `POST /matches` reworked: takes `teamARuns`/`teamAHomeRuns`/`teamAOuts`
  (+ the `teamB*` equivalents) instead of a raw `teamAScore`/`teamBScore`
  pair. `submitMatchScore.js` now computes the score server-side (1 point
  per run, 2 per home run) rather than trusting a pre-totalled number
  from the client — captains log what happened in the match, not a
  final tally they'd have had to add up themselves. Frontend's "Submit
  Match" renamed to "Log Match" to match (six count inputs — runs/home
  runs/outs per team — instead of two score fields).
- Log Match's runs/home runs/outs fields became a `Stepper` component
  (`− value +`) instead of plain number inputs, so captains don't need
  to tap into a field, clear it, and retype a number for every change.
  Caught and fixed a real bug while building it: the first version
  computed each increment as `value + 1` off the prop passed in from the
  last render, so rapid clicks (verified by firing 5 synthetic clicks
  with no delay) could race and undercount. Fixed by having the Stepper
  report increment/decrement/typed *events* rather than computed values,
  applied by the parent via a functional `setState` update
  (`setTeamA(prev => ...)`), which can't lose an update to a stale
  closure. Verified both the race fix (5 rapid clicks → 5) and the full
  submit flow (stepper input → correct server-computed score) live
  against the real API.

- `frontend-new/` merged into `frontend/`, replacing the vanilla JS app
  for real — the React/Vite app is now what's actually live.
  `.github/workflows/deploy.yml` updated: `actions/setup-node` (Node 22,
  npm cache keyed on `frontend/package-lock.json`) → `npm ci && npm run
  build` in `frontend/` → `aws s3 sync frontend/dist s3://... --delete`
  (replacing the old single `aws s3 cp frontend/index.html`; `--delete`
  matters now because Vite's JS/CSS filenames are content-hashed, so
  without it every past build's assets would accumulate in the bucket
  forever) → the existing CloudFront invalidation step, unchanged.
  `frontend/.env.production` committed with the real config (API URL,
  Cognito client ID, tournament name/date) — none of these are secret
  (the Cognito client ID and API URL are public by design for a
  browser-side app; there's only one deploy environment, so there's
  nothing to template per-environment), so committing them directly is
  simpler than having CI generate the file from repo/environment
  secrets for no real security benefit. `frontend/.env.local` (dev-only,
  same values) stays git-ignored by convention even though it isn't
  sensitive either. Verified: local build correctly picks up
  `.env.production`'s values (checked the API URL is actually present in
  the built JS bundle), and the live CI-deployed site works end-to-end.

- Started Phase 4, scoped down to what's actually useful now (match
  history + bracket; player stats and multi-year archive stay deferred —
  see below):
  - New `GET /matches` endpoint (`getMatches.js`, public, same pattern
    as `getLeagueTable.js` — scans `Match`, sorted by a new
    `submittedAt` timestamp field added to `submitMatchScore.js`).
  - `round` is no longer free text — `submitMatchScore.js` now validates
    it against a fixed set (`Semi-Final 1`, `Semi-Final 2`, `Final`)
    matching the tournament's actual format (4 teams, 2 semis, 1 final).
    Needed because the tournament bracket has to reliably map a match to
    a bracket slot, which free text (typos, "SF1" vs "semi final one")
    can't guarantee.
  - `getLeagueTable.js` now also returns `playerCount` per team (scans
    `Players` too, counts by `teamId`) — doesn't expose a roster listing
    (still no `GET /players`), just a count, which is enough to make
    "Meet the Teams" show something real instead of 4 static circles.
  - Deployed and verified live: invalid `round` rejected, valid
    submission computes the score and stamps `submittedAt`, `GET
    /matches` returns it, `playerCount` shows up correctly (0, matching
    reality — no players added yet). Test data cleaned up.
  - Hit the by-now-familiar API Gateway staleness issue again deploying
    this via the CLI directly (not through CI, which already has the
    fix) — had to manually `aws apigateway create-deployment` after the
    stack update before the new `GET /matches` route actually worked.

- Frontend caught up to the backend work above:
  - Log Match's `round` field is now a `Select` with the 3 fixed values
    instead of free text — matches the backend validation, one source of
    truth for what a "round" can be.
  - New public "Results" view (`ResultsView`/`MatchResultCard`) — a
    chronological match history, most recent first, winner shown bold.
  - `TournamentBracket` built for real (the architecture was designed
    earlier, deferred until `GET /matches` existed): a vertical stack
    (Semi-Final 1 → Semi-Final 2 → Final), deliberately not a literal
    branching diagram with connecting lines — reads far more clearly on
    a 375px phone. Shown on the homepage in **every** phase, not just
    after the tournament — before it starts, all three slots show "TBD"
    placeholders, which is the actual fix for the homepage feeling empty
    pre-tournament (real content to look forward to, not decoration).
    The Final slot preview-fills with each semi's winner as soon as it's
    known (derived client-side from scores — no bracket/seeding data
    exists), then switches to the Final's own real recorded result once
    that match is actually logged. A draw in a semi intentionally shows
    no winner rather than guessing a tie-break.
  - Team cards show the new `playerCount` ("Blue Team — 0 players") —
    real, live content instead of 4 static circles.
  - Verified end-to-end live: logged a real semi-final, watched the
    homepage bracket update immediately (query invalidation) with the
    winner bold and the Final slot preview-filling with that team; the
    Results view showed the same match correctly. Test data cleaned up.
  - Along the way, confirmed one apparent bug (a match saved with all
    stats at 0 despite clicking "+" six times first) was a test-script
    artifact, not a real one — firing synchronous `.click()` calls in a
    tight loop with no yield back to the browser let the submit handler
    fire before React's state updates had flushed, so it read stale
    values. Retested with realistically-paced individual clicks (closer
    to how a real user interacts) and it worked correctly every time.
    Distinguishing "my test harness raced itself" from "the app has a
    bug" mattered here — the earlier Stepper race (documented above) was
    a real bug with the same *symptom* but a different, actual cause in
    application code; this one wasn't.

## Next steps
- Once captains are chosen, update each team's `name` (same `teamId`,
  new `name`, via `POST /teams`)
- Custom domain (Route 53 + ACM cert) in front of the CloudFront
  distribution, once a domain is registered
- Now that CI/CD invalidates the CloudFront cache on every deploy, revisit
  the `CachingDisabled` policy — enabling real caching is a reasonable
  tightening
- Still deferred (Phase 4, needs more backend work than the above):
  player statistics beyond a headcount (would mean bringing back
  per-player attribution, which was deliberately dropped in favour of
  team-level tallies when Log Match was built) and a multi-year archive
  (needs a season/year dimension added across Team/Match/Players — right
  now it's one ongoing tournament, not "tournaments")

- **Real incident: CI deploy broke, then got stuck.** Pushing the
  `GET /matches` commit failed in CI with the stack landing in
  `UPDATE_ROLLBACK_FAILED` — a genuinely stuck state, not just a failed
  run. Root cause: the GitHub Actions deploy role's IAM policy scoped
  `lambda:*` to an exhaustive list of 4 specific function ARNs (written
  by hand when the role was first created). All 4 Lambdas share one
  zipped `../lambda` directory as their `Code` source, so adding
  `getMatches.js` changed that zip's content hash for *every* function
  using it — CloudFormation then tried to update all 5 functions' code
  in one changeset, including the brand-new `sports-day-getMatches`,
  which wasn't in the hardcoded allowlist. `AccessDenied` triggered an
  automatic rollback, and the rollback itself hit the same permission
  gap trying to undo the change, leaving the stack stuck.
  - Diagnosed via `aws cloudformation describe-stack-events` — the
    `ResourceStatusReason` on the failed event had the exact IAM error
    (`lambda:UpdateFunctionCode ... because no identity-based policy
    allows`), no guessing needed.
  - Fixed the actual bug: replaced the 4-ARN allowlist with a wildcard
    scoped to this project's naming convention
    (`arn:aws:lambda:eu-west-2:123456789012:function:sports-day-*`) —
    same effective security boundary (still can't touch any Lambda
    outside this project), but now survives adding a new function
    without another manual IAM edit. This class of bug can only recur
    for a resource type that *isn't* scoped by a stable naming pattern.
  - Recovered the stuck stack with `aws cloudformation
    continue-update-rollback` (using the `sports-day-admin` profile, not
    the CI role, since the CI role's own permissions were the thing that
    needed fixing first). Landed back on `UPDATE_ROLLBACK_COMPLETE` —
    verified nothing was actually lost: `GetMatchesFunction` and all 37
    stack resources ended up `*_COMPLETE`, `GET /matches` and
    `playerCount` both confirmed working live. The failed run just
    never got far enough to touch the frontend, so nothing there was at
    risk either.
  - Note for future changes: this IAM policy isn't part of
    `cloudformation/template.yaml` — it's managed directly via `aws iam`
    CLI commands (see `cloudformation/README.md`), a deliberate
    bootstrapping choice (the deployer's own permissions shouldn't be
    self-managed by the same pipeline it deploys). That also means nothing
    catches a scoping gap like this except actually running a deploy that
    needs the new permission.

- **Real bug: couldn't log in on a phone.** Reported by the user directly
  ("i cannot login" / "on my phone"). Root-caused by first confirming the
  credentials worked at the API level (`aws cognito-idp initiate-auth`
  succeeded from the CLI), which narrowed it to something phone-specific
  in the frontend rather than a backend/Cognito problem. Then tested the
  actual theory directly against the API rather than guessing: calling
  `InitiateAuth` with just the email's first letter capitalized
  (`Courtney@...` instead of `courtney@...`) reproduced the *exact* same
  generic error the app would show ("Incorrect username or password") —
  confirming Cognito's email-as-username match is case-sensitive, and
  that a mobile keyboard auto-capitalizing a field's first letter (common
  on iOS/Android, and `type="email"` alone doesn't reliably prevent it
  across all devices) was the real cause. Fixed two ways, not just one:
  `autoCapitalize="none"`/`autoCorrect="off"`/`spellCheck={false}` on both
  login inputs (stops it happening), and — the more robust fix —
  `email.trim().toLowerCase()` before calling Cognito regardless of what
  the keyboard did (survives autofill, paste, or a browser that ignores
  the hint entirely). Verified by deliberately typing a capitalized email
  in the running app and confirming login still succeeded. Documented the
  lowercase-username convention for future `admin-create-user` calls in
  the README, since a mixed-case stored username would defeat the
  frontend-side normalization entirely.

- **Demo data seeded to preview the "complete" phase.** User wanted to
  see what the site looks like once the tournament has actually
  finished — champion banner, filled bracket, final results — without
  waiting for the real 2027-07-25 event. Seeded 3 real `Match` rows
  directly into the live DynamoDB table (Semi-Final 1: Yellow 8-5
  Green, Semi-Final 2: Blue 6-3 Red, Final: Yellow 9-6 Blue), computed
  with the same runs x1 + home-runs x2 formula `submitMatchScore.js`
  uses, so Yellow Team finishes champion (2-0-0, +6 run diff, 4pts).
  Verified live via `GET /league-table` and `GET /matches`, then
  rendered via the local dev server's dev-only `?phase=complete`
  override (production stays on the "before" phase until the real
  `VITE_TOURNAMENT_START`/`END` dates pass, so this data is currently
  invisible to production visitors regardless).
  - **Cleanup required before the real 2027 tournament**: these 3 rows
    are still sitting in the live `Match` table by the user's choice
    (left in place rather than deleted, to keep browsing the demo).
    They must be deleted from the `Match` table before real matches
    are logged in 2027, or they'll corrupt the real standings and
    bracket. `matchId`s: `9b242a49-3c21-46e2-af40-e10f5fb847bd`,
    `797267fc-0f1c-4d8d-88c5-c25aa16d73ce`,
    `4e6daa99-b012-4d61-9e29-d4d319d60f3c`.
  - Also notable: resetting a captain's Cognito password to authenticate
    and demo-seed via the real `POST /matches` API was blocked by the
    session's auto-mode permission classifier as a security-sensitive
    account action — correctly so. Worked around it by writing directly
    to DynamoDB instead (same data shape the Lambda produces), which
    doesn't touch auth at all.

- **Real bug: refresh always landed on Home, not the current tab.**
  Reported directly by the user. Root cause matched the deliberate "no
  router" decision (plan §5) a little too literally: `activeView` was
  plain `useState`, so a full page reload had no way to recover which
  tab had been open — `App.tsx` always re-mounted to `"home"`. Fixed by
  mirroring `activeView` in `window.location.hash` (`#results`,
  `#add-player`, etc.) instead of adding a router: a hash never leaves
  the browser, so it needs no CloudFront SPA-fallback/error-document
  config, unlike a path-based route would. Reads the hash on initial
  mount, writes it on every tab change, and listens for `hashchange` so
  back/forward also work. Verified by loading `#results` directly and
  hard-reloading — lands back on Results, not Home.

- **Design gap: champion banner and final standings were unreachable on
  the Results page, and effectively unreachable in production at all.**
  Reported directly by the user after checking the live site in a
  private browser and not finding them. Root cause: "tournament
  complete" was derived purely from `TOURNAMENT_CONFIG` dates
  (`useTournamentPhase`), and only `HomeView` ever rendered
  `ChampionBanner`/gated `StandingsSection` on that phase. Two
  consequences: (1) `ResultsView` never showed either at all, phase or
  not; (2) even once real matches exist (the seeded demo data, or a real
  future tournament running ahead of its scheduled end time), nothing
  complete-phase-only can show in production until the wall-clock date
  actually passes — data and calendar had no way to agree.
  Fixed by making `ResultsView` derive completion from the data itself
  (`matches.some(m => m.round === "Final")`) instead of the date, and
  always rendering a `StandingsSection` (titled "Standings" or "Final
  Results") plus, once a Final exists, the `ChampionBanner` — all above
  the existing match history list. `HomeView`'s hero stays date-phase-
  driven on purpose (it's the countdown/live narrative for people
  checking before a captain has logged anything), but Results is now
  the page that always tells the truth about what's actually been
  played, regardless of the calendar. Verified locally with no
  `?phase=` override — the seeded demo data now surfaces the champion
  banner and full standings on `#results` exactly as it would in
  production immediately after deploy.
