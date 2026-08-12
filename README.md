# The Family Rounders Cup

It started with rain. Halfway through the final of our family rounders
tournament, the sky opened, the paper scoresheet turned to mush, and
nobody could agree what the score actually was. We ended up tracking it
on a phone instead. That worked for one match, but a phone isn't a league
table, a match history, or something four different captains can update
from a soggy field next year.

So this is that, done properly. A serverless web app for the tournament:
four teams log in as captains, add players, and submit match results, and
everyone can see a live league table, match history, and tournament
bracket, from a phone, rain or shine.

**It's also my AWS portfolio project.** I'm switching into cloud/AWS work
and wanted to show real hands-on experience, not just a stack of
certificates. And honestly, the problem shape here is a good excuse for
proper cloud architecture: it has to work on a phone, for people who
aren't technical, one day a year, and it can't cost anything the other
364 days. That's basically why it's serverless with on-demand billing
(paying for a server to sit idle all year for one tournament makes no
sense), and why I used Cognito instead of building my own login system
(four captains needing a simple, secure login is exactly what it's for).
Everything's defined as code and deployed through a real CI/CD pipeline,
and I've kept the actual bugs I hit building this in here too, not just
the polished end result.

**Live app:** https://d23lzmogmj156y.cloudfront.net/

<p align="center">
  <img src="docs/images/screenshot-home.jpg" alt="Home page: countdown, teams, and tournament bracket" width="170">
  <img src="docs/images/screenshot-login.jpg" alt="Captain login" width="170">
  <img src="docs/images/screenshot-add-player.jpg" alt="Add Player form, captain-only" width="170">
  <img src="docs/images/screenshot-log-match.jpg" alt="Log Match form with stepper inputs, captain-only" width="170">
  <img src="docs/images/screenshot-results.jpg" alt="Results page: league standings and match history" width="170">
</p>

## Skills demonstrated

**AWS:** Lambda · API Gateway · DynamoDB · Cognito · S3 · CloudFront ·
IAM (least privilege, OIDC federation) · CloudFormation · CloudTrail ·
Budgets

**Practices:** infrastructure as code, CI/CD, keyless deployment auth (no
long-lived AWS credentials anywhere), scoped IAM over admin-everywhere,
and root-causing real incidents with real tooling instead of guessing.

**Frontend:** React, TypeScript, Vite, TanStack Query, Tailwind CSS.

## Architecture

```mermaid
flowchart LR
    Browser(["🌐 Browser"])

    subgraph Delivery[" Frontend delivery "]
        direction TB
        CF("CloudFront<br/>HTTPS + Origin Access Control")
        S3F("S3 (private)<br/>React build")
        CF --> S3F
    end

    subgraph APIGroup[" API "]
        direction TB
        APIGW("API Gateway<br/>REST")
        Cognito("🔒 Cognito<br/>captain login")
    end

    Lambda("⚡ Lambda ×5<br/>one function per operation")
    DDB[("🗄️ DynamoDB<br/>4 tables")]

    subgraph CICD[" CI/CD - GitHub Actions "]
        direction TB
        GHA("on push to main")
        OIDC{{"IAM role via OIDC<br/>no stored AWS keys"}}
        GHA --> OIDC
    end

    Browser -- HTTPS --> CF
    Browser -- "reads (public)" --> APIGW
    Browser -- "writes (signed in)" --> APIGW
    Browser -. InitiateAuth .-> Cognito
    APIGW -. validates token .-> Cognito
    APIGW --> Lambda --> DDB

    OIDC -. deploys .-> CF
    OIDC -. deploys .-> APIGW
    OIDC -. deploys .-> Lambda

    classDef delivery fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A,stroke-width:1.5px
    classDef api fill:#EDE9FE,stroke:#7C3AED,color:#4C1D95,stroke-width:1.5px
    classDef compute fill:#FFEDD5,stroke:#EA580C,color:#7C2D12,stroke-width:1.5px
    classDef data fill:#D1FAE5,stroke:#059669,color:#064E3B,stroke-width:1.5px
    classDef client fill:#F1F5F9,stroke:#64748B,color:#1E293B,stroke-width:1.5px
    classDef cicd fill:#F3F4F6,stroke:#374151,color:#111827,stroke-width:1.5px,stroke-dasharray: 3 2

    class Browser client
    class CF,S3F delivery
    class APIGW,Cognito api
    class Lambda compute
    class DDB data
    class GHA,OIDC cicd

    style Delivery fill:#EFF6FF,stroke:#BFDBFE,stroke-width:1px
    style APIGroup fill:#F5F3FF,stroke:#DDD6FE,stroke-width:1px
    style CICD fill:#F9FAFB,stroke:#E5E7EB,stroke-width:1px,stroke-dasharray: 2 2
```

Solid lines are what happens when someone uses the app. Dashed lines are
what happens when I push a change and GitHub Actions ships it. It's fully
serverless, so there are no servers to patch and I only pay for what
actually gets used. Everything above is defined as code in
[`cloudformation/template.yaml`](cloudformation/template.yaml).

## Want the details?

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: the full reference.
  Data model, API contract, auth mechanics, security considerations (what's
  enforced and what's deliberately left out), and what I'd do differently
  for a real production deployment.
- **[docs/ENGINEERING-LOG.md](docs/ENGINEERING-LOG.md)**: the actual
  build process, in the order it happened, including three real production
  incidents I hit along the way and how I root-caused and fixed each one.

## What's not built yet

A custom domain (needs a registered domain, so it's on hold), player
statistics beyond a headcount, and a multi-year archive. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#whats-not-built-yet) for why.
