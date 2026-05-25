FROM docker.io/alpine/curl:8.19.0

RUN apk add --no-cache jq

COPY snapshot.sh /scripts/snapshot.sh

ENTRYPOINT []
CMD ["/bin/sh", "/scripts/snapshot.sh"]
