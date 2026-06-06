{{- if .Values.serviceMonitor.enabled }}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ include "common-library.fullname" . }}
  labels:
    {{- include "common-library.labels" . | nindent 4 }}
    {{- with .Values.serviceMonitor.additionalLabels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  jobLabel: {{ default "app.kubernetes.io/name" .Values.serviceMonitor.jobLabel }}
  selector:
    matchLabels:
      {{- include "common-library.selectorLabels" . | nindent 6 }}
  endpoints:
    - port: {{ .Values.serviceMonitor.portName | default "http-metrics" | quote }}
      path: {{ .Values.serviceMonitor.path | default "/metrics" | quote }}
      interval: {{ .Values.serviceMonitor.interval | default "30s" | quote }}
      scrapeTimeout: {{ .Values.serviceMonitor.scrapeTimeout | default "10s" | quote }}
      {{- with .Values.serviceMonitor.relabelings }}
      relabelings:
        {{- toYaml .Values.serviceMonitor.relabelings | nindent 8 }}
      {{- end }}
      {{- with .Values.serviceMonitor.metricRelabelings }}
      metricRelabelings:
        {{- toYaml . | nindent 8 }}
      {{- end }}
{{- end }}
