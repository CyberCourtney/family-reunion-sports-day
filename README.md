# The Family Rounders Cup

A serverless web app for a family reunion rounders tournament: four teams
log in as captains, add players, and submit match results; everyone can
see a live league table, match history, and tournament bracket.

**This is a personal AWS portfolio project** — built to demonstrate real,
hands-on cloud experience for a career switch into AWS/cloud roles, not
just certifications. Every piece of infrastructure is code, deployed
through a real CI/CD pipeline, with the actual production incidents hit
along the way documented rather than hidden.

**Live app:** https://d23lzmogmj156y.cloudfront.net/

<p align="center">
  <img src="docs/images/screenshot-home.jpg" alt="Home page — countdown, teams, and tournament bracket" width="260">
  <img src="docs/images/screenshot-results.jpg" alt="Results page — league standings and match history" width="260">
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
        S3F("S3 — private<br/>React build")
        CF --> S3F
    end

    subgraph APIGroup[" API "]
        direction TB
        APIGW("API Gateway<br/>REST")
        Cognito("🔒 Cognito<br/>captain login")
    end

    Lambda("⚡ Lambda ×5<br/>one function per operation")
    DDB[("🗄️ DynamoDB<br/>4 tables")]

    subgraph CICD[" CI/CD — GitHub Actions "]
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

Solid lines are the request path (a browser using the app); dashed lines
are the deploy path (GitHub Actions shipping a change). Fully serverless
— no servers to patch, pay only for what's used, and everything above is
defined as code in [`cloudformation/template.yaml`](cloudformation/template.yaml).

## Want the details?

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the full reference:
  data model, API contract, auth mechanics, security considerations (what's
  enforced and what's deliberately out of scope), and what I'd do
  differently for a real production deployment.
- **[docs/ENGINEERING-LOG.md](docs/ENGINEERING-LOG.md)** — the actual
  build process in the order it happened, including three real production
  incidents hit along the way and how each was root-caused and fixed.

## What's not built yet

A custom domain (needs a registered domain, deferred), player statistics
beyond a headcount, and a multi-year archive — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#whats-not-built-yet) for why.
