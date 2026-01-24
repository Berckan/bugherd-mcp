# BugHerd MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that integrates [BugHerd](https://bugherd.com) bug tracking with AI assistants.

## Features

**Complete BugHerd API v2 coverage** with 38 tools across all resource types:

- **Organization** - Get account details
- **Users** - List members, guests, user tasks and projects
- **Projects** - CRUD operations, manage members and guests
- **Tasks** - Full task management including feedback, archived, and taskboard views
- **Columns** - Custom Kanban board management
- **Comments** - Read and create comments
- **Attachments** - Manage file attachments
- **Webhooks** - Configure event notifications

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

### CLI Configuration

Add to your MCP client config:

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

### Desktop Apps

Add to your MCP desktop app config:

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

## Available Tools (37)

### Organization

| Tool                       | Description                      |
| -------------------------- | -------------------------------- |
| `bugherd_get_organization` | Get organization/account details |

### Users

| Tool                        | Description                       |
| --------------------------- | --------------------------------- |
| `bugherd_list_users`        | List all users (members + guests) |
| `bugherd_list_members`      | List only team members            |
| `bugherd_list_guests`       | List only guests/clients          |
| `bugherd_get_user_tasks`    | Get tasks assigned to a user      |
| `bugherd_get_user_projects` | Get projects for a user           |

### Projects

| Tool                           | Description                     |
| ------------------------------ | ------------------------------- |
| `bugherd_list_projects`        | List all projects               |
| `bugherd_list_active_projects` | List only active projects       |
| `bugherd_get_project`          | Get project details             |
| `bugherd_create_project`       | Create a new project            |
| `bugherd_update_project`       | Update project settings         |
| `bugherd_delete_project`       | ⚠️ Delete a project permanently |
| `bugherd_add_member`           | Add a member to a project       |
| `bugherd_add_guest`            | Add a guest to a project        |

### Tasks

| Tool                           | Description                                     |
| ------------------------------ | ----------------------------------------------- |
| `bugherd_list_tasks`           | List tasks with filters (status, priority, tag) |
| `bugherd_list_feedback_tasks`  | List unprocessed feedback tasks                 |
| `bugherd_list_archived_tasks`  | List archived tasks                             |
| `bugherd_list_taskboard_tasks` | List taskboard tasks                            |
| `bugherd_get_task`             | Get task details with metadata                  |
| `bugherd_get_task_global`      | Get task by global ID                           |
| `bugherd_get_task_by_local_id` | Get task by local ID (#123)                     |
| `bugherd_create_task`          | Create a new task                               |
| `bugherd_move_tasks`           | Move tasks between projects                     |
| `bugherd_update_task`          | Update task status/priority/description         |

### Columns

| Tool                    | Description                            |
| ----------------------- | -------------------------------------- |
| `bugherd_list_columns`  | List project columns (Kanban statuses) |
| `bugherd_get_column`    | Get column details                     |
| `bugherd_create_column` | Create a new column                    |
| `bugherd_update_column` | Update column name/position            |

### Comments

| Tool                     | Description             |
| ------------------------ | ----------------------- |
| `bugherd_list_comments`  | List comments on a task |
| `bugherd_create_comment` | Add a comment to a task |

### Attachments

| Tool                        | Description                |
| --------------------------- | -------------------------- |
| `bugherd_list_attachments`  | List task attachments      |
| `bugherd_get_attachment`    | Get attachment details     |
| `bugherd_create_attachment` | Create attachment from URL |
| `bugherd_delete_attachment` | ⚠️ Delete an attachment    |

### Webhooks

| Tool                     | Description              |
| ------------------------ | ------------------------ |
| `bugherd_list_webhooks`  | List configured webhooks |
| `bugherd_create_webhook` | Create a webhook         |
| `bugherd_delete_webhook` | ⚠️ Delete a webhook      |

## Usage Examples

### List projects and tasks

```
List my BugHerd projects
Show me all critical bugs in project 12345
```

### Create and manage tasks

```
Create a task in project 12345: "Fix the login button alignment"
Move task 678 from project 12345 to project 67890
Update task 678 status to "done"
```

### Work with comments

```
Show comments on task 678 in project 12345
Add a comment to task 678: "Fixed in latest deploy"
```

### Manage webhooks

```
List all webhooks
Create a webhook for task_create events pointing to https://example.com/webhook
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
