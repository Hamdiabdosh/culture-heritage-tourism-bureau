# Production image for the Ethiopian Government Website Platform.
#
# App image:
#   docker build -t gov-website-template .
#   docker run --rm -p 3000:3000 --env-file .env gov-website-template
#
# Migrations (explicit ops step — not run on app start):
#   docker build --target migrate -t gov-website-migrate .
#   docker run --rm -e DATABASE_URL="$DATABASE_URL" gov-website-migrate
#
# Or from a checkout with dependencies installed:
#   pnpm db:migrate

ARG NODE_VERSION=22
ARG PNPM_VERSION=12.3.4

# --- deps ---
FROM node:${NODE_VERSION}-alpine AS deps
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Avoid pnpm rewriting the lockfile for packageManagerDependencies inside Docker.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.packageManager;fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n')"
# Fresh containers block dependency build scripts unless explicitly allowed.
RUN pnpm config set dangerouslyAllowAllBuilds true
RUN pnpm install --frozen-lockfile

# --- migrate (ops one-shot; includes drizzle-kit + migration files) ---
# Built independently of the app image: docker build --target migrate ...
FROM deps AS migrate
WORKDIR /app
COPY . .
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.packageManager;fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n')"
# Call drizzle-kit directly so ops runs do not re-trigger pnpm install checks.
CMD ["./node_modules/.bin/drizzle-kit", "migrate"]

# --- build ---
FROM node:${NODE_VERSION}-alpine AS builder
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Keep the same package.json tweak used during install resolution.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.packageManager;fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n')"

# Build-time placeholders only — real secrets are supplied at runtime.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV BETTER_AUTH_SECRET=build-time-placeholder-not-for-production
ENV BETTER_AUTH_URL=http://localhost:3000

RUN pnpm build

# --- runtime ---
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
