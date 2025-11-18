<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AL ANSHOR VEO GENERATOR

This is an advanced web application to generate high-quality videos from text prompts and reference images using Google's AI models. Customize aspect ratio, sound, and resolution for the perfect video output.

## 1. Local Installation Guide (for Development)

Follow these steps to run the application on your own computer.

### Step 1: Download and Extract
Download the project ZIP file from the repository and extract it to a location of your choice (e.g., `D:\Projects`).
[Download Link](https://github.com/tokoalanshor2020-source/Al-Anshor-Generator/archive/refs/heads/main.zip)

### Step 2: Open Command Prompt
Navigate into the extracted project folder. In the file explorer's address bar, type `cmd` and press Enter. This will open a command prompt in the correct directory.

### Step 3: Install Dependencies
In the command prompt, run the following command to install all the necessary packages:
```bash
npm install
```

### Step 4: Run the Development Server
Start the application with this command:
```bash
npm run dev
```
You should see output similar to this, indicating the server is running:
```
  VITE vX.X.X  ready in XXXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```
Open your web browser and go to **http://localhost:5173/**.

### Step 5: Configure API Key
The first time you run the app, you will be prompted to enter your Google AI API Key.
1. A modal will appear asking for your key. Paste your Google AI API Key into the input field.
2. Click "Validate & Save Key". The application will verify the key.
3. Once validated, the key is saved in your browser's local storage, and you won't need to enter it again. The app is now ready to use!

---

## 2. VPS Deployment Guide (for Production)

This guide provides step-by-step instructions to deploy the AL ANSHOR VEO GENERATOR on a VPS running Ubuntu, using Nginx as a reverse proxy and PM2 to keep the application running 24/7.

### Prerequisites
- A VPS server with Ubuntu (20.04 LTS or newer).
- Root access or a user with `sudo` privileges.
- A domain name pointed to your VPS IP address (recommended).

### Step 1: Update System & Install Tools
Connect to your VPS and run these commands to update your system and install essential tools.
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx
```

### Step 2: Install Node.js, NPM, and PM2
We'll install Node.js (v18 LTS) and the PM2 process manager.
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```
Verify the installations:
```bash
node -v
npm -v
pm2 -v
```

### Step 3: Clone and Build the Application
Clone the project repository from GitHub and build it for production.
```bash
# Create a directory for web projects and navigate into it
sudo mkdir -p /var/www
cd /var/www

# Clone the repository
sudo git clone https://github.com/tokoalanshor2020-source/Al-Anshor-Generator.git alanshor
cd alanshor

# Install project dependencies
sudo npm install

# Build the application for production
sudo npm run build
```

### Step 4: Run the App with PM2
We will use PM2 to run the production-ready server that Vite provides.
```bash
# Start the app using Vite's preview server, making it accessible on the network
pm2 start "npm run preview -- --host" --name "alanshor"

# Check the status to ensure it's running
pm2 status

# Configure PM2 to restart automatically on server reboot
pm2 startup
# Follow the on-screen instructions, which will give you a command to run.
pm2 save
```
**Useful PM2 Commands:**
-   View application logs: `pm2 logs alanshor`
-   Restart the application: `pm2 restart alanshor`
-   Stop the application: `pm2 stop alanshor`

### Step 5: Configure Nginx as a Reverse Proxy
Create an Nginx configuration file to direct traffic from your domain to the running application.
```bash
sudo nano /etc/nginx/sites-available/alanshor.conf
```
Paste the following configuration, replacing `your_domain` with your actual domain name.
```nginx
server {
    listen 80;
    server_name your_domain www.your_domain;

    location / {
        # The default port for 'npm run preview' is 4173
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Save the file (CTRL+O, Enter) and exit (CTRL+X).

Activate the new configuration and restart Nginx.
```bash
# Create a symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/alanshor.conf /etc/nginx/sites-enabled/

# Test the Nginx configuration for errors
sudo nginx -t

# If the test is successful, reload Nginx
sudo systemctl reload nginx
```

### Step 6: Secure with SSL (HTTPS)
If you have a domain, use Certbot to get a free SSL certificate from Let's Encrypt.
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install the certificate
sudo certbot --nginx -d your_domain -d www.your_domain
```
Follow the prompts. Certbot will automatically update your Nginx configuration to handle HTTPS.

Your application should now be live and accessible at `https://your_domain`.

### Step 7: API Key Configuration on Live Site
The application requires a Google AI API Key to function. Unlike a typical server-side setup, you don't configure this on the server.

- **Browser-Based Storage:** The API key is stored in each user's individual browser (`localStorage`).
- **First-Time Prompt:** When a user visits your domain for the first time, they will be prompted by the application to enter their own Google AI API Key.
- **No Server-Side Key:** You do not need to set up any environment variables or server-side configurations for the API key.

### How to Update the Project on VPS
To update the application with the latest changes from GitHub, run these commands:
```bash
cd /var/www/alanshor
sudo git pull
sudo npm install
sudo npm run build
pm2 restart alanshor
```