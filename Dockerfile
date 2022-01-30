# syntax=docker/dockerfile:1
FROM node:14.17.6-alpine
WORKDIR /oni
COPY . .
RUN yarn
RUN yarn build
CMD ["yarn", "node", "dist/index.js"]