FROM zenika/alpine-chrome:with-node
USER root
WORKDIR /app
COPY worker/package*.json ./
RUN npm install
COPY worker ./
RUN npm run build
CMD ["npm", "run", "start"]