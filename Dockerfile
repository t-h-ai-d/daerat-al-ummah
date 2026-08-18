# Portable production image for Node-based hosts.
# Copy the full source before pnpm install: pnpm needs patches/wouter@3.7.1.patch.
FROM node:22-slim

WORKDIR /app

COPY . .

RUN npm install -g corepack@latest \
  && corepack pnpm install --frozen-lockfile \
  && corepack pnpm build

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
