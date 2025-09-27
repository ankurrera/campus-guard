# Deployment Guide

This React SPA (Single Page Application) uses React Router for client-side routing. When deployed, the server needs to be configured to serve the `index.html` file for all routes to avoid 404 errors when users navigate directly to routes like `/student/signup`.

## Deployment Configurations

### Vercel
The `vercel.json` file configures Vercel to rewrite all requests to `index.html`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Netlify
The `netlify.toml` and `public/_redirects` files configure Netlify:

**netlify.toml:**
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**public/_redirects:**
```
/*    /index.html   200
```

### Apache (Shared Hosting)
The `public/.htaccess` file configures Apache servers:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

## Alternative: Hash Router

If you continue to experience routing issues, you can use hash-based routing by running:

```bash
npm run build:hash
```

This will temporarily switch to HashRouter, build the app, then restore the original routing configuration.

## Common Issues

### 404 on Direct Navigation
**Problem:** Navigating directly to `/student/signup` returns 404 NOT_FOUND
**Solution:** Ensure your deployment platform serves `index.html` for all routes using the configurations above.

### Missing Deployment Configuration
**Problem:** Error IDs like "bom1::pmh9r-***" suggest deployment platform errors
**Solution:** Add the appropriate configuration file for your deployment platform.