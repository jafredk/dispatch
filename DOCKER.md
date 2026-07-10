# Docker Setup Guide

This guide explains how to run the Dispatch application using Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 1.29+

## Environment Setup

1. Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Firebase configuration values in `.env.local`

## Development

### Using Docker Compose (Recommended for Development)

Start the development server with hot reloading:
```bash
docker-compose -f docker-compose.dev.yml up
```

The application will be available at `http://localhost:3000`

**Features:**
- Hot reloading on file changes
- Live debugging
- Full access to logs

Stop the containers:
```bash
docker-compose -f docker-compose.dev.yml down
```

### Manual Docker Commands

Build the development image:
```bash
docker build -f Dockerfile.dev -t dispatch-app:dev .
```

Run the development container:
```bash
docker run -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  --env-file .env.local \
  dispatch-app:dev
```

## Production

### Using Docker Compose

Start the production application:
```bash
docker-compose up -d
```

The application will be available at `http://localhost:3000`

View logs:
```bash
docker-compose logs -f
```

Stop the containers:
```bash
docker-compose down
```

### Manual Docker Commands

Build the production image:
```bash
docker build -t dispatch-app:latest .
```

Run the production container:
```bash
docker run -d \
  -p 3000:3000 \
  --name dispatch-app \
  --env-file .env.local \
  dispatch-app:latest
```

View logs:
```bash
docker logs -f dispatch-app
```

Stop the container:
```bash
docker stop dispatch-app
```

Remove the container:
```bash
docker rm dispatch-app
```

## Building for Deployment

### Push to Docker Registry

Tag the image:
```bash
docker tag dispatch-app:latest your-registry/dispatch-app:latest
```

Push to registry:
```bash
docker push your-registry/dispatch-app:latest
```

### Docker Hub Example
```bash
docker tag dispatch-app:latest yourusername/dispatch-app:latest
docker push yourusername/dispatch-app:latest
```

## Health Checks

The production container includes health checks that verify the application is running:

```bash
docker inspect --format='{{.State.Health.Status}}' dispatch-app
```

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs app`
- Verify environment variables are set: `docker-compose config`

### Port 3000 already in use
- Change the port mapping in `docker-compose.yml`:
  ```yaml
  ports:
    - "3001:3000"  # Maps host 3001 to container 3000
  ```

### Hot reloading not working in development
- Ensure volumes are mounted correctly
- Try rebuilding: `docker-compose -f docker-compose.dev.yml build --no-cache`

### Firebase errors in container
- Verify `.env.local` contains all required Firebase variables
- Ensure variables are accessible: `docker-compose config | grep FIREBASE`

## Production Deployment Platforms

### Railway
1. Connect GitHub repository
2. Railway auto-detects Dockerfile
3. Set environment variables in dashboard
4. Deploy

### Render
1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `npm run build`
4. Set start command: `node .next/standalone/server.js`
5. Add environment variables
6. Deploy

### AWS ECS/ECR
1. Build and push image to ECR
2. Create ECS task definition
3. Create ECS service
4. Configure load balancer

### Google Cloud Run
```bash
gcloud run deploy dispatch-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=value
```

## Performance Tips

1. **Use Alpine images**: Already using `node:18-alpine` for smaller image size
2. **Multi-stage builds**: Production Dockerfile uses multi-stage builds to reduce image size
3. **Caching**: Docker layers are cached for faster builds
4. **Health checks**: Ensures container restarts if unhealthy

## Security Best Practices

1. Run containers as non-root user (already configured)
2. Use `.dockerignore` to exclude sensitive files
3. Keep base images updated
4. Scan images for vulnerabilities: `docker scan dispatch-app:latest`
5. Use secrets management for sensitive data in production

## File Reference

- **Dockerfile**: Production-optimized multi-stage build
- **Dockerfile.dev**: Development build with hot reloading
- **docker-compose.yml**: Production configuration
- **docker-compose.dev.yml**: Development configuration
- **.dockerignore**: Files excluded from Docker build
- **.env.example**: Template for environment variables
