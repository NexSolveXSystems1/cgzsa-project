# ---- dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL
ARG APP_URL
ENV DATABASE_URL=$DATABASE_URL
ENV APP_URL=$APP_URL
RUN npm run build

# ---- run ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=build /app/cgzsa-frontend/public ./cgzsa-frontend/public
COPY --from=build /app/cgzsa-frontend/.next ./cgzsa-frontend/.next
COPY --from=build /app/cgzsa-frontend/next.config.ts ./cgzsa-frontend/next.config.ts
COPY --from=build /app/cgzsa-frontend/postcss.config.mjs ./cgzsa-frontend/postcss.config.mjs
COPY --from=build /app/cgzsa-frontend/tsconfig.json ./cgzsa-frontend/tsconfig.json
COPY --from=build /app/cgzsa-frontend/src ./cgzsa-frontend/src
COPY --from=build /app/cgzsa-backend ./cgzsa-backend
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
