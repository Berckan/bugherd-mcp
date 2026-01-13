#!/usr/bin/env node
/**
 * BugHerd MCP Server
 *
 * An MCP server that provides tools to interact with BugHerd's bug tracking API.
 * Enables Claude to list projects, view tasks, and read feedback from BugHerd.
 *
 * @author Berckan Guerrero <hi@berck.io>
 * @license MIT
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";

import {
  listProjects,
  listTasks,
  getTask,
  listComments,
  verifyConnection,
  type ListTasksOptions,
} from "./api/client.js";
import { getStatusName, getPriorityName } from "./types/bugherd.js";

// ============================================================================
// Server Setup
// ============================================================================

const server = new Server(
  {
    name: "bugherd-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ============================================================================
// Tool Schemas (Zod)
// ============================================================================

const ListProjectsSchema = z.object({});

const ListTasksSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  status: z
    .enum(["backlog", "todo", "doing", "done", "closed"])
    .optional()
    .describe("Filter by task status"),
  priority: z
    .enum(["critical", "important", "normal", "minor"])
    .optional()
    .describe("Filter by priority"),
  tag: z.string().optional().describe("Filter by tag name"),
  page: z.number().optional().describe("Page number for pagination"),
});

const GetTaskSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID to retrieve"),
});

const ListCommentsSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID to get comments for"),
});

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  {
    name: "bugherd_list_projects",
    description:
      "List all BugHerd projects accessible to the authenticated user. Returns project names, URLs, and IDs.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bugherd_list_tasks",
    description:
      "List tasks (bugs/feedback) for a specific BugHerd project. Can filter by status, priority, or tag.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: {
          type: "number",
          description: "The BugHerd project ID",
        },
        status: {
          type: "string",
          enum: ["backlog", "todo", "doing", "done", "closed"],
          description: "Filter by task status",
        },
        priority: {
          type: "string",
          enum: ["critical", "important", "normal", "minor"],
          description: "Filter by priority",
        },
        tag: {
          type: "string",
          description: "Filter by tag name",
        },
        page: {
          type: "number",
          description: "Page number for pagination (default: 1)",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "bugherd_get_task",
    description:
      "Get detailed information about a specific task including description, screenshot URL, selector info, and metadata.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: {
          type: "number",
          description: "The BugHerd project ID",
        },
        task_id: {
          type: "number",
          description: "The task ID to retrieve",
        },
      },
      required: ["project_id", "task_id"],
    },
  },
  {
    name: "bugherd_list_comments",
    description:
      "List all comments on a specific task. Returns comment text, author, and timestamp.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: {
          type: "number",
          description: "The BugHerd project ID",
        },
        task_id: {
          type: "number",
          description: "The task ID to get comments for",
        },
      },
      required: ["project_id", "task_id"],
    },
  },
];

// ============================================================================
// Request Handlers
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Verify connection on first call
    const connected = await verifyConnection();
    if (!connected) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: Unable to connect to BugHerd API. Check your BUGHERD_API_KEY environment variable.",
          },
        ],
        isError: true,
      };
    }

    switch (name) {
      // ====================================================================
      // bugherd_list_projects
      // ====================================================================
      case "bugherd_list_projects": {
        const result = await listProjects();
        const projects = result.projects;

        if (projects.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No projects found. Make sure your API key has access to at least one project.",
              },
            ],
          };
        }

        const projectList = projects
          .map(
            (p) =>
              `- **${p.name}** (ID: ${p.id})\n  URL: ${p.devurl}\n  Active: ${p.is_active ? "Yes" : "No"}`,
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `## BugHerd Projects (${projects.length})\n\n${projectList}`,
            },
          ],
        };
      }

      // ====================================================================
      // bugherd_list_tasks
      // ====================================================================
      case "bugherd_list_tasks": {
        const parsed = ListTasksSchema.parse(args);
        const options: ListTasksOptions = {
          status: parsed.status,
          priority: parsed.priority,
          tag: parsed.tag,
          page: parsed.page,
        };

        const result = await listTasks(parsed.project_id, options);
        const tasks = result.tasks;
        const meta = result.meta;

        if (tasks.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No tasks found matching the criteria.",
              },
            ],
          };
        }

        const taskList = tasks
          .map((t) => {
            const status = getStatusName(t.status_id);
            const priority = getPriorityName(t.priority_id);
            const tags =
              t.tag_names.length > 0 ? t.tag_names.join(", ") : "none";
            const description =
              t.description.length > 100
                ? t.description.substring(0, 100) + "..."
                : t.description;

            return `### Task #${t.local_task_id} (ID: ${t.id})
- **Status:** ${status}
- **Priority:** ${priority}
- **Tags:** ${tags}
- **Created:** ${t.created_at}
- **Description:** ${description}
- [View in BugHerd](${t.admin_link})`;
          })
          .join("\n\n");

        const pagination = `Page ${meta.current_page} of ${meta.total_pages} (${meta.count} total tasks)`;

        return {
          content: [
            {
              type: "text" as const,
              text: `## Tasks for Project ${parsed.project_id}\n\n${pagination}\n\n${taskList}`,
            },
          ],
        };
      }

      // ====================================================================
      // bugherd_get_task
      // ====================================================================
      case "bugherd_get_task": {
        const parsed = GetTaskSchema.parse(args);
        const result = await getTask(parsed.project_id, parsed.task_id);
        const task = result.task;

        const status = getStatusName(task.status_id);
        const priority = getPriorityName(task.priority_id);
        const tags =
          task.tag_names.length > 0 ? task.tag_names.join(", ") : "none";

        let selectorInfo = "Not available";
        if (task.selector_info) {
          selectorInfo = `URL: ${task.selector_info.url}\nSelector: \`${task.selector_info.selector}\``;
        }

        const output = `## Task #${task.local_task_id}

**Status:** ${status}
**Priority:** ${priority}
**Tags:** ${tags}
**Created:** ${task.created_at}
**Updated:** ${task.updated_at}
**Requester:** ${task.requester_email}
**Assigned To:** ${task.assigned_to_id ?? "Unassigned"}

### Description
${task.description}

### Screenshot
${task.screenshot ?? "No screenshot available"}

### Element Info
${selectorInfo}

### Links
- [View in BugHerd](${task.admin_link})`;

        return {
          content: [
            {
              type: "text" as const,
              text: output,
            },
          ],
        };
      }

      // ====================================================================
      // bugherd_list_comments
      // ====================================================================
      case "bugherd_list_comments": {
        const parsed = ListCommentsSchema.parse(args);
        const result = await listComments(parsed.project_id, parsed.task_id);
        const comments = result.comments;

        if (comments.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No comments on this task.",
              },
            ],
          };
        }

        const commentList = comments
          .map(
            (c) => `**${c.user.display_name}** (${c.created_at}):\n> ${c.text}`,
          )
          .join("\n\n---\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `## Comments on Task ${parsed.task_id} (${comments.length})\n\n${commentList}`,
            },
          ],
        };
      }

      // ====================================================================
      // Unknown Tool
      // ====================================================================
      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BugHerd MCP Server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
