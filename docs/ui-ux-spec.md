# UI And UX Spec

## Design Direction

The product should feel like a sharp household control console, not a generic bank clone.

### Visual language

- warm neutral base with high-contrast ink
- one strong accent for savings and actions
- editorial typography rather than spreadsheet aesthetics
- dense but calm cards with clear hierarchy

### Tone

- direct
- evidence-led
- never shame the user
- celebrate savings only when they are concrete

## Information Architecture

### Primary navigation

- Home
- Subscriptions
- Optimize
- Calendar
- Household

## Home Screen

### Purpose

Give instant clarity on recurring spend and the next best actions.

### Modules

- monthly recurring total
- subscriptions count
- shared vs personal split
- renewals due soon
- top optimization opportunities
- recently changed services

## Subscriptions Screen

### Purpose

Be the source of truth for all live recurring commitments.

### Required interactions

- search and filter
- confirm or reject detected items
- edit cadence, amount, owner, and category
- change status to active, paused, pending cancellation, or cancelled

## Optimize Screen

### Purpose

Translate data into savings.

### Opportunity card anatomy

- title
- explanation
- evidence
- expected monthly savings
- expected annual savings
- effort level
- CTA

### Opportunity types

- duplicate service
- unused or low-value service
- annual billing discount
- cheaper plan
- local alternative

## Calendar Screen

### Purpose

Reduce “surprise spend.”

### Elements

- renewal timeline
- trial end reminders
- price increase alerts
- scheduled cancellation follow-ups

## Household Screen

### Purpose

Make shared money visible and manageable.

### Elements

- member list
- shared spend total
- personal spend total by member
- ownership changes
- approval-needed actions later

## Key Flows

### Flow 1: First-run onboarding

1. User selects country and language
2. User sees product promise focused on savings and control
3. User chooses manual setup or bank-assisted setup
4. User creates household or solo workspace
5. User lands on a seeded dashboard with empty-state guidance

### Flow 2: Manual add

1. Tap add subscription
2. Enter merchant, amount, cadence, next renewal, owner
3. See immediate impact on recurring total
4. Optionally set reminder

### Flow 3: Bank-assisted review

1. User connects provider
2. App shows detected recurring candidates with confidence
3. User confirms or rejects each item
4. App prompts for owner and necessity
5. Confirmed items appear in inventory and optimization engine

### Flow 4: Optimization action

1. User opens opportunity card
2. App explains why it exists
3. User picks dismiss, snooze, explore, or cancel
4. App records the action and updates estimated savings

### Flow 5: Cancellation support

1. User opens a subscription detail
2. User taps cancel or reduce cost
3. App shows merchant-specific path, reminder timing, and evidence capture
4. User marks the attempt outcome

## UX Rules

- Show whether data is `manual`, `detected`, or `confirmed`.
- Never hide uncertainty; surface confidence and evidence.
- Default to monthly normalized cost for comparison.
- Keep primary CTA singular per screen.
- Use inline education, not long tutorials.

## Accessibility

- color is never the only status signal
- support dynamic type
- maintain clear tap targets
- localize dates, amounts, and decimal separators by country

## Design Tokens For First Prototype

- background: `#f7f3ea`
- surface: `#fffaf2`
- ink: `#18261f`
- accent: `#0f9d7a`
- accent-strong: `#0b6b57`
- warning: `#d97841`
- muted: `#6f7a72`

