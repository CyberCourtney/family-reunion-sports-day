# Bootstrap resources

Everything in this project is defined in
[`cloudformation/template.yaml`](../cloudformation/template.yaml), except
the handful of things below. They live outside the stack on purpose, and
I did an audit of the whole account to make sure this is the complete
list.

## Why these aren't in the template

They're the things the pipeline itself depends on. If the stack managed
its own deploy role, a bad deploy could break the role and lock the
pipeline out of fixing it. So these get created once, by hand, and the
exact configuration is kept here.

| Resource | What it is | Why it's outside the stack |
|---|---|---|
| OIDC provider `token.actions.githubusercontent.com` | Lets GitHub Actions prove who it is to AWS, so there are no stored AWS keys | The role below depends on it |
| IAM role `sports-day-github-actions-deploy` | What CI/CD assumes to deploy | It does the deploying, so it can't live in what it deploys |
| S3 bucket `sports-day-cfn-artifacts-<account-id>` | Where `package` uploads the Lambda code and the template | CloudFormation needs it before the stack exists |
| IAM user `sports-day-admin` (+ group `sports-day-admins`) | Manual CLI deploys and one-off setup | Needed to create the stack in the first place |
| Cost allocation tag `project` (activated) | Lets the Budget filter by tag | An account-level Billing setting, not a stack resource |
| Cognito users (the captains) | The people allowed to log in | They're data, created with `admin-create-user` |

Nothing else for this project exists outside the stack. I checked every
service the project uses (Lambda, DynamoDB, API Gateway, CloudFront, S3,
Cognito, SNS, CloudWatch, EventBridge, IAM) and everything else is
managed by the stack. The other buckets, roles and users in the account
belong to other projects.

## The deploy role

- [`deploy-role-trust-policy.json`](deploy-role-trust-policy.json): who
  can assume it. Only GitHub Actions, only from this repo's `main`
  branch. The numbers in the `sub` claim are GitHub's permanent IDs for
  the owner and repo (see the note in
  [`deploy.yml`](../.github/workflows/deploy.yml) for why).
- [`deploy-role-policy.json`](deploy-role-policy.json): what it can do.
  Replace `<ACCOUNT_ID>` with the real account ID before applying (I
  keep the real one out of the repo).

To set it up from scratch:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com

aws iam create-role \
  --role-name sports-day-github-actions-deploy \
  --assume-role-policy-document file://deploy-role-trust-policy.json

aws iam put-role-policy \
  --role-name sports-day-github-actions-deploy \
  --policy-name sports-day-deploy-permissions \
  --policy-document file://deploy-role-policy.json
```

(Run those from a copy of the two JSON files with `<ACCOUNT_ID>` already
swapped for the real number.)

Then add the account ID as a repo secret called `AWS_ACCOUNT_ID`.

## When the deploy role needs updating

Whenever the template starts using a new kind of AWS resource. The role is
deliberately narrow, so a new service means a new statement in the policy.
If a CI deploy fails with an `AccessDenied` for something like
`cloudwatch:PutMetricAlarm`, that's what happened. Edit
`deploy-role-policy.json`, apply it with `put-role-policy`, and re-run the
workflow.

## A known gap in the deploy role

The role can create and delete the Lambda roles and change their
permissions, but it can't change a role's trust policy or description
(`iam:UpdateAssumeRolePolicy`, `iam:UpdateRole`). Nothing in the template
does that today, so it hasn't mattered. If a future change edits either,
the CI deploy will fail with an `AccessDenied`. The fix is to add those two
actions to the `LambdaExecutionRoleManagement` statement and re-apply the
policy. I left them out on purpose, since a narrower role is safer than a
convenient one.

The first CI deploy after the role was rebuilt had nothing to change, so
it proved the pipeline works end to end but didn't exercise every new
permission on a real change. The policy simulator checks are what vouch
for those.
