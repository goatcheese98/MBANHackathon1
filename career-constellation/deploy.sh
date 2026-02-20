#!/bin/bash

# Career Constellation - Full Cloudflare Deployment Script
# Deploys both Frontend (Pages) and Backend (Workers)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Career Constellation - Cloudflare Deploy  ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Parse arguments
DEPLOY_TARGET=${1:-all}
ENVIRONMENT=${2:-production}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler is not installed${NC}"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Cloudflare. Initiating login...${NC}"
    wrangler login
fi

deploy_backend() {
    echo -e "${BLUE}--------------------------------------------${NC}"
    echo -e "${BLUE}  Deploying Backend (Cloudflare Workers)   ${NC}"
    echo -e "${BLUE}--------------------------------------------${NC}"
    
    cd backend-ts
    
    # Check if GEMINI_API_KEY is set
    if ! wrangler secret list | grep -q GEMINI_API_KEY; then
        echo -e "${YELLOW}Warning: GEMINI_API_KEY secret not found${NC}"
        echo -e "${YELLOW}RAG chat functionality will not work without it.${NC}"
        echo -e "${YELLOW}Set it with: npm run secret:gemini${NC}"
        echo ""
    fi
    
    echo -e "${GREEN}Building backend...${NC}"
    npm run build
    
    echo -e "${GREEN}Deploying worker...${NC}"
    if [ "$ENVIRONMENT" == "staging" ]; then
        npm run deploy:staging
    else
        npm run deploy
    fi
    
    cd ..
    echo -e "${GREEN}✓ Backend deployed successfully!${NC}"
    echo ""
}

deploy_frontend() {
    echo -e "${BLUE}--------------------------------------------${NC}"
    echo -e "${BLUE}  Deploying Frontend (Cloudflare Pages)    ${NC}"
    echo -e "${BLUE}--------------------------------------------${NC}"
    
    cd frontend
    
    # Check if API URL is set
    if [ -z "$VITE_API_URL" ]; then
        echo -e "${YELLOW}Warning: VITE_API_URL is not set${NC}"
        echo -e "${YELLOW}Frontend will try to use relative API paths.${NC}"
        echo -e "${YELLOW}Set it with: export VITE_API_URL=https://your-worker.workers.dev${NC}"
        echo ""
    fi
    
    echo -e "${GREEN}Installing dependencies...${NC}"
    npm install
    
    echo -e "${GREEN}Building frontend...${NC}"
    npm run build
    
    echo -e "${GREEN}Deploying to Pages...${NC}"
    if [ "$ENVIRONMENT" == "production" ]; then
        npm run deploy:prod
    else
        npm run deploy
    fi
    
    cd ..
    echo -e "${GREEN}✓ Frontend deployed successfully!${NC}"
    echo ""
}

# Main deployment logic
case $DEPLOY_TARGET in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        deploy_frontend
        echo -e "${GREEN}============================================${NC}"
        echo -e "${GREEN}  Full deployment completed successfully!   ${NC}"
        echo -e "${GREEN}============================================${NC}"
        ;;
    *)
        echo -e "${RED}Unknown deploy target: $DEPLOY_TARGET${NC}"
        echo "Usage: ./deploy.sh [backend|frontend|all] [production|staging]"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  - Check your deployments at: https://dash.cloudflare.com"
echo "  - View logs with: wrangler tail"
echo "  - Test your API at: $(wrangler deployment list 2>/dev/null | grep -o 'https://[^ ]*' | head -1 || echo 'your-worker-url')"
