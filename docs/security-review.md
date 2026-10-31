# Security review

A review of the IAM permissions, secrets handling and login setup. What I
looked at, what I found, and what I did about it. For the full list of
identities and what each can do, see [IAM.md](IAM.md).

## What I checked

1. IAM roles for the Lambda functions
2. Whether any secrets are stored in the code, the repo history or the
   build
3. The Cognito setup: password rules, MFA, token lifetimes
4. The CI/CD deploy role
5. The admin IAM user
6. What's exposed to the public internet

## What I found and fixed

**The Lambdas shared one broad role.** All the functions used one role
that could get, put, update, delete, query and scan all four tables. So
even the public read-only endpoints could have deleted data. I split it
into one role per function, each with only the exact DynamoDB calls that
function makes. I also replaced the AWS-managed logging policy (which can
write logs anywhere in the account) with a permission for each function's
own log group.

**The CI deploy role was missing permissions.** It only covered the
original resources (tables, Lambda, API Gateway and so on). Anything newer,
like the alarms, the EventBridge rule, the SNS topic and the budget, would
have failed to deploy through CI. It only looked fine because I'd deployed
those by hand first, so CI found nothing to change. I rebuilt the policy to
cover everything, scoped to this project's resources, and tested it with
the IAM policy simulator: 21 checks, including that it **can't** edit its
own role or touch unrelated roles and tables. The policy is now kept in
the repo as [`bootstrap/deploy-role-policy.json`](../bootstrap/deploy-role-policy.json)
so it's not a mystery.

**Refresh tokens lasted 30 days and the app never uses them.** The
frontend just asks for a new login when the hour is up. I cut the refresh
token lifetime to 1 day. Nothing changes for users, but a stolen token
would be useful for much less time.

**No browser security headers.** I added AWS's managed security headers
policy to CloudFront (HSTS, no content sniffing, frame protection,
referrer policy). I did **not** add a Content-Security-Policy, because a
bad one breaks the site and I'd want to test it properly first.

## What I checked and found fine

- **Secrets:** I scanned the working tree and the whole git history for AWS
  keys and secret-looking strings. Nothing real. The 8 pattern matches
  were variable names in the login code (`const password = ...`). The only
  tracked env file, `frontend/.env.production`, has public values only
  (the API URL, the Cognito client ID, the region). The AWS account ID is
  deliberately kept out of the repo and lives in a GitHub secret. So
  nothing needs moving to Secrets Manager. If I ever had a real secret I'd
  use Parameter Store (free) before paying $0.40 a month per secret.
- **Cognito basics:** password minimum is 10 characters with upper, lower,
  number and symbol. Self-signup is off. Token revocation is on. "Prevent
  user existence errors" is on, so the login form can't be used to check
  which emails have accounts. Access and ID tokens last 60 minutes.
- **Storage:** the site bucket is fully private and all four tables are
  encrypted at rest (AWS default).
- **Public surface:** the three write routes need a captain token, and the
  API is throttled (50 a second, writes 5 a second). The read routes are
  public by design.

## What I found and did NOT fix

**The admin IAM user is the weakest thing in the account.**
`sports-day-admin` has full `AdministratorAccess` (through a group), one
long-lived access key, and no MFA. If that key leaked, someone would own
the account. I didn't change it because it's what I deploy with, and
swapping it mid-project could lock me out. What I'd do: I already have an
SSO admin login (IAM Identity Center), so I'd use that for everything,
which gives short-lived credentials and MFA, then delete this user's key.

**MFA is optional and can't be switched on.** The Cognito pool offers an
authenticator-app MFA, but the frontend login form doesn't handle the MFA
challenge. So if a captain enrolled, they'd be locked out of the app. To
enforce MFA I'd first have to add that step to the login screen. It's on
the list, not done.

**The CloudFront permission in the deploy role is `*`.** You can't scope
it by ARN before the resource exists. I accepted that and wrote it down.

**No Content-Security-Policy and no WAF.** Covered above and in the
[architecture notes](ARCHITECTURE.md#what-id-do-differently-for-a-real-production-deployment).
