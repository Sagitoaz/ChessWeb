FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends stockfish \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install
COPY src ./src

ENV PORT=9000
EXPOSE 9000

CMD ["npm", "start"]
