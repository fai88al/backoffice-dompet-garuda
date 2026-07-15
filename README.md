# backoffice-dompet-garuda

Admin backoffice frontend for Dompet Digital. See `CLAUDE.md` for the tech
stack, project structure, and development conventions.

## Deployment

This repo builds a standalone Docker image and pushes it to GHCR on every
push to `main`. The actual production stack — `docker-compose.prod.yml` and
the Caddy reverse proxy — lives in the **backend repository**, not here.

### 1. CI/CD (`.github/workflows/deploy.yml`)

Triggers on push to `main` and `workflow_dispatch`:

- **build-and-push** — builds the multi-stage `Dockerfile` and pushes to
  `ghcr.io/fai88al/backoffice-dompet-garuda` tagged `:latest` and
  `:<short-sha>`.
- **deploy** — SSHes into the VPS and runs
  `docker compose pull backoffice && docker compose up -d backoffice`.

Required repository secrets:

| Secret | Description |
| --- | --- |
| `VPS_HOST` | VPS hostname or IP (`72.60.74.117`) |
| `VPS_USERNAME` | SSH user |
| `VPS_SSH_KEY` | Private key for SSH auth |
| `VPS_PORT` | SSH port (optional, defaults to `22`) |
| `VPS_DEPLOY_PATH` | Absolute path on the VPS containing `docker-compose.prod.yml` |

`GITHUB_TOKEN` is provided automatically by Actions and used to authenticate
to GHCR — no separate secret needed.

### 2. Add the service to the backend's `docker-compose.prod.yml`

This repo doesn't own `docker-compose.prod.yml` — it lives in the backend
repository alongside the Spring Boot API and Caddy. Add a `backoffice`
service there:

```yaml
services:
  backoffice:
    image: ghcr.io/fai88al/backoffice-dompet-garuda:latest
    container_name: backoffice
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: https://api.dompetgaruda.com
    networks:
      - default # match whatever network Caddy/the API use to reach this service
```

Don't publish a host port — Caddy reverse-proxies to it over the Docker
network on port 3000.

### 3. Add `backoffice.dompetgaruda.com` to the Caddyfile

In the backend repo's Caddyfile, add a new site block:

```
backoffice.dompetgaruda.com {
    reverse_proxy backoffice:3000
}
```

Reload or restart Caddy after adding it, depending on how the backend repo
runs it (e.g. `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`).

### 4. DNS

Add an A record so the subdomain resolves to the same VPS as the rest of the
stack:

| Type | Name | Value |
| --- | --- | --- |
| A | `backoffice` | `72.60.74.117` |

### After merging this PR

This repo only builds and pushes the image — it doesn't touch the backend
repo. Once this PR is merged, open a companion PR against the **backend
repository** to:

1. Add the `backoffice` service block above to `docker-compose.prod.yml`.
2. Add the Caddyfile block above.
3. Confirm the DNS A record exists.

Once that's merged and deployed, the next push to `main` here (or a manual
`workflow_dispatch` run) will build, push, and deploy the image, and it'll be
reachable at `https://backoffice.dompetgaruda.com`.
