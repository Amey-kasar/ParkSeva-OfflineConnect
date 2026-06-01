# AWS EC2 Deployment Guide

## Prerequisites
- AWS Account
- GitHub Repository
- Domain name (optional)

## Step 1: Launch EC2 Instance
1. Launch Ubuntu 22.04 LTS instance (t3.medium recommended)
2. Configure Security Group:
   - SSH (22) - Your IP
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom (3000) - 0.0.0.0/0
3. Create/use existing Key Pair

## Step 2: Initial Server Setup
```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Run setup script
curl -o deploy-script.sh https://raw.githubusercontent.com/YOUR_USERNAME/parkease/main/deploy-script.sh
chmod +x deploy-script.sh
./deploy-script.sh
```

## Step 3: Configure GitHub Secrets
Add these secrets in GitHub Repository Settings:
- `EC2_HOST`: Your EC2 public IP
- `EC2_USER`: ubuntu
- `EC2_SSH_KEY`: Your private key content
- `JWT_SECRET`: Strong JWT secret
- `RAZORPAY_KEY_ID`: Your Razorpay key
- `RAZORPAY_KEY_SECRET`: Your Razorpay secret

## Step 4: Deploy
Push to main branch - GitHub Actions will auto-deploy

## Step 5: Access Application
- Frontend: http://your-ec2-ip
- Backend API: http://your-ec2-ip:3000/api

## Optional: SSL Setup
```bash
sudo certbot --nginx -d yourdomain.com
```

## Monitoring
```bash
# Check services
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```