# Career Constellation - Cloudflare Deployment Guide

This guide covers deploying the Career Constellation application to Cloudflare's edge network.

## Architecture

- **Frontend**: Cloudflare Pages (Static site hosting)
- **Backend**: Cloudflare Workers (Serverless API)
- **Data**: Bundled JSON files (constellation_data.json, stats_data.json)

## Prerequisites

1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. Logged in to Cloudflare: `wrangler login`

## Environment Variables

### Frontend (Vite)

Create a `.env` file in the `frontend/` directory:

```bash
# Production API URL (your deployed Worker URL)
VITE_API_URL=https://career-constellation-api.your-account.workers.dev
```

### Backend (Worker Secrets)

Set secrets via Wrangler (not in `.env` files):

```bash
cd backend-ts
wrangler secret put GEMINI_API_KEY
# Enter your Google Gemini API key when prompted
```

## Deployment Steps

### Option 1: Automated Deploy Script

```bash
# Deploy everything (backend + frontend)
./deploy.sh all production

# Deploy only backend
./deploy.sh backend production

# Deploy only frontend
./deploy.sh frontend production
```

### Option 2: Manual Deployment

#### Deploy Backend (Worker)

```bash
cd backend-ts

# Set required secrets
wrangler secret put GEMINI_API_KEY

# Deploy
npm run deploy

# Or for staging
npm run deploy:staging
```

Your Worker will be available at: `https://career-constellation-api.your-account.workers.dev`

#### Deploy Frontend (Pages)

```bash
cd frontend

# Install dependencies
npm install

# Set API URL for production build
export VITE_API_URL=https://career-constellation-api.your-account.workers.dev

# Build
npm run build

# Deploy to Pages
npm run deploy:prod
```

Your site will be available at: `https://career-constellation.pages.dev`

## Post-Deployment Configuration

### 1. Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Pages → career-constellation
2. Click "Custom domains" tab
3. Add your domain and follow DNS setup instructions

### 2. Update CORS Settings

If using a custom domain, update `backend-ts/worker.ts`:

```typescript
app.use('*', cors({
  origin: ['https://career-constellation.pages.dev', 'https://your-domain.com'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));
```

### 3. Configure Environment Variables in Cloudflare Dashboard

For production, you can set environment variables in the Cloudflare Dashboard instead of local `.env` files:

**Pages (Frontend)**:
1. Go to Cloudflare Dashboard → Pages → career-constellation → Settings → Environment variables
2. Add `VITE_API_URL` with your Worker URL

**Workers (Backend)**:
1. Go to Cloudflare Dashboard → Workers & Pages → career-constellation-api → Settings → Variables
2. Add `GEMINI_API_KEY` as an encrypted secret

## Verification

After deployment, verify everything works:

```bash
# Test backend API
curl https://career-constellation-api.your-account.workers.dev/

# Test frontend (open in browser)
open https://career-constellation.pages.dev
```

## Troubleshooting

### Build Failures

**Issue**: `Cannot find module '../data/constellation_data.json'`
- Ensure the `data/` directory exists at the project root
- Check that symlinks in `frontend/public/` are valid

**Issue**: `GEMINI_API_KEY not found`
- The secret must be set via `wrangler secret put`, not in `.env`
- Check with: `wrangler secret list`

### Runtime Issues

**Issue**: CORS errors in browser
- Update the CORS origin in `worker.ts` to match your frontend domain
- Redeploy the worker after changes

**Issue**: Chat not working
- Verify `GEMINI_API_KEY` is set: `wrangler secret list`
- Check Worker logs: `wrangler tail`

### Viewing Logs

```bash
cd backend-ts
wrangler tail
```

## Rollback

To rollback a deployment:

**Worker**:
```bash
wrangler rollback
```

**Pages**:
Pages deployments are atomic. To rollback:
1. Go to Cloudflare Dashboard → Pages
2. Select your project
3. Go to "Deployments" tab
4. Find the previous working deployment
5. Click "..." → "Rollback to this deployment"

## Development vs Production

| Feature | Development | Production |
|---------|------------|------------|
| Frontend | `npm run dev` (port 3000) | Cloudflare Pages |
| Backend | `npm run dev` (port 8000) | Cloudflare Workers |
| API URL | Proxied via Vite | `VITE_API_URL` env var |
| Data | Local JSON files | Bundled in deployment |
| AI Chat | Requires local backend | Requires `GEMINI_API_KEY` secret |

## Architecture Notes

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Cloudflare     │────▶│  Cloudflare      │────▶│  Google Gemini  │
│  Pages          │     │  Workers         │     │  API            │
│  (Frontend)     │◀────│  (Backend)       │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Bundled JSON    │
                        │  constellation   │
                        │  _data.json      │
                        └──────────────────┘
```

### Key Design Decisions

1. **Static Data**: Job data is bundled at build time for fast access
2. **Edge Deployment**: Both frontend and backend run on Cloudflare's edge network
3. **RAG Chat**: AI chat feature requires the Gemini API key to be set
4. **CORS**: Backend allows requests from the frontend domain

## Support

- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Cloudflare Pages docs: https://developers.cloudflare.com/pages/
- Wrangler CLI docs: https://developers.cloudflare.com/workers/wrangler/
