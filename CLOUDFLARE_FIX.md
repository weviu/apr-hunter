# Cloudflare 502 Bad Gateway Fix

## Problem Summary
When accessing the app via the domain name (aprhunter.route07.com) through Cloudflare, you get a 502 Bad Gateway error. However, accessing via the IP address (77.42.73.172:3000) works perfectly.

## Root Cause
The issue was at the **infrastructure/proxy level**:
1. Next.js app was running on port 3000 and only accepting requests on `localhost`
2. Nginx was configured to serve static files, not proxy to the app
3. Cloudflare was trying to reach the app but had no way to get to port 3000

## Solutions Implemented

### 1. **Middleware Updates** (src/middleware.ts)
- Added request logging to capture detailed information about incoming requests
- Improved Cloudflare header detection (X-Forwarded-Host, CF-Ray, etc.)
- Added support for host validation (optional, can be disabled)

### 2. **Environment Configuration**
- Updated `.env.local` and `.env.server` with `ALLOWED_HOSTS` configuration
- Included server IP (77.42.73.172) in the allowed hosts list
- Added `NEXT_PUBLIC_APP_ENV=production` setting

### 3. **Nginx Reverse Proxy** ⭐ **KEY FIX**
Updated `/etc/nginx/sites-available/default` to reverse proxy all traffic to the Next.js app:

```nginx
upstream nextjs_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    location / {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        
        # Required headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Verification Steps

### ✅ Direct IP Access (Bypasses Cloudflare)
```bash
curl -s -X POST http://77.42.73.172:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
# Response: {"success":false,"error":"Invalid credentials"}
```

### ✅ Via Nginx Reverse Proxy
```bash
curl -s -X POST http://77.42.73.172:80/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Host: aprhunter.route07.com" \
  -d '{"email":"test@example.com","password":"password"}'
# Response: {"success":false,"error":"Invalid credentials"}
```

## Remaining Cloudflare Issue

If you're still getting 502 via Cloudflare HTTPS, check:

1. **Cloudflare SSL/TLS Settings**:
   - Go to Cloudflare Dashboard → SSL/TLS
   - Ensure encryption mode is set correctly for your origin
   - Try "Flexible" mode temporarily to test (not recommended for production)

2. **Origin Server Configuration in Cloudflare**:
   - Ensure the origin is set to: `aprhunter.route07.com`
   - Port should be: `80` (HTTP) or `443` (HTTPS if enabled)
   - Check that your origin server IP is correct: `77.42.73.172`

3. **DNS Configuration**:
   - Verify your domain points to Cloudflare nameservers
   - Ensure the DNS record is proxied (orange cloud, not gray)

4. **Firewall Rules**:
   - Check if Cloudflare firewall rules are blocking requests
   - Verify no WAF rules are interfering

## Testing Checklist

- [x] App works via direct IP (127.0.0.1:3000)
- [x] App works via IP with nginx proxy (77.42.73.172:80)
- [x] Middleware properly logs requests
- [x] Database connection works
- [ ] HTTPS works via domain name
- [ ] Cloudflare is properly forwarding requests to your origin

## Files Changed

1. `src/middleware.ts` - Added request logging and host validation
2. `.env.local` - Added ALLOWED_HOSTS and NEXT_PUBLIC_APP_ENV
3. `.env.server` - Added ALLOWED_HOSTS and NEXT_PUBLIC_APP_ENV
4. `src/lib/env.ts` - Added ALLOWED_HOSTS to environment schema
5. `/etc/nginx/sites-available/default` - Configured reverse proxy
6. `next.config.js` - Minor cleanup (removed invalid options)

## Next Steps

1. **Verify Cloudflare Configuration**:
   - Check Dashboard → DNS Records
   - Check Dashboard → SSL/TLS settings
   - Verify origin server is reachable

2. **Test HTTPS**:
   - Once Cloudflare verifies your origin, HTTPS should work automatically

3. **Monitor Logs**:
   - Watch PM2 logs for any errors: `pm2 logs apr-hunter`
   - Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## Commands for Troubleshooting

```bash
# Check app is running
pm2 status

# View recent logs
pm2 logs apr-hunter --lines 50

# Test nginx configuration
sudo nginx -t

# Reload nginx after changes
sudo systemctl reload nginx

# Check if port 3000 is listening
ss -tlnp | grep 3000

# Test direct connection to Next.js app
curl -v http://localhost:3000/api/auth/login

# Test connection through nginx
curl -v http://127.0.0.1:80/api/auth/login
```

## Production Considerations

1. **HTTPS**:
   - Consider using Cloudflare's SSL/TLS for encryption between Cloudflare and your origin
   - Or set up Let's Encrypt certificates on your server

2. **Security**:
   - The middleware can block unauthorized hosts if needed (currently disabled)
   - Consider adding rate limiting in nginx

3. **Performance**:
   - Enable caching headers for static assets
   - Consider enabling compression in nginx

4. **Monitoring**:
   - Set up log rotation for nginx/PM2 logs
   - Monitor server CPU and memory usage
   - Set up alerts for application failures
