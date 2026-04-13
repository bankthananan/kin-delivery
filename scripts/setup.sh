#!/bin/bash
set -e

echo "🍜 Kin Delivery — Setup"
echo "========================"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required. Run: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required. Install from https://docker.com"; exit 1; }

# Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example"
else
  echo "⊘ .env already exists, skipping"
fi

# Start Docker services
echo "Starting PostgreSQL and Redis..."
docker-compose up -d
echo "✓ Docker services started"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U kin > /dev/null 2>&1; do
  sleep 1
done
echo "✓ PostgreSQL ready"

# Install dependencies
echo "Installing dependencies..."
pnpm install
echo "✓ Dependencies installed"

# Run database migrations
echo "Running database migrations..."
pnpm db:migrate
echo "✓ Migrations applied"

# Seed database
echo "Seeding database..."
pnpm db:seed
echo "✓ Database seeded"

echo ""
echo "🎉 Setup complete! Run 'pnpm dev' to start all apps."
