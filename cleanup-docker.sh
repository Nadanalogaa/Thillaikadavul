#!/bin/bash

# Cleanup script for Nadanaloga Docker containers
# This removes old containers to fix naming conflicts

echo "🧹 Cleaning up Nadanaloga Docker containers..."

# Stop all nadanaloga containers
echo "Stopping all nadanaloga containers..."
docker ps -a | grep nadanaloga | awk '{print $1}' | xargs -r docker stop

# Remove all nadanaloga containers
echo "Removing all nadanaloga containers..."
docker ps -a | grep nadanaloga | awk '{print $1}' | xargs -r docker rm

# Optional: Remove old volumes (uncomment if you want to start fresh)
# WARNING: This will delete all database data!
# echo "Removing nadanaloga volumes..."
# docker volume ls | grep nadanaloga | awk '{print $2}' | xargs -r docker volume rm

# Optional: Remove old networks
echo "Removing nadanaloga networks..."
docker network ls | grep nadanaloga | awk '{print $2}' | xargs -r docker network rm

echo "✅ Cleanup complete!"
echo ""
echo "Now you can deploy with:"
echo "  export BRANCH_NAME=main"
echo "  docker compose up -d --build"
echo ""
echo "Or for sub branch:"
echo "  export BRANCH_NAME=sub"
echo "  docker compose up -d --build"
