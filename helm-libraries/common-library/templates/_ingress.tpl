{{- define "common-library._ingress.tpl" -}}
{{- if .Values.ingress.enabled -}}
{{- $servicePort := .Values.service.port -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "common-library.fullname" . }}-ing
  labels:
    {{- include "common-library.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  ingressClassName: haproxy
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            {{- with .pathType }}
            pathType: {{ . }}
            {{- end }}
            backend:
              service:
                name: {{ include "common-library.fullname" $ }}-svc
                port:
                  number: {{ $servicePort }}
          {{- end }}
    {{- end }}
{{- end }}
{{- end -}}