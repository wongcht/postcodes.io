FROM node:24-slim AS base

RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl bash git postgresql-client ca-certificates wget && \
  rm -rf /var/lib/apt/lists/*

ENV DOCKERIZE_VERSION v0.6.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz

RUN corepack enable

COPY docker/test/entrypoint.sh /usr/bin/
ENTRYPOINT ["entrypoint.sh"]

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

ADD . /app

# Build TypeScript files
RUN mkdir -p dist/bin && pnpm run build && ls -la dist/

CMD tail
