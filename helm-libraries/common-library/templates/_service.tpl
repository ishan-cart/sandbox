{{- define "common-library._service.tpl" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "common-library.fullname" . }}-svc
  labels:
    {{- include "common-library.labels" . | nindent 4 }}
spec:
  type: {{ default "ClusterIP" .Values.service.type }}
  ports:
    {{- if .Values.service.port }}
    - port: {{ .Values.service.port }}
      targetPort: {{ default 8080 .Values.containerPort }}
      protocol: {{ default "TCP" .Values.service.protocol }}
      name: {{ default "http" .Values.service.portName }}
    {{- end }}
    {{- if .Values.serviceMonitor.enabled }}
    - port: {{ default 8080 .Values.serviceMonitor.port }}
      targetPort: {{ default 8080 .Values.serviceMonitor.targetPort }}
      protocol: TCP
      name: http-metrics
    {{- end }}
  selector:
    {{- include "common-library.selectorLabels" . | nindent 4 }}
{{- end -}}