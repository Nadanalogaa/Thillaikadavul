#!/bin/bash

# Nadanaloga Deployment Script for AWS Lightsail
# Run this script on your Lightsail instance after initial setup

echo "🚀 Starting Nadanaloga deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install global dependencies
echo "📦 Installing global dependencies..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install nginx git -y

# Clone/pull repository
if [ ! -d "/home/ubuntu/Thillaikadavul" ]; then
    echo "📥 Cloning repository..."
    cd /home/ubuntu
    git clone https://github.com/Nadanalogaa/Thillaikadavul.git
else
    echo "📥 Updating repository..."
    cd /home/ubuntu/Thillaikadavul
    git pull origin main
fi

# Navigate to app directory
cd /home/ubuntu/Thillaikadavul

# Setup production environment
echo "⚙️  Setting up production environment..."
cp server/.env.production server/.env

# Install dependencies
echo "📦 Installing application dependencies..."
npm install
cd server && npm install && cd ..

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Setup Nginx configuration
echo "⚙️  Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/nadanaloga
sudo ln -sf /etc/nginx/sites-available/nadanaloga /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start application with PM2
echo "🚀 Starting application..."
pm2 delete nadanaloga-api 2>/dev/null || true
pm2 start server/server.js --name "nadanaloga-api"
pm2 startup ubuntu -u ubuntu --hp /home/ubuntu
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup ubuntu -u ubuntu --hp /home/ubuntu
pm2 save

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✅ Deployment completed!"
echo ""
echo "Next steps:"
echo "1. Update your domain's DNS to point to this server's IP"
echo "2. Update CLIENT_URL in server/.env to your domain"
echo "3. Run: sudo certbot --nginx -d your-domain.com"
echo "4. Test your application!"
echo ""
echo "Useful commands:"
echo "- pm2 status          # Check app status"
echo "- pm2 logs            # View logs"
echo "- pm2 restart all     # Restart app"
echo "- sudo systemctl status nginx  # Check Nginx status"