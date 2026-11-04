FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY src src
COPY scripts scripts
COPY web web
COPY data data
RUN node scripts/build.mjs && addgroup -S app && adduser -S app -G app && mkdir -p /data && chown -R app /app /data
USER app
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/api/search?limit=1 >/dev/null || exit 1
CMD ["node", "server.mjs"]
