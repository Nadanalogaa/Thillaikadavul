# AWS Lightsail Setup Guide for Beginners

This guide will walk you through creating your first AWS Lightsail instance to host your Nadanaloga educational platform.

## What is AWS Lightsail?

AWS Lightsail is a simple cloud hosting service that provides everything you need to launch your project quickly - a virtual server, SSD-based storage, data transfer, DNS management, and a static IP for a low, predictable monthly price.

## Prerequisites

1. A valid email address
2. A phone number for verification
3. A credit/debit card (AWS offers free tier, but requires payment method)

## Step 1: Create AWS Account

1. **Go to AWS Lightsail website:**
   - Visit: https://aws.amazon.com/lightsail/
   - Click "Get started for free"

2. **Create your AWS account:**
   - Click "Create a new AWS account"
   - Enter your email address and choose a password
   - Enter your account name (can be your name or company name)
   - Click "Continue"

3. **Contact Information:**
   - Select "Personal" or "Professional" account type
   - Fill in your contact information
   - Read and accept the AWS Customer Agreement
   - Click "Create Account and Continue"

4. **Payment Information:**
   - Enter your credit/debit card details
   - AWS won't charge you unless you exceed free tier limits
   - Click "Verify and Continue"

5. **Identity Verification:**
   - Enter your phone number
   - Choose text message or voice call
   - Enter the verification code you receive
   - Click "Continue"

6. **Choose Support Plan:**
   - Select "Basic support - Free"
   - Click "Complete sign up"

## Step 2: Access Lightsail Console

1. **Sign in to AWS:**
   - Go to https://aws.amazon.com
   - Click "Sign In to the Console"
   - Enter your email and password

2. **Navigate to Lightsail:**
   - In the AWS Management Console, search for "Lightsail"
   - Click on "Amazon Lightsail"
   - Or directly go to: https://lightsail.aws.amazon.com/

## Step 3: Create Your First Instance

1. **Click "Create instance"**

2. **Choose instance location:**
   - Select a region closest to your users (e.g., US East for US users, Asia Pacific for Asian users)
   - Leave the Availability Zone as default

3. **Pick your instance image:**
   - Click "Linux/Unix" (should be selected by default)
   - Under "Select a blueprint", choose "OS Only"
   - Select "Ubuntu 20.04 LTS" or "Ubuntu 22.04 LTS"

4. **Choose your instance plan:**
   - **$3.50/month**: 512 MB RAM, 1 vCPU, 20 GB SSD, 1 TB transfer
   - **$5/month**: 1 GB RAM, 1 vCPU, 40 GB SSD, 2 TB transfer (Recommended)
   - **$10/month**: 2 GB RAM, 1 vCPU, 60 GB SSD, 3 TB transfer

   💡 **Recommendation**: Start with the $5/month plan - it's perfect for small to medium websites.

5. **Name your instance:**
   - Give it a name like "nadanaloga-server" or "my-website"
   - You can add tags if you want (optional)

6. **Click "Create instance"**

## Step 4: Wait for Instance to Start

- Your instance will take 1-2 minutes to start
- The status will change from "Pending" to "Running"
- You'll see a green "Running" status when ready

## Step 5: Connect to Your Instance

1. **Get connection details:**
   - Click on your instance name
   - Note down the "Public IP" address
   - Click "Connect using SSH" for browser-based terminal

2. **Connect via browser (easiest method):**
   - Click "Connect using SSH"
   - A new browser window will open with a terminal
   - You're now connected as the `ubuntu` user

3. **Alternative: Connect via your computer (advanced):**
   ```bash
   ssh ubuntu@YOUR_PUBLIC_IP
   ```

## Step 6: Deploy Your Application

Now that your server is running, you can deploy your Nadanaloga application:

1. **In the SSH terminal, run:**
   ```bash
   wget https://raw.githubusercontent.com/Nadanalogaa/Thillaikadavul/main/deploy.sh
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

2. **Wait for deployment to complete** (takes 5-10 minutes)

3. **Update your domain configuration:**
   ```bash
   cd /home/ubuntu/Thillaikadavul
   nano server/.env
   ```
   - Change `CLIENT_URL=http://127.0.0.1:5500` to `CLIENT_URL=http://YOUR_PUBLIC_IP`
   - Press Ctrl+X, then Y, then Enter to save

4. **Restart the application:**
   ```bash
   pm2 restart nadanaloga-api
   ```

## Step 7: Access Your Website

- Open your browser
- Go to: `http://YOUR_PUBLIC_IP`
- You should see your Nadanaloga website!

## Step 8: Set Up a Domain (Optional)

1. **Create a static IP:**
   - In Lightsail console, go to "Networking" tab
   - Click "Create static IP"
   - Attach it to your instance
   - Note the static IP address

2. **Configure your domain:**
   - Go to your domain provider (GoDaddy, Namecheap, etc.)
   - Create an "A" record pointing to your static IP

3. **Update your application:**
   ```bash
   cd /home/ubuntu/Thillaikadavul
   nano server/.env
   ```
   - Change `CLIENT_URL` to `https://yourdomain.com`
   - Save and restart: `pm2 restart nadanaloga-api`

4. **Set up SSL certificate:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d yourdomain.com
   ```

## Cost Breakdown

- **Instance**: $5/month (recommended plan)
- **Static IP**: $0/month (while attached to running instance)
- **Data Transfer**: Included in plan (2TB/month)
- **Total**: ~$5/month

## Useful Commands

Once your server is running:

```bash
# Check application status
pm2 status

# View application logs
pm2 logs

# Restart application
pm2 restart nadanaloga-api

# Update your application
cd /home/ubuntu/Thillaikadavul
git pull origin main
npm run build
pm2 restart nadanaloga-api

# Check server resources
htop

# Check disk space
df -h
```

## Troubleshooting

**Can't connect to website?**
- Check if instance is "Running"
- Verify firewall: `sudo ufw status`
- Check application: `pm2 status`

**Application not starting?**
- Check logs: `pm2 logs`
- Restart: `pm2 restart nadanaloga-api`

**Need help?**
- AWS Lightsail has 24/7 support chat
- Check the deployment logs in your SSH terminal

## Security Tips

1. **Keep your system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Don't share your SSH connection**
3. **Regularly backup your data**
4. **Use HTTPS with a domain name**

## Next Steps

1. Set up a domain name for professional look
2. Configure SSL certificate for HTTPS
3. Set up automated backups
4. Monitor your application performance

Your Nadanaloga educational platform is now live on the internet! 🎉