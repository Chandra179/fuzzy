# Define the image name
IMAGE_NAME = playwright-app

# Build and run using Docker Compose
build:
	docker compose build

run:
	docker compose run --rm playwright

# Build and run in one command
start: build run

# Clean up Docker images and containers
clean:
	docker compose down --rmi all
	docker compose rm -f