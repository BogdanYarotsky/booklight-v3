FROM node:18.15.0-slim
WORKDIR /app
COPY api/package*.json ./
RUN npm install
COPY api ./
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "start"]