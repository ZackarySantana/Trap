# Base node image
FROM node:bullseye-slim as base

RUN mkdir /app
WORKDIR /app

# Create deps image that is just the dependancies installed
FROM base as deps

ADD package.json package-lock.json ./
RUN npm install --production=false

# Build the app (minifying too)
FROM base as build

COPY --from=deps /app/node_modules /app/node_modules

ADD prisma .
RUN npx prisma generate

ADD . .
RUN npm run build

# Only the production dependancies
FROM base as production-deps
ENV NODE_ENV=production

ADD package.json package-lock.json ./
COPY --from=deps /app/node_modules /app/node_modules
RUN npm prune --production

# Starts with the production deps, and grabs the application
FROM production-deps

# Install latest security
RUN apt-get upgrade

ADD package.json package-lock.json ./

# Prisma node_modules
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma

# Built files
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public

# Prisma schema files
COPY --from=build /app/prisma /app/prisma

CMD ["npm", "run", "start"]
