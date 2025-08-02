FROM node:18-alpine

WORKDIR /app

# Install netcat for connectivity tests
RUN apk add --no-cache netcat-openbsd curl

# Copy test script
COPY test-inter-container.js .
COPY package.json .

# Install dependencies
RUN npm install

# Run test
CMD ["node", "test-inter-container.js"]