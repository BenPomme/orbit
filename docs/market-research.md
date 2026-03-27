# Market Research

## Executive Summary

The market is crowded around generic personal finance and weakly served on the specific problem of *household subscription control in continental Europe*. The opportunity is not to build another budgeting app. The opportunity is to become the trusted control plane for recurring household spend across banks, cards, and merchants.

The winning wedge for Spain, France, and nearby markets is:

1. detect recurring charges reliably across fragmented European bank connectivity
2. turn vague spending awareness into concrete actions: pause, cancel, downgrade, negotiate, or switch
3. support households, not only individuals
4. localize merchants, languages, regulations, and bank coverage country by country

## What incumbents do well

| Product | Strength | Limitation for this opportunity |
| --- | --- | --- |
| Emma | Strong subscription tracking, budgeting, bill reminders, and a clear savings proposition. | Primarily UK-centric brand/category memory; not built around shared household workflows. |
| Bankin' | Strong French consumer trust, broad bank aggregation, budgeting, and account visibility. | Product positioning is broader money management, not dedicated subscription operations and cancellation. |
| Fintonic | Local awareness in Spain, credit/insurance and financial visibility. | Not positioned as the best-in-class recurring spend command center for households. |
| Tink / TrueLayer / GoCardless Bank Account Data | Strong open-banking infrastructure. | They enable data access, but not the user-facing subscription experience, merchant intelligence, or cancellation layer. |

## Best Practices

### 1. Lead with money saved, not dashboards

Consumers buy outcomes. The best products foreground recurring spend totals, avoidable waste, upcoming renewals, and actions completed.

Implication: the home screen should answer:

- how much is leaving this household each month in subscriptions
- what changed recently
- what can be saved this week

### 2. Make bank connectivity optional but valuable

Open banking improves discovery, but onboarding must still work without it. Manual entry, email receipt import, and card statement review must exist from day one.

Implication: the product cannot fail if a user refuses bank access or if a local institution is not covered by the provider.

### 3. Separate detection from confirmation

Recurring-spend detection is probabilistic. Good UX asks users to confirm suspected subscriptions, set ownership, and label necessity before automating recommendations.

Implication: every detected merchant should move through a confidence workflow:

- suspected recurring charge
- confirmed subscription
- shared household service or personal service
- action status

### 4. Cancellation must be honest

Open banking generally gives account data access, not universal merchant cancellation rights. The product should offer:

- direct cancellation only where supported
- bank-supported card controls where appropriate
- guided cancellation playbooks everywhere else
- reminders before trial conversion or renewal

Implication: trust will collapse if the UI implies one-tap cancellation where it cannot actually be delivered.

### 5. Recommendations must be explainable

“Better option” advice works only when users can see why it exists:

- duplicate services detected
- unused subscriptions
- cheaper equivalent bundle
- price increase detected
- household overlap across members

Implication: every optimization suggestion needs evidence, expected savings, and action friction.

### 6. Household collaboration is a gap

Most products optimize for one person. Real recurring spend often belongs to couples or families managing shared streaming, telecom, insurance, cloud, and child-related services.

Implication: the product should support:

- multiple adults in one household
- shared and personal subscriptions
- approval workflows for cancellation or switching
- fair split visibility

## Market Whitespace

### Spain

Spain has local budgeting awareness through Fintonic and bank apps, but no obvious consumer winner positioned around subscription command-and-control with strong household features and optimization workflows.

### France

France has stronger PFM incumbents like Bankin', but the positioning is still broad money management. A specialized recurring-spend control product with deep merchant intelligence and household workflows has room to differentiate.

### Wider Europe

There is room for a pan-European product that handles fragmented bank coverage, localization, and country-specific merchant catalogs better than UK-first or US-first subscription products.

## Strategic Opportunities

### Opportunity 1: “Household recurring spend OS”

Build the system of record for all recurring obligations:

- entertainment
- utilities
- telecom
- insurance
- software
- fitness
- education
- app-store subscriptions

Why it matters: users do not think in terms of “budgeting categories”; they think in terms of commitments they are locked into.

### Opportunity 2: “Optimization engine”

Use confirmed merchant data plus household context to drive action:

- detect duplicates
- detect annual-vs-monthly savings opportunities
- suggest plan downgrades
- suggest local substitutes
- flag forgotten trials

Why it matters: a product that saves money is easier to market than a product that only visualizes money.

### Opportunity 3: “Guided cancellation network”

Start with templates, merchant-specific instructions, reminder flows, and evidence capture. Add direct integrations only where they are operationally realistic.

Why it matters: this is one of the strongest emotional jobs-to-be-done and still poorly served in Europe.

### Opportunity 4: “Trust-first monetization”

Primary monetization options:

- paid premium for advanced optimization, alerts, and household collaboration
- affiliate or referral revenue from switching offers, clearly disclosed
- B2B2C distribution through insurers, neobanks, or employee-benefit providers

Why it matters: market trust is fragile. Recommendations must never appear pay-to-play without disclosure.

## Product Risks

- Bank coverage fragmentation by country and institution
- False positives in recurring charge detection
- Regulatory and consent complexity for financial data
- Overpromising cancellation capability
- Thin differentiation if the product drifts into generic PFM

## Sources

- European Commission on open finance: https://finance.ec.europa.eu/publications/open-finance-consultation_en
- Tink recurring transactions product page: https://tink.com/products/recurring-transactions/
- TrueLayer payments and connectivity overview: https://truelayer.com
- GoCardless Bank Account Data: https://gocardless.com/bank-account-data/
- Emma feature pages: https://emma-app.com/features/subscriptions
- Bankin' official site: https://bankin.com
- Fintonic official site: https://www.fintonic.com
- Amazon press release on simpler subscription cancellation expectations: https://www.aboutamazon.eu/news/company-news/amazon-makes-it-easier-for-customers-to-cancel-prime-online

