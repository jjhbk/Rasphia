#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

# Preserve explicit shell env values so they override file values if both exist.
EXPLICIT_TOKEN="${TOKEN:-}"
EXPLICIT_API_VERSION="${API_VERSION:-}"

load_env_file() {
  local env_file="$1"
  if [[ -f "${env_file}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
  fi
}

# Load project env files if present.
load_env_file "${PROJECT_ROOT}/.env.local"
load_env_file "${PROJECT_ROOT}/.env"

TOKEN="${EXPLICIT_TOKEN:-${TOKEN:-}}"
API_VERSION="${EXPLICIT_API_VERSION:-${API_VERSION:-v25.0}}"
GRAPH_BASE="https://graph.facebook.com/${API_VERSION}"

usage() {
  cat <<'EOF'
WhatsApp Cloud API helper

Env loading order:
  1) Explicit shell env (highest priority)
  2) .env.local at project root
  3) .env at project root

Required variable:
  TOKEN=<ACCESS_TOKEN>  (from explicit env or env file)

Optional env:
  API_VERSION=v25.0

Commands:
  inspect <OBJECT_ID>
  list-phone-numbers <WABA_ID>
  list-subscribed-apps <WABA_ID>
  subscribe-app <WABA_ID>
  request-code <PHONE_NUMBER_ID> <SMS|VOICE> <LANGUAGE_CODE>
  verify-code <PHONE_NUMBER_ID> <CODE>
  change-pin <PHONE_NUMBER_ID> <PIN_6_DIGITS>
  register <PHONE_NUMBER_ID> <PIN_6_DIGITS> [DATA_LOCALIZATION_REGION]

Examples:
  TOKEN=... ./scripts/whatsapp_cloud_register.sh inspect 131595870238190
  ./scripts/whatsapp_cloud_register.sh inspect 1317066584238190
  TOKEN=... ./scripts/whatsapp_cloud_register.sh list-phone-numbers 1234567890
  TOKEN=... ./scripts/whatsapp_cloud_register.sh list-subscribed-apps 1234567890
  TOKEN=... ./scripts/whatsapp_cloud_register.sh subscribe-app 1234567890
  TOKEN=... ./scripts/whatsapp_cloud_register.sh request-code 106540352242922 SMS en_US
  TOKEN=... ./scripts/whatsapp_cloud_register.sh verify-code 106540352242922 123456
  TOKEN=... ./scripts/whatsapp_cloud_register.sh change-pin 106540352242922 212834
  TOKEN=... ./scripts/whatsapp_cloud_register.sh register 106540352242922 212834 CH
EOF
}

require_token() {
  if [[ -z "${TOKEN}" ]]; then
    echo "Error: TOKEN is required."
    echo "Set it like: TOKEN='<ACCESS_TOKEN>' $0 <command> ..."
    exit 1
  fi
}

post_json() {
  local url="$1"
  local data="$2"
  curl -sS -X POST "${url}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${data}"
  echo
}

get_url() {
  local url="$1"
  curl -sS -X GET "${url}"
  echo
}

main() {
  if [[ $# -lt 1 ]]; then
    usage
    exit 1
  fi

  require_token

  local cmd="$1"
  shift || true

  case "${cmd}" in
    inspect)
      if [[ $# -ne 1 ]]; then
        echo "Usage: $0 inspect <OBJECT_ID>"
        exit 1
      fi
      local object_id="$1"
      get_url "${GRAPH_BASE}/${object_id}?fields=id,display_phone_number,verified_name,whatsapp_business_account,code_verification_status&access_token=${TOKEN}"
      ;;

    list-phone-numbers)
      if [[ $# -ne 1 ]]; then
        echo "Usage: $0 list-phone-numbers <WABA_ID>"
        exit 1
      fi
      local waba_id="$1"
      get_url "${GRAPH_BASE}/${waba_id}/phone_numbers?access_token=${TOKEN}"
      ;;

    list-subscribed-apps)
      if [[ $# -ne 1 ]]; then
        echo "Usage: $0 list-subscribed-apps <WABA_ID>"
        exit 1
      fi
      local waba_id="$1"
      get_url "${GRAPH_BASE}/${waba_id}/subscribed_apps?access_token=${TOKEN}"
      ;;

    subscribe-app)
      if [[ $# -ne 1 ]]; then
        echo "Usage: $0 subscribe-app <WABA_ID>"
        exit 1
      fi
      local waba_id="$1"
      post_json "${GRAPH_BASE}/${waba_id}/subscribed_apps" "{}"
      ;;

    request-code)
      if [[ $# -ne 3 ]]; then
        echo "Usage: $0 request-code <PHONE_NUMBER_ID> <SMS|VOICE> <LANGUAGE_CODE>"
        exit 1
      fi
      local phone_number_id="$1"
      local method="$2"
      local language="$3"
      post_json "${GRAPH_BASE}/${phone_number_id}/request_code" "{\"code_method\":\"${method}\",\"language\":\"${language}\"}"
      ;;

    verify-code)
      if [[ $# -ne 2 ]]; then
        echo "Usage: $0 verify-code <PHONE_NUMBER_ID> <CODE>"
        exit 1
      fi
      local phone_number_id="$1"
      local code="$2"
      post_json "${GRAPH_BASE}/${phone_number_id}/verify_code" "{\"code\":\"${code}\"}"
      ;;

    change-pin)
      if [[ $# -ne 2 ]]; then
        echo "Usage: $0 change-pin <PHONE_NUMBER_ID> <PIN_6_DIGITS>"
        exit 1
      fi
      local phone_number_id="$1"
      local pin="$2"
      if [[ ! "${pin}" =~ ^[0-9]{6}$ ]]; then
        echo "Error: PIN must be exactly 6 digits."
        exit 1
      fi
      post_json "${GRAPH_BASE}/${phone_number_id}" "{\"pin\":\"${pin}\"}"
      ;;

    register)
      if [[ $# -lt 2 || $# -gt 3 ]]; then
        echo "Usage: $0 register <PHONE_NUMBER_ID> <PIN_6_DIGITS> [DATA_LOCALIZATION_REGION]"
        exit 1
      fi
      local phone_number_id="$1"
      local pin="$2"
      local region="${3:-}"

      if [[ ! "${pin}" =~ ^[0-9]{6}$ ]]; then
        echo "Error: PIN must be exactly 6 digits."
        exit 1
      fi

      local payload
      if [[ -n "${region}" ]]; then
        payload="{\"messaging_product\":\"whatsapp\",\"pin\":\"${pin}\",\"data_localization_region\":\"${region}\"}"
      else
        payload="{\"messaging_product\":\"whatsapp\",\"pin\":\"${pin}\"}"
      fi
      post_json "${GRAPH_BASE}/${phone_number_id}/register" "${payload}"
      ;;

    *)
      echo "Unknown command: ${cmd}"
      usage
      exit 1
      ;;
  esac
}

main "$@"
