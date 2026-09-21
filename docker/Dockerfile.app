FROM python:3.11-slim AS backend
WORKDIR /app
RUN apt-get update && apt-get install -y openssh-client && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y nginx openssh-client && rm -rf /var/lib/apt/lists/*
COPY --from=backend /app /app
COPY --from=backend /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend /usr/local/bin /usr/local/bin
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default
EXPOSE 80 8000
CMD ["sh", "-c", "nginx && uvicorn main:app --host 0.0.0.0 --port 8000"]
