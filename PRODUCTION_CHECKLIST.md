# Production Checklist

Steps to complete before going to production:

- [ ] Set `SECRET_KEY` environment variable to a strong random value (e.g. `openssl rand -hex 32`)
- [ ] Change the default admin password (`admin` / `klline2025`)
- [ ] Set `CORS_ORIGINS` to the production domain only
- [ ] Set `APP_VERSION` and `VITE_APP_VERSION` to the current release tag
- [ ] Review and restrict database access (dedicated DB user, strong password, network policies)
- [ ] Enable HTTPS (TLS termination via ingress or reverse proxy)
- [ ] Set up monitoring and logging (application logs, health checks, alerting)
- [ ] Add rate limiting on the login endpoint (`POST /api/auth/login`)
