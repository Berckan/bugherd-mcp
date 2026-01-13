# BugHerd MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that integrates [BugHerd](https://bugherd.com) bug tracking with AI assistants like Claude.

## Features

- **List Projects** - View all BugHerd projects accessible to your account
- **List Tasks** - Browse bugs and feedback with filtering by status, priority, and tags
- **Get Task Details** - View complete task information including screenshots and element selectors
- **List Comments** - Read conversation threads on tasks

## Installation

### Prerequisites

- Node.js 18+ or Bun
- A BugHerd account with API access
- BugHerd API key (get it from Settings > General Settings)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/berckan/bugherd-mcp.git
cd bugherd-mcp
```

2. Install dependencies:

```bash
bun install
# or
npm install
```

3. Build the server:

```bash
bun run build
# or
npm run build
```

4. Set your API key:

```bash
export BUGHERD_API_KEY=your-api-key-here
```

## Configuration

### Claude Code

Add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "bugherd": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/bugherd-mcp/dist/index.js"],
      "env": {
        "BUGHERD_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "bugherd": {
      "command": "node",
      "args": ["/path/to/bugherd-mcp/dist/index.js"],
      "env": {
        "BUGHERD_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### `bugherd_list_projects`

List all BugHerd projects accessible to the authenticated user.

**Parameters:** None

**Example:**

```
List my BugHerd projects
```

### `bugherd_list_tasks`

List tasks for a specific project with optional filters.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | number | Yes | The BugHerd project ID |
| `status` | string | No | Filter: backlog, todo, doing, done, closed |
| `priority` | string | No | Filter: critical, important, normal, minor |
| `tag` | string | No | Filter by tag name |
| `page` | number | No | Page number for pagination |

**Example:**

```
Show me all critical bugs in project 12345
```

### `bugherd_get_task`

Get detailed information about a specific task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | number | Yes | The BugHerd project ID |
| `task_id` | number | Yes | The task ID |

**Example:**

```
Get details for task 678 in project 12345
```

### `bugherd_list_comments`

List all comments on a specific task.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_id` | number | Yes | The BugHerd project ID |
| `task_id` | number | Yes | The task ID |

**Example:**

```
Show comments on task 678 in project 12345
```

## Development

### Run in development mode:

```bash
bun run dev
```

### Test with MCP Inspector:

```bash
BUGHERD_API_KEY=xxx bun run inspector
```

### Build for production:

```bash
bun run build
```

## API Rate Limits

BugHerd allows an average of 60 requests per minute with bursts of up to 10 in quick succession. The server handles rate limiting errors gracefully.

## License

MIT

## Author

[Berckan Guerrero](https://github.com/berckan) (hi@berck.io)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Related

- [BugHerd API Documentation](https://www.bugherd.com/api_v2)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
