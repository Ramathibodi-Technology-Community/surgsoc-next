.PHONY: dev build vercel-build start lint types typecheck check db-up db-reset db-seed db-migrate db-refresh test clean

# Dev
dev:
	pnpm run dev

# Build
build:
	pnpm run build

vercel-build:
	pnpm run vercel-build

# Start production server
start:
	pnpm run start

# Lint & Typecheck
lint:
	pnpm run lint
types:
	pnpm run generate:types
typecheck:
	pnpm run typecheck
check:
	pnpm run check

# Database
db-up:
	docker compose up -d payload-db

db-reset:
	pnpm run db:reset

db-seed:
	pnpm run db:seed

db-migrate:
	pnpm run db:migrate

db-refresh:
	pnpm run db:refresh

# Test
test:
	pnpm run test

# Clean
clean:
	rm -rf .next

fclean: clean
	rm -rf node_modules

re: clean build
