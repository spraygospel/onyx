# Onyx Production Deployment Guide

Complete guide for building and running Onyx in production mode from local codebase.

> **⚠️ Important:** This guide covers building from local codebase, not pulling from DockerHub, to ensure all your development changes are included in production.

## Prerequisites

- Docker and Docker Compose
- At least 8GB RAM and 4 CPU cores recommended
- Domain name for HTTPS (optional but recommended)
- SSL certificate (Let's Encrypt supported)

## Quick Production Setup

### 1. Navigate to Deployment Directory

```bash
cd deployment/docker_compose
```

### 2. Configure Environment Variables

Create `.env` file based on your needs:

```bash
# Copy template and customize
cp env.prod.template .env
```

**Essential configuration in `.env`:**
```env
# Your domain (required for production)
WEB_DOMAIN=https://your-domain.com

# Authentication (choose one)
AUTH_TYPE=google_oauth
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
SECRET=your-random-secret-key

# Database credentials (change from defaults!)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password

# Read-only database user
DB_READONLY_USER=db_readonly_user
DB_READONLY_PASSWORD=your-readonly-password

# Session configuration
SESSION_EXPIRE_TIME_SECONDS=604800
```

### 3. Set Up HTTPS (Recommended)

Create `.env.nginx` file:

```bash
# Copy nginx template
cp env.nginx.template .env.nginx
```

Configure `.env.nginx`:
```env
DOMAIN=your-domain.com
EMAIL=your-email@domain.com
```

Initialize Let's Encrypt SSL:
```bash
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh
```

### 4. Build and Deploy Production

**Build from local codebase (recommended):**
```bash
docker compose -f docker-compose.prod.yml -p onyx-stack up -d --build --force-recreate
```


> **📝 Note:** Building from source ensures all your local changes are included. Initial build may take 15-30 minutes.

## Production Configuration Options

### Authentication Types

| Type | Description | Configuration |
|------|-------------|---------------|
| `disabled` | No authentication (development only) | `AUTH_TYPE=disabled` |
| `basic` | Username/password | `AUTH_TYPE=basic` + SMTP config |
| `google_oauth` | Google OAuth login | `AUTH_TYPE=google_oauth` + Google credentials |
| `oidc` | OpenID Connect (Enterprise) | `AUTH_TYPE=oidc` + OIDC config |
| `saml` | SAML SSO (Enterprise) | `AUTH_TYPE=saml` + SAML config |

### Email Configuration (for Basic Auth)

```env
REQUIRE_EMAIL_VERIFICATION=true
SMTP_USER=your-email@domain.com
SMTP_PASS=your-smtp-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=noreply@your-domain.com
```

### Advanced Settings

```env
# User domain restrictions
VALID_EMAIL_DOMAINS=company.com,company.org

# Vespa language settings
VESPA_LANGUAGE_OVERRIDE=en

# Image tag (use specific version for production)
IMAGE_TAG=v0.87.0
```

## GPU Support (Recommended for Performance)

For better performance with GPU acceleration:

```bash
# Use GPU-enabled compose file
docker compose -f docker-compose.gpu-dev.yml -p onyx-stack up -d --build --force-recreate
```

**GPU Prerequisites:**
- NVIDIA drivers installed
- `nvidia-container-toolkit` installed
- At least 2GB VRAM for embedding models

## Management Commands

### Check Status
```bash
docker compose -f docker-compose.prod.yml -p onyx-stack ps
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml -p onyx-stack logs

# Specific service
docker compose -f docker-compose.prod.yml -p onyx-stack logs api_server
docker compose -f docker-compose.prod.yml -p onyx-stack logs web_server
```

### Stop Services
```bash
# Stop containers (data preserved)
docker compose -f docker-compose.prod.yml -p onyx-stack stop

# Remove containers (data preserved)
docker compose -f docker-compose.prod.yml -p onyx-stack down
```

### Complete Removal
```bash
# ⚠️ WARNING: This removes ALL data including indexed documents and users
docker compose -f docker-compose.prod.yml -p onyx-stack down -v
```

## Service Architecture

Production stack includes:

- **nginx**: Reverse proxy and SSL termination (ports 80, 443)
- **web_server**: Next.js frontend application
- **api_server**: FastAPI backend server
- **background**: Background job processing
- **inference_model_server**: ML inference server
- **indexing_model_server**: Document indexing server
- **relational_db**: PostgreSQL database
- **index**: Vespa search engine
- **minio**: S3-compatible file storage
- **cache**: Redis caching
- **certbot**: SSL certificate management

## Troubleshooting

### Common Issues

**1. Build Errors**
```bash
# Clean build
docker compose -f docker-compose.prod.yml -p onyx-stack down
docker system prune -f
docker compose -f docker-compose.prod.yml -p onyx-stack up -d --build --force-recreate
```

**2. SSL Certificate Issues**
```bash
# Re-run SSL setup
./init-letsencrypt.sh
```

**3. Database Migration Issues**
```bash
# Check API server logs
docker compose -f docker-compose.prod.yml -p onyx-stack logs api_server
```

### Health Checks

- **Frontend:** `https://your-domain.com`
- **API Health:** `https://your-domain.com/api/health`
- **Vespa Status:** `https://your-domain.com:8081`

## Backup & Restore

### Database Backup
```bash
docker exec onyx-stack-relational_db-1 pg_dump -U postgres postgres > backup.sql
```

### File Storage Backup
```bash
docker cp onyx-stack-minio-1:/data ./minio_backup
```

### Restore
```bash
# Database
docker exec -i onyx-stack-relational_db-1 psql -U postgres postgres < backup.sql

# Files
docker cp ./minio_backup onyx-stack-minio-1:/data
```

## Security Considerations

- Change all default passwords
- Use strong SECRET key
- Enable HTTPS in production
- Restrict VALID_EMAIL_DOMAINS
- Keep Docker images updated
- Monitor logs for security events
- Use firewall to restrict access to internal ports

## Performance Tuning

- Use GPU acceleration if available
- Increase PostgreSQL `max_connections` for high load
- Monitor resource usage and scale containers as needed
- Use external managed services (RDS, Redis) for high-scale deployments

---

**Need Help?** 
- Documentation: https://docs.onyx.app/
- Issues: https://github.com/onyx-dot-app/onyx/issues
- Community: Slack/Discord links in main README