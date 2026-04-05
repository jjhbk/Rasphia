# WhatsApp Cloud API Number Registration Guide

This guide helps you verify and register a WhatsApp business phone number for Cloud API usage.

## Prerequisites

- A Meta app with WhatsApp product enabled
- A valid access token (prefer System User token for production)
- Required permissions:
  - `whatsapp_business_management`
  - `whatsapp_business_messaging`
- A phone number added to your WABA

## Step-by-step API flow

1. Inspect object ID type (phone number vs WABA):

```bash
curl -X GET \
  "https://graph.facebook.com/v25.0/<OBJECT_ID>?fields=id,display_phone_number,verified_name,whatsapp_business_account,code_verification_status&access_token=<TOKEN>"
```

2. List numbers on WABA (use `whatsapp_business_account.id` from step 1):

```bash
curl -X GET \
  "https://graph.facebook.com/v25.0/<WABA_ID>/phone_numbers?access_token=<TOKEN>"
```

3. Request verification code:

```bash
curl -X POST "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/request_code" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"code_method":"SMS","language":"en_US"}'
```

4. Verify code:

```bash
curl -X POST "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/verify_code" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'
```

5. Register for Cloud API:

```bash
curl -X POST "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>/register" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","pin":"212834","data_localization_region":"CH"}'
```

6. Change two-step PIN via API (if needed):

```bash
curl -X POST \
  "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"pin":"212834"}'
```

7. Check app subscription on WABA (required for real inbound webhooks):

```bash
curl -X GET \
  "https://graph.facebook.com/v25.0/<WABA_ID>/subscribed_apps?access_token=<TOKEN>"
```

8. Subscribe app to WABA if needed:

```bash
curl -X POST \
  "https://graph.facebook.com/v25.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <TOKEN>"
```

## Important notes

- Do not include a trailing space in the URL:
  - Wrong: `.../register `
  - Correct: `.../register`
- `pin` must be 6 digits.
- If two-step verification already exists, use that existing PIN.
- Rotate/revoke tokens immediately if they are exposed in logs, code, or chats.

## Use the helper script

File: `scripts/whatsapp_cloud_register.sh`

### Configure env once

```bash
cp .env.example .env.local
# then edit .env.local and set TOKEN=...
```

### Usage examples

```bash
# Optional once if needed
chmod +x scripts/whatsapp_cloud_register.sh

# 1) Inspect unknown object ID (reads TOKEN from .env.local)
scripts/whatsapp_cloud_register.sh inspect 13170899540238190

# 2) List phone numbers on WABA
scripts/whatsapp_cloud_register.sh list-phone-numbers <WABA_ID>

# 3) Check if app is subscribed to WABA (for real inbound delivery)
scripts/whatsapp_cloud_register.sh list-subscribed-apps <WABA_ID>

# 4) Subscribe app to WABA if needed
scripts/whatsapp_cloud_register.sh subscribe-app <WABA_ID>

# 5) Request SMS verification code
scripts/whatsapp_cloud_register.sh request-code <PHONE_NUMBER_ID> SMS en_US

# 6) Verify received code
scripts/whatsapp_cloud_register.sh verify-code <PHONE_NUMBER_ID> 123456

# 7) Change PIN via API
scripts/whatsapp_cloud_register.sh change-pin <PHONE_NUMBER_ID> 212834

# 8) Register number for Cloud API
scripts/whatsapp_cloud_register.sh register <PHONE_NUMBER_ID> 212834 

# 9) Direct curl example to change PIN (without helper script)
curl -X POST \
  "https://graph.facebook.com/v25.0/<PHONE_NUMBER_ID>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"pin":"212834"}'
```

Env precedence:
- Explicit shell env overrides files:
  - `TOKEN=... scripts/whatsapp_cloud_register.sh inspect <ID>`
- Otherwise script loads `.env.local`, then `.env`.

## Official references

- https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers#verify
- https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/registration#register
