# Stage 1: Dependencies
FROM node:22-alpine AS deps
# pnpm-lock.yaml is lockfileVersion 9.0 -> needs pnpm 9. Use corepack with a
# pinned pnpm 9 (the Alpine `pnpm` package is too old and breaks --frozen-lockfile).
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Need all dependencies for build
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
# must be present here (pass via docker build --build-arg or compose build.args).
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_BUILD_TIME
ARG NEXT_PUBLIC_COMMIT_SHA
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY \
    NEXT_PUBLIC_BUILD_TIME=$NEXT_PUBLIC_BUILD_TIME \
    NEXT_PUBLIC_COMMIT_SHA=$NEXT_PUBLIC_COMMIT_SHA \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
# Builds standalone output
RUN pnpm build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Only copy standalone output - no need for node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000
# Uses standalone server
CMD ["node", "server.js"]
