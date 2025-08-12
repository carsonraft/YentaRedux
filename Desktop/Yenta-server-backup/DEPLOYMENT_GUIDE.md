# Yenta Deployment Guide to YentaConnect.com

## 🚀 Quick Deployment

### Prerequisites
- Docker and Docker Compose installed
- Domain DNS pointed to your server
- Production environment variables configured

### Deploy in 3 Steps:

1. **Configure production environment**:
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your production credentials
   ```

2. **Run deployment**:
   ```bash
   ./deploy.sh
   ```

3. **Access your site**:
   - Frontend: https://yentaconnect.com
   - API: https://yentaconnect.com/api/health

## 🔧 Detailed Setup

### 1. Server Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum
- **OS**: Ubuntu 20.04+ or similar Linux distribution

### 2. Environment Configuration

Edit `.env.production` with these values:

```bash
# Required for basic functionality
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_256_bit_jwt_secret

# API Keys - Configure with your actual values
OPENAI_API_KEY=your_openai_api_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Google Calendar API - Configure with your values
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Configure when ready
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

### 3. Domain & SSL Setup

**DNS Configuration**:
```
A record: yentaconnect.com → Your server IP
A record: www.yentaconnect.com → Your server IP
```

**SSL Certificate (after deployment)**:
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yentaconnect.com -d www.yentaconnect.com
```

### 4. OAuth Applications Setup

Update these OAuth redirect URIs to production URLs:

**LinkedIn**:
- Redirect URI: `https://yentaconnect.com/api/auth/linkedin/callback`

**Google OAuth**:  
- Redirect URI: `https://yentaconnect.com/oauth-callback.html`

**Microsoft**:
- Redirect URI: `https://yentaconnect.com/oauth-callback.html`

**Stripe Webhook**:
- Webhook URL: `https://yentaconnect.com/api/payments/webhook`

## 📊 Service Architecture

```
Internet → Nginx (Port 80/443) → React App (Port 3000)
                                ↓
                               API Proxy → Node.js API (Port 3001)
                                         ↓  
                                        PostgreSQL (Port 5432)
```

## 🔍 Monitoring & Maintenance

### Health Checks
```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service
docker-compose logs -f server
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres yenta_db

# Backup database
docker-compose exec db pg_dump -U postgres yenta_db > backup.sql
```

### Updates
```bash
# Pull latest code
git pull origin main

# Redeploy
./deploy.sh
```

## 🛡️ Security Checklist

- [ ] Strong database password set
- [ ] JWT secret is 256-bit random string
- [ ] SSL certificate installed
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] Regular backups scheduled
- [ ] OAuth redirect URIs updated to HTTPS
- [ ] Stripe webhook using production secret

## 🚨 Troubleshooting

### Common Issues

**Database Connection Errors**:
```bash
docker-compose exec server node -e "console.log(process.env.DATABASE_URL)"
```

**API Not Responding**:
```bash
curl https://yentaconnect.com/api/health
docker-compose logs server
```

**Frontend Build Issues**:
```bash
docker-compose build --no-cache client
```

### Logs Location
- **Application logs**: `docker-compose logs`
- **Nginx logs**: Inside nginx container
- **Database logs**: `docker-compose logs db`

## 💰 Operating Costs

**Monthly Estimate**:
- Server (4GB RAM): $20-40/month
- Database (managed): $15-25/month  
- Domain: $12/year
- SSL: Free (Let's Encrypt)
- **Total**: ~$35-65/month

## 🎯 Post-Deployment Checklist

1. [ ] Verify site loads at yentaconnect.com
2. [ ] Test API health endpoint
3. [ ] Complete OAuth app configurations
4. [ ] Test prospect intake flow
5. [ ] Test vendor intake flow
6. [ ] Verify email notifications work
7. [ ] Test Stripe payments (in test mode first)
8. [ ] Set up monitoring alerts
9. [ ] Configure backups
10. [ ] Update documentation with production URLs

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables are correct
3. Ensure all external services (OAuth, Stripe) are configured
4. Check DNS and SSL configuration

Your Yenta platform is now production-ready! 🎉