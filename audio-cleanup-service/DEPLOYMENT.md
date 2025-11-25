# Oracle Cloud Deployment Guide

## Prerequisites
- Oracle Cloud account (free tier)
- Domain access (olavoices.com DNS settings)
- SSH client (Terminal on Mac/Linux, PuTTY on Windows)

---

## Phase 1: Oracle Cloud Setup

### 1. Create Oracle Cloud Account
1. Go to https://cloud.oracle.com/free
2. Sign up (requires credit card for verification - NOT charged)
3. Complete email verification

### 2. Create Compute Instance
1. Log in to Oracle Cloud Console
2. Go to **Compute → Instances → Create Instance**
3. Configure:
   - **Name**: `audio-cleanup-server`
   - **Compartment**: root (default)
   - **Availability Domain**: Any
   - **Image**: Ubuntu 22.04 (Canonical)
   - **Shape**: VM.Standard.E2.1.Micro (Always Free)
   - **Network**: Create new VCN (default settings)
   - **SSH Keys**: Generate key pair or upload public key
   - **Boot Volume**: 50GB (default)
4. Click **Create**
5. Wait 2-3 minutes for instance to provision
6. **SAVE the public IP address** (e.g., 123.456.789.0)

### 3. Configure Firewall Rules
1. Go to **Networking → Virtual Cloud Networks**
2. Click your VCN → **Security Lists → Default**
3. Click **Add Ingress Rules**:
   - **Rule 1**: HTTP
     - Source CIDR: `0.0.0.0/0`
     - Destination Port: `80`
   - **Rule 2**: HTTPS
     - Source CIDR: `0.0.0.0/0`
     - Destination Port: `443`
   - **Rule 3**: Custom (for direct API access)
     - Source CIDR: `0.0.0.0/0`
     - Destination Port: `3000`

### 4. Create Block Volume (200GB Storage)
1. Go to **Storage → Block Volumes → Create Block Volume**
2. Configure:
   - **Name**: `audio-cleanup-storage`
   - **Size**: 200GB (maximum free tier)
   - **Availability Domain**: Same as your compute instance
3. Click **Create**
4. After creation, click **Attached Instances → Attach to Instance**
5. Select your compute instance → **Attach**
6. **SAVE the attachment commands** shown on screen

---

## Phase 2: Server Setup

### 1. Connect via SSH
```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP
```

### 2. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Install Node.js v20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

### 4. Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 --version
```

### 5. Install Nginx (Reverse Proxy)
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 6. Install Certbot (Free SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7. Mount Block Volume
```bash
# Find the device name
lsblk

# Format the volume (ONLY FIRST TIME!)
sudo mkfs.ext4 /dev/sdb

# Create mount point
sudo mkdir -p /var/audio-cleanup

# Mount the volume
sudo mount /dev/sdb /var/audio-cleanup

# Auto-mount on reboot
echo "/dev/sdb /var/audio-cleanup ext4 defaults 0 0" | sudo tee -a /etc/fstab

# Set permissions
sudo chown -R ubuntu:ubuntu /var/audio-cleanup
```

---

## Phase 3: Deploy Application

### 1. Clone Repository
```bash
cd /var/audio-cleanup
git clone https://github.com/YOUR_USERNAME/audio-cleanup-service.git
cd audio-cleanup-service
```

### 2. Install Dependencies
```bash
npm install --production
```

### 3. Create .env File
```bash
nano .env
```

Add the following:
```env
# Server
PORT=3000
BASE_URL=https://api.olavoices.com
NODE_ENV=production

# Admin
ADMIN_EMAIL=hello@olavoices.com

# Email (Resend)
RESEND_API_KEY=your_resend_key_here

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Storage (local - using Block Volume)
# R2 settings commented out - not needed with local storage
# R2_ENDPOINT=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET_NAME=audio-cleanup
# R2_PUBLIC_URL=
```

Save: `Ctrl+X`, `Y`, `Enter`

### 4. Create Logs Directory
```bash
mkdir -p logs
```

### 5. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Copy and run the command PM2 shows you
```

### 6. Configure Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/audio-cleanup
```

Paste:
```nginx
server {
    listen 80;
    server_name api.olavoices.com;

    client_max_body_size 250M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

Save and enable:
```bash
sudo ln -s /etc/nginx/sites-available/audio-cleanup /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Phase 4: DNS Configuration

### 1. Add DNS A Record
In your olavoices.com DNS settings:
- **Type**: A
- **Name**: api
- **Value**: YOUR_PUBLIC_IP
- **TTL**: 300

Wait 5-10 minutes for DNS propagation.

Test: `nslookup api.olavoices.com` should return your IP.

---

## Phase 5: SSL Certificate

### 1. Install Let's Encrypt SSL
```bash
sudo certbot --nginx -d api.olavoices.com
```

Follow prompts:
- Enter email
- Agree to terms
- Choose to redirect HTTP to HTTPS

### 2. Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

## Phase 6: Stripe Webhook Setup

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. Enter: `https://api.olavoices.com/webhook/stripe`
4. Select events: `checkout.session.completed`
5. Copy the **Signing secret**
6. Update `.env` on server:
   ```bash
   nano /var/audio-cleanup/audio-cleanup-service/.env
   ```
   Update `STRIPE_WEBHOOK_SECRET`
7. Restart PM2:
   ```bash
   pm2 restart audio-cleanup-service
   ```

---

## Phase 7: Testing

### 1. Check Server Status
```bash
pm2 status
pm2 logs audio-cleanup-service
```

### 2. Test API
```bash
curl https://api.olavoices.com
```

Should return HTML from your app.

### 3. Test from Frontend
Go to https://olavoices.com/audio-cleanup.html and test:
- Upload a file
- Check if it appears in admin panel
- Upload processed file
- Test preview
- Test payment (use test card: 4242 4242 4242 4242)

---

## Useful Commands

```bash
# View logs
pm2 logs audio-cleanup-service

# Restart server
pm2 restart audio-cleanup-service

# Stop server
pm2 stop audio-cleanup-service

# Check disk usage
df -h

# Monitor system resources
htop

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Update code from GitHub
cd /var/audio-cleanup/audio-cleanup-service
git pull
npm install
pm2 restart audio-cleanup-service
```

---

## Troubleshooting

### Issue: Can't connect to server
- Check firewall rules in Oracle Cloud
- Check if PM2 is running: `pm2 status`
- Check Nginx: `sudo systemctl status nginx`
- Check logs: `pm2 logs`

### Issue: File upload fails
- Check disk space: `df -h`
- Check file size limits in Nginx config
- Check PM2 logs for errors

### Issue: Stripe webhook not working
- Verify webhook secret in `.env`
- Check Stripe dashboard for webhook delivery attempts
- Check PM2 logs for webhook errors

---

## Cost: $0/month Forever! 🎉

Everything uses Oracle Cloud Always Free tier:
- Compute instance: FREE
- 200GB Block Volume: FREE
- Bandwidth (10TB/month): FREE
- SSL Certificate (Let's Encrypt): FREE
