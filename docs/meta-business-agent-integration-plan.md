# Meta Business Agent Integration Plan

## Goal

Make Rasphia the commerce operating layer behind Meta-owned conversational channels:

- WhatsApp
- Instagram
- Meta Business Agent

The long-term model is:

- Meta handles conversational entry, lightweight shopping assistance, and channel-native UX
- Rasphia handles deterministic commerce actions, merchant data, checkout, and post-purchase workflows

## Why this shift matters

Meta is clearly pushing businesses toward:

- Business AI / Meta Business Agent
- embedded onboarding
- multi-channel business messaging across WhatsApp and Instagram

Rasphia should adapt by becoming:

- channel-agnostic in core logic
- channel-specific only at the adapter layer
- ready for one-click Meta onboarding via Embedded Signup

## Phase 1: Merchant acquisition and onboarding

### Outcome

A merchant can start from the Rasphia landing page and connect Meta assets with one clear flow.

### Work

1. Add Meta Embedded Signup entry point to the merchant landing page.
2. Capture returned authorization code from Meta.
3. Exchange code server-side for the required business access token.
4. Persist the merchant's connected Meta assets:
   - business portfolio / business account identifier
   - WhatsApp Business Account ID
   - phone number ID
   - Instagram professional account ID when available
5. Automatically subscribe required webhook fields.

### New backend pieces

- `POST /api/meta/embedded-signup/exchange`
- `POST /api/meta/embedded-signup/complete`
- storage for merchant Meta asset mappings and token metadata

## Phase 2: Refactor Rasphia’s messaging core

### Outcome

Business logic is no longer hard-wired to WhatsApp transport.

### Work

Split today’s WhatsApp orchestration into three layers:

1. Channel adapter
   - webhook parsing
   - outbound formatting
   - status events
   - media handling

2. Conversation service
   - session state
   - handoff state
   - role resolution
   - intent routing

3. Commerce tools
   - product search
   - merchant lookup
   - order creation
   - payment link generation
   - order tracking
   - refund / replacement / cancellation flows

### Target modules

- keep transport-specific code in `app/lib/whatsapp.ts`
- move business actions into reusable tool modules
- evolve `app/lib/whatsapp-orchestrator.ts` into a channel-neutral conversation core

## Phase 3: Meta Business Agent readiness

### Outcome

Rasphia can support a Meta-owned agent layer without giving up commerce control.

### Work

1. Define an internal tool contract for the agent:
   - `search_products`
   - `get_merchant_storefront`
   - `create_checkout`
   - `get_order_status`
   - `create_service_request`
   - `handoff_to_human`
2. Ensure every tool is deterministic, permission-aware, and logged.
3. Add audit trails for:
   - AI-originated action
   - merchant-originated action
   - customer-originated action
4. Add confidence and escalation rules.

## Phase 4: Instagram as a first-class channel

### Outcome

Instagram becomes the discovery and qualification layer, while WhatsApp remains the deepest transaction rail.

### Suggested channel roles

- Instagram:
  - DM discovery
  - post/story reply capture
  - qualification
  - shortlist generation
  - click-through to checkout or WhatsApp

- WhatsApp:
  - order creation
  - address capture
  - payment follow-up
  - order tracking
  - post-purchase support

## Required product changes

### Merchant experience

- one-click Meta connect
- connect WhatsApp and Instagram in the same onboarding story
- clear channel status visibility
- human handoff controls

### Customer experience

- consistent persona and cart context across channels
- channel-aware re-entry flows
- template-driven re-engagement outside service windows

## Required technical changes

### Data model

Add merchant-linked fields for:

- Meta business identifiers
- connected phone number ID
- connected Instagram account ID
- signup status
- webhook subscription status
- token issued / refreshed timestamps

### Webhooks

Extend handling to support:

- WhatsApp message status events
- template quality / account events
- Instagram messaging events
- unified event logging

### Security

- validate Meta webhook signatures
- rotate and scope tokens correctly
- avoid storing raw short-lived codes

## Delivery order

1. Landing page and Embedded Signup entry point
2. Server-side code exchange and merchant asset persistence
3. Messaging core refactor
4. Instagram adapter
5. Meta Business Agent tool contract
6. Human handoff and observability

## Success criteria

- Merchant can connect Meta assets from one CTA
- Rasphia receives and stores the onboarding result reliably
- WhatsApp and Instagram share the same commerce core
- Meta-facing agent layer can call Rasphia tools safely
- Merchant can sell, support, and re-engage from conversational channels without manual copy-paste
