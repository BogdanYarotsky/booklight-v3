FROM node:18.15.0-slim
WORKDIR /app
COPY worker/package*.json ./
RUN npm install
COPY worker ./
RUN npm run build
CMD ["npm", "run", "start"]