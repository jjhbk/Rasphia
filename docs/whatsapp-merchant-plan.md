# WhatsApp Merchant Automation Plan

## Goals
- Onboard merchants directly from WhatsApp chat.
- Support core merchant operations by conversation:
  - registration
  - product upload/update/query
  - stock update/query
  - active order query/update
- Keep model output schema-safe and DB writes deterministic.

## Current implementation (Phase 1)
- `/api/whatsapp` webhook enabled for verification + inbound text handling.
- Intent engine in `app/lib/whatsapp-orchestrator.ts` with strict zod validations.
- Session state persisted in `WhatsappSession.data`.
- Missing required field prompting implemented for action intents.
- Idempotency guard for repeated inbound message IDs.
- Admin debug endpoint `/api/whatsapp-session` for session list/get/delete.

## Intents
- `merchant_register`
- `product_upload`
- `product_update`
- `product_query`
- `stock_update`
- `stock_query`
- `order_query_active`
- `order_update_status`
- `help`
- `unknown`

## Reliability controls
- LLM used only for parsing intent + field extraction.
- Backend zod validation blocks invalid writes.
- Only approved merchants can mutate product/order state.
- Duplicate webhook event protection via `processedMessageIds`.

## Next phases
1. Media intake for product image upload via WhatsApp attachments.
2. Confirmation workflow for sensitive updates (stock->0, order status changes).
3. Structured audit logs (`WhatsappEventLog`).
4. Provider unification: switch intent parser to existing app provider abstraction.

## Environment
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `OPENAI_API_KEY` (optional, fallback parser works without it)

## Quick smoke test
1. Configure webhook callback URL: `/api/whatsapp`
2. Verify token using `WHATSAPP_VERIFY_TOKEN`
3. Send WhatsApp text to business number:
   - "register me"
   - "add product name X category Y price 499 stock 12"
   - "stock query"
