# CloudFormation

`template.yaml` defines the entire app: DynamoDB, a Lambda role and
function for each of the 6 endpoints, API Gateway (with Cognito auth on
the write routes), the Cognito user pool, the S3 + CloudFront frontend
hosting, the CloudWatch alarms, dashboard and automated remediation, and a
monthly cost Budget. Deployed with plain CloudFormation (no CDK/SAM), one
file, no build tooling beyond the AWS CLI.

## First-time setup

The `family-reunion-sports-day-monthly` Budget alarm was originally
created by hand in the console (see the engineering log), then brought
into this template later. If you're deploying to an account that still
has that manual one, delete it first: `AWS::Budgets::Budget` fails on
create if a budget with the same name already exists:

```bash
aws budgets delete-budget \
  --account-id <your-account-id> \
  --budget-name family-reunion-sports-day-monthly \
  --profile sports-day
```

On a brand-new account, skip this - there's nothing to delete.

CloudFormation needs an S3 bucket to stage the Lambda code artifact
before deploying (this is separate from the frontend's own bucket, which
the template creates itself):

```bash
aws s3api create-bucket \
  --bucket sports-day-cfn-artifacts-<your-account-id> \
  --region eu-west-2 \
  --create-bucket-configuration LocationConstraint=eu-west-2 \
  --profile sports-day
```

## Deploy

**Normally you don't need to do this by hand** — pushing to `main`
triggers [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml),
which runs the same commands below via OIDC-federated AWS credentials
(see the main [README](../README.md#cicd) for how that auth works). The
manual steps here are for the very first deploy, or for debugging.

```bash
cd cloudformation

aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket sports-day-cfn-artifacts-<your-account-id> \
  --output-template-file packaged.yaml \
  --region eu-west-2 --profile sports-day

aws cloudformation deploy \
  --template-file packaged.yaml \
  --s3-bucket sports-day-cfn-artifacts-<your-account-id> \
  --stack-name sports-day \
  --capabilities CAPABILITY_NAMED_IAM \
  --tags project=family-reunion-sports-day \
  --region eu-west-2 --profile sports-day
```

`--s3-bucket` on `deploy` is there because the template is over 51,200
bytes, the most CloudFormation accepts inline. With it, `deploy` uploads
the template to the artifacts bucket and deploys from there. Leave it off
and you get a "template body too large" error.

`package` zips the `lambda/` directory (all 4 functions share one
deployment package — each just has a different `Handler`) and uploads it
to the artifacts bucket, rewriting the template to reference it. `deploy`
then creates or updates the stack. Re-running both commands after
changing a Lambda file or the template itself updates the stack in
place — no teardown needed for routine changes.

Cost and (eventually) operational alerts go through one shared SNS
topic, `AlertsTopic`. On a first deploy, check the notification inbox
for a "AWS Notification - Subscription Confirmation" email and click
confirm. The subscription sits pending, and no alerts arrive, until
that's done.

`packaged.yaml` is generated output (git-ignored) — only `template.yaml`
is the source of truth.

`BudgetNotificationEmail` defaults to my own address, so no override is
needed for this deployment. Deploying this stack elsewhere needs
`--parameter-overrides BudgetNotificationEmail=<your-email>` added to
the `deploy` command above.

## After deploying

```bash
aws cloudformation describe-stacks --stack-name sports-day \
  --region eu-west-2 --profile sports-day --query 'Stacks[0].Outputs'
```

Gives you `ApiBaseUrl`, `CloudFrontDomainName`, `UserPoolId`,
`UserPoolClientId`, and `SiteBucketName`. On a **first deploy** (or after
tearing the stack down and redeploying), `frontend/index.html`'s
`API_BASE` and `COGNITO_CLIENT_ID` constants need updating to match the
new `ApiBaseUrl` / `UserPoolClientId`, and the frontend needs
re-uploading to the new `SiteBucketName`. On an ordinary update to an
existing stack, none of that changes.

To add a captain:

```bash
aws cognito-idp admin-create-user --user-pool-id <UserPoolId> --username <email> \
  --user-attributes Name=email,Value=<email> Name=email_verified,Value=true \
  --message-action SUPPRESS --region eu-west-2 --profile sports-day

aws cognito-idp admin-set-user-password --user-pool-id <UserPoolId> --username <email> \
  --password <temp-password> --permanent --region eu-west-2 --profile sports-day
```

## Notes on what's deliberately not parameterized

- **No `Stage`/environment parameter** — this app only ever runs one
  environment (there's one family reunion a year, not separate
  dev/staging/prod tournaments), so adding that indirection would be
  complexity without a real use.
- **CloudFront uses the managed `CachingOptimized` policy**. It used to
  run `CachingDisabled` while the frontend was actively changing, to
  guarantee every deploy showed up immediately with no stale edge
  copies. Switched once the GitHub Actions workflow started invalidating
  the distribution on every deploy, so staleness is handled by that
  invalidation now, so there's no reason to leave real caching off.
- **`Code: ../lambda`** on each `AWS::Lambda::Function` is a local path,
  not an S3 reference — that's the CloudFormation convention `package`
  looks for and rewrites; it isn't valid syntax once packaged.
