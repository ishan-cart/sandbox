#!/usr/bin/bash
set -euo pipefail

GRAFANA_HOST="${GRAFANA_HOST:-localhost}"
GRAFANA_PORT="${GRAFANA_PORT:-3000}"
GRAFANA_DASHBOARD="${GRAFANA_DASHBOARD:-New dashboard}"
SNAPSHOT_KEY="yeahboi"
SNAPSHOT_DEL_KEY="delete-yeahboi"
OUTPUT_FILE="${OUTPUT_FILE:-/scripts/data/dashboard-snapshot.json}"


if [ -n "${API_KEY+x}" ]; then
  GRAFANA_URL="http://$GRAFANA_HOST:$GRAFANA_PORT"
else
  GRAFANA_URL="http://admin:admin@$GRAFANA_HOST:$GRAFANA_PORT"
fi

echo "Deleting old snapshot key 'delete-yeahboi'..."

# 1. Silently delete the previous snapshot using the permanent delete key
curl -sX DELETE "$GRAFANA_URL/api/snapshots/$SNAPSHOT_KEY" \
  ${API_KEY:+-H "Authorization: Bearer $API_KEY"}

echo
# 2. Get the original dashboard UID
echo "Getting dashbaord uid..."

uid_resp=$(curl -sG "$GRAFANA_URL/api/search" \
  ${API_KEY:+-H "Authorization: Bearer $API_KEY"} \
  --data-urlencode "query=$GRAFANA_DASHBOARD" \
  --data-urlencode "type=dash-db")

# echo $uid_resp

uid=$(echo "$uid_resp" | jq '.[].uid' -r)

if [ "$uid" == "" ]; then
  echo "get uid failed"
  exit 1
fi

# 2. Download the live layout structure
dashboard_resp=$(curl -sG "$GRAFANA_URL/api/dashboards/uid/$uid" \
  ${API_KEY:+-H "Authorization: Bearer $API_KEY"})

payload=$(echo "$dashboard_resp" | jq \
  --arg title "$GRAFANA_DASHBOARD" \
  --arg key "$SNAPSHOT_KEY" \
  --arg del_key "$SNAPSHOT_DEL_KEY" \
  '{
    dashboard: (.dashboard | del(.id, .version) | .title = $title),
    key: $key,
    deleteKey: $del_key,
    expires: 3600
  }')

# echo $payload

# 3. Generate the snapshot on the backend
echo 'Generating new snapshot...'

snapshot_resp=$(curl -sX POST "$GRAFANA_URL/api/snapshots" \
  ${API_KEY:+-H "Authorization: Bearer $API_KEY"} \
  -H "Content-Type: application/json" \
  -d "$payload")

snapshot_key=$(echo "$snapshot_resp" | jq -r '.key')

if [ -z "$snapshot_key" ] || [ "$snapshot_key" == "null" ]; then
  echo "Error: Backend generation failed. Response:"
  echo "$snapshot_resp"
  exit 1
fi

# 4. Download the full structural JSON file with embedded metrics
curl -X GET "$GRAFANA_URL/api/snapshots/$snapshot_key" \
  ${API_KEY:+-H "Authorization: Bearer $API_KEY"} \
  -o "$OUTPUT_FILE"

echo "Success! Live snapshot saved directly to $OUTPUT_FILE"