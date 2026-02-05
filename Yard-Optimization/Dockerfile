# Dockerfile for React Frontend
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN if [ -f "pnpm-lock.yaml" ]; then \
      npm install -g pnpm && pnpm install; \
    else \
      npm install; \
    fi

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (Vite default is 5173, but we'll use nginx for production)
EXPOSE 80

# Use nginx to serve the built files
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]

