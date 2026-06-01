#!/bin/bash

# EC2 Setup Script for ParkEase Deployment

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Clone repository
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/parkease.git
cd parkease

# Create environment file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/parkease
JWT_SECRET=your_secure_jwt_secret_here
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
PORT=3000
EOF

# Start services
docker-compose up -d

# Setup nginx for SSL (optional)
sudo apt install nginx certbot python3-certbot-nginx -y

echo "Deployment complete! Access your app at http://YOUR_EC2_IP"