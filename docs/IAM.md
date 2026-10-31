# IAM: who can do what, and why

Every identity in the project, what it's allowed to do, and the reason it
gets that much and no more. The exact policies live in
[`cloudformation/template.yaml`](../cloudformation/template.yaml), except
the deploy role and the admin user, which sit outside the stack on purpose
(see [`bootstrap/`](../bootstrap/README.md)).

## The Lambda functions (one role each)

Each function has its own role, and each role can only make the exact
DynamoDB calls that function makes, on the tables it actually uses. They
can also write to their own log group and nothing else.

| Role | Function | Allowed | On |
|---|---|---|---|
| `sports-day-fn-addPlayer-role` | `addPlayer` | `dynamodb:PutItem` | `Players` |
| `sports-day-fn-createTeam-role` | `createTeam` | `dynamodb:PutItem` | `Team` |
| `sports-day-fn-submitMatchScore-role` | `submitMatchScore` | `dynamodb:PutItem` | `Match` |
| `sports-day-fn-getLeagueTable-role` | `getLeagueTable` | `dynamodb:Scan` | `Team`, `Match`, `Players` |
| `sports-day-fn-getMatches-role` | `getMatches` | `dynamodb:Scan` | `Match` |
| `sports-day-fn-getPlayers-role` | `getPlayers` | `dynamodb:Query` | `Players` index `teamId-index` only |

**Why split them:** these used to share one role that could get, put,
update, delete, query and scan all four tables. That meant the public
read endpoints could have deleted data if there was ever a bug or an
injection in them. Now `getMatches` physically can't write anything.

I also swapped the AWS-managed `AWSLambdaBasicExecutionRole` for a log
permission scoped to each function's own log group. The managed one
allows writing logs anywhere in the account.

## The remediation Lambda

`sports-day-remediation-role` can do two things: change the throttling on
the `prod` stage of this one API (`apigateway:PATCH`), and publish to the
alerts SNS topic (`sns:Publish`). It can't read any data. It's separate
from the six above because it needs completely different permissions.

## The GitHub Actions deploy role

`sports-day-github-actions-deploy` is what the CI/CD pipeline assumes. No
long-lived AWS keys are stored in GitHub. It's OIDC federation, and the
trust policy only lets this repo's `main` branch assume it.

- Its permissions are scoped to this project's resources: the one
  CloudFormation stack, the four tables, `sports-day-*` functions, the
  two S3 buckets, this API, the alarms, the rule, the topic and the
  budget. The full policy is in
  [`bootstrap/deploy-role-policy.json`](../bootstrap/deploy-role-policy.json).
- It can create and edit the Lambda roles listed above, but **not itself**.
  If it could edit its own permissions, anyone who got into the pipeline
  could grant themselves anything. I checked this with the IAM policy
  simulator.
- The widest bit is CloudFront (`*`). You can't scope it by ARN until the
  distribution exists, so that one stays broad.

## How I log in (and the old admin IAM user)

I deploy and do one-off setup from my own machine through **IAM Identity
Center (SSO)**. `aws sso login --profile sports-day-sso` opens a browser,
and I get credentials that expire after an hour. No access key sits on my
laptop. The role behind it is `AdministratorAccess`, so it's still a very
powerful login, just a short-lived one.

The old way was an IAM user, `sports-day-admin`, in a group with
`AdministratorAccess`, with one long-lived access key and no MFA. On
31 October 2026 I **deactivated that key** (I confirmed it stopped working
about 20 seconds later). The user and group still exist for now. I'm leaving
the key switched off for a week to make sure nothing breaks, and then I'll
delete the key, the user and the group. See the
[security review](security-review.md) for the reasoning.

## Resource policies (who can call what)

- **API Gateway to Lambda:** each function only accepts invokes from this
  API, on its own route (`SourceArn` is pinned to the method and path).
- **S3 site bucket:** completely private. Only this CloudFront
  distribution can read it (Origin Access Control), not anyone with the
  bucket URL.
- **SNS topic:** `budgets.amazonaws.com` can publish to it, but only for
  this account. CloudWatch alarms publish as same-account principals.
- **EventBridge rule:** it can invoke the remediation function and
  nothing else.

## People (Cognito)

Captains log in through a Cognito user pool. Self-signup is off, so I
create each captain by hand. The three write routes (`POST /players`,
`/teams`, `/matches`) need a valid captain token. The read routes are
public on purpose, because everyone in the family should be able to see
the standings.
