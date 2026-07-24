# VOUCH indexer — Railway worker.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/scoring/package.json packages/scoring/
COPY apps/indexer/package.json apps/indexer/
RUN npm install --workspaces --include-workspace-root
COPY tsconfig.base.json ./
COPY apps/indexer apps/indexer
RUN npm run build --workspace apps/indexer

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/indexer/dist ./apps/indexer/dist
COPY --from=build /app/apps/indexer/package.json ./apps/indexer/package.json
CMD ["node", "apps/indexer/dist/index.js"]
