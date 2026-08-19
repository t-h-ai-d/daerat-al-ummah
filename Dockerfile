# Portable production image for Node-based hosts.
# Copy the complete source before installing so every normal project file is available to the build.
FROM node:22-slim

WORKDIR /app

COPY . .

RUN npm install -g corepack@0.31.0 \
  && corepack install --global pnpm@10.4.1 \
  && corepack pnpm install --frozen-lockfile \
  && corepack pnpm build

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
