# Portable production image for Node-based hosts.
# Copy the complete source before installing so every normal project file is available to the build.
FROM node:22-slim

WORKDIR /app

COPY . .

RUN npm install -g corepack@latest \
  && corepack pnpm install --frozen-lockfile \
  && corepack pnpm build

ENV NODE_ENV=production
ENV AUTO_DB_PUSH=true

CMD ["sh", "-c", "if [ \"$AUTO_DB_PUSH\" = \"true\" ]; then pnpm db:push; fi; exec node dist/index.js"]
