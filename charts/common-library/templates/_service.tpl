{{- define "common-library._service.tpl" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "common-library.fullname" . }}-svc
  labels:
    {{- include "common-library.labels" . | nindent 4 }}
spec:
  type: ClusterIP
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ default 8080 .Values.service.targetPort }}
      protocol: {{ default "TCP" .Values.service.protocol }}
      name: {{ default "http" .Values.service.portName }}
  selector:
    {{- include "common-library.selectorLabels" . | nindent 4 }}
{{- end -}}