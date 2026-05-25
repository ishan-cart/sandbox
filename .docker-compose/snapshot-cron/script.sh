#!/bin/sh
PROMETHEUS_HOST=${PROMETHEUS_HOST:-localhost}
PROMETHEUS_PORT=${PROMETHEUS_PORT:-9090}
PROMETHEUS_HOST=${PROMETHEUS_HOST:-localhost}

BACKUP_QUERY="sum(max by (cluster, namespace,od, container)(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_rate5m)) by (namespace)"
QUERY=${QUERY:-$BACKUP_QUERY}


curl -fs -X POST http://${PROMETHEUS_HOST}:${PROMETHEUS_PORT}/api/v1/query_range \
    --data-urlencode "query=${QUERY}" \
    --data-urlencode "start=$(($(date +%s) - 600))" \
    --data-urlencode "end=$(date +%s)" \
    --data-urlencode "step=1m"