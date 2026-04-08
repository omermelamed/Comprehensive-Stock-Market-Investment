dev:
	@trap 'kill 0' INT; \
	(set -a && . ./.env && set +a && cd backend && ./gradlew bootRun) & \
	(cd frontend && npm install --silent && npm run dev) & \
	wait
