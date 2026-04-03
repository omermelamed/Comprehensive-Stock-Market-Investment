dev:
	@trap 'kill 0' INT; \
	(cd backend && ./gradlew bootRun) & \
	(cd frontend && npm install --silent && npm run dev) & \
	wait
