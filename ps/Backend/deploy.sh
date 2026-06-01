#!/bin/bash

# ParkEase Deployment Script

cd /home/ubuntu/parking-management-systrm/
#git reset --hard HEAD
#git pull origin main


cd Backend
# Update backend
npm install
pm2 restart server.js

# Update frontend
cd frontend
npm install
ng build --configuration=production
sudo cp -r dist/frontend/browser/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# Reload nginx
sudo systemctl reload nginx

echo "Deployment completed successfully!"