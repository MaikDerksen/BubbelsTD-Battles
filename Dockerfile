# Scherenschlacht-Server (Spiel + Online-Server in einem Container)
#   docker build -t scherenschlacht .
#   docker run -p 8080:8080 -v scherenschlacht-data:/data scherenschlacht
# Für den echten Betrieb mit HTTPS: deploy/docker-compose.yml (Caddy davor)
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DB_PATH=/data/scherenschlacht.db

WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

# Nur das, was gebraucht wird: Spiel-Dateien + Server-Code
COPY index.html manifest.webmanifest sw.js ./
COPY css ./css
COPY js ./js
COPY icons ./icons
COPY server/server.js ./server/
COPY server/lib ./server/lib

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health > /dev/null || exit 1
CMD ["node", "server/server.js"]
