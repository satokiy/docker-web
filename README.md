# Docker Web

A web-based UI for managing and cleaning up Docker resources efficiently. This tool provides a better alternative to `docker image prune` by allowing you to selectively delete Docker containers, images, volumes, and networks.

## Features

- 📊 **Dashboard Overview**: View total counts and sizes of all Docker resources
- 🔍 **Search & Filter**: Quickly find specific resources
- ✅ **Selective Deletion**: Choose exactly which resources to delete
- 🎯 **Resource Types**: Manage containers, images, volumes, and networks
- 🔄 **Real-time Updates**: Refresh to see current Docker state

## Prerequisites

- Docker installed and running
- Bun runtime (https://bun.sh)
- Access to Docker socket

## Installation

1. Clone the repository:
```bash
git clone https://github.com/satokiy/docker-web.git
cd docker-web
```

2. Install dependencies:
```bash
bun install
```

3. Configure Docker socket path (optional):
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env to set your Docker socket path
# Default is /var/run/docker.sock
```

### Docker Socket Path Configuration

The application needs to connect to your Docker daemon. Set the `DOCKER_SOCKET_PATH` environment variable based on your setup:

- **Docker Desktop (macOS)**: `/Users/$USER/.docker/run/docker.sock`
- **Colima (macOS)**: `/Users/$USER/.colima/default/docker.sock`
- **Linux/WSL2**: `/var/run/docker.sock` (default)

Example:
```bash
# For Colima users
export DOCKER_SOCKET_PATH=/Users/$USER/.colima/default/docker.sock
bun run server.ts
```

## Usage

### Option 1: Start both servers with one command (Recommended)
```bash
bun run start
```
This will start both the backend server (port 3001) and frontend dev server simultaneously.

### Option 2: Start servers separately
1. Start the backend server (runs on port 3001):
```bash
bun run server
```

2. In a new terminal, start the frontend development server:
```bash
bun run dev
```

After starting the servers, open your browser to the URL shown in the terminal (typically http://localhost:5173 or http://localhost:3000)

## How to Use

1. **View Resources**: The dashboard shows all your Docker resources organized by type
2. **Select Resources**: Click checkboxes to select individual items or use "Select All"
3. **Search**: Use the search box to filter resources by name, image, or other attributes
4. **Delete**: Click "Delete Selected" to remove chosen resources
5. **Refresh**: Click "Refresh" to update the resource list

## Build for Production

```bash
bun run build
```

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Hono, Dockerode
- **Runtime**: Bun

## Safety Features

- Confirmation dialog before deletion
- Force deletion option for containers
- Error handling for failed deletions
- Real-time status updates

## License

MIT
