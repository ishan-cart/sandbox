#!/bin/sh
# Localhost fallback is for local testing only
PROMETHEUS_HOST=${PROMETHEUS_HOST:-localhost}
PROMETHEUS_PORT=${PROMETHEUS_PORT:-9090}

# FIX: Wrapped the query string in single quotes so inner double quotes don't break it
BACKUP_QUERY='sum(max by (cluster, namespace, pod, container) (container_memory_rss{job="kubelet", metrics_path="/metrics/cadvisor", container!=""})) by (namespace)'
QUERY=${QUERY:-$BACKUP_QUERY}

# Executing the POST request to query_range (HTTP to in-cluster Prometheus; no TLS on scrape port)
curl -f -X POST "http://${PROMETHEUS_HOST}:${PROMETHEUS_PORT}/api/v1/query_range" \
	--data-urlencode "query=${QUERY}" \
	--data-urlencode "start=$(($(date +%s) - 600))" \
	--data-urlencode "end=$(date +%s)" \
	--data-urlencode "step=1m"
