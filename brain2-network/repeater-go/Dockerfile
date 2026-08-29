FROM golang:1.26.5-alpine AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go test ./... && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/b2-network ./cmd/b2-network

FROM alpine:3.22
RUN apk add --no-cache ca-certificates && addgroup -S brain2 && adduser -S -G brain2 brain2
USER brain2
COPY --from=build /out/b2-network /usr/local/bin/b2-network
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/b2-network"]
