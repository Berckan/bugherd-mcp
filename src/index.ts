#!/usr/bin/env node
/**
 * BugHerd MCP Server
 *
 * An MCP server that provides tools to interact with BugHerd's bug tracking API.
 * Enables AI assistants to list projects, view tasks, and read feedback from BugHerd.
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
  // Organization
  getOrganization,
  // Users
  listUsers,
  listMembers,
  listGuests,
  getUserTasks,
  getUserProjects,
  // Projects
  listProjects,
  listActiveProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  addGuest,
  // Tasks
  listTasks,
  getTask,
  getTaskGlobal,
  getTaskByLocalId,
  listFeedbackTasks,
  listArchivedTasks,
  listTaskboardTasks,
  createTask,
  moveTasks,
  updateTask,
  // Columns
  listColumns,
  getColumn,
  createColumn,
  updateColumn,
  // Comments
  listComments,
  createComment,
  // Attachments
  listAttachments,
  getAttachment,
  createAttachment,
  uploadAttachment,
  deleteAttachment,
  // Webhooks
  listWebhooks,
  createWebhook,
  deleteWebhook,
  // Utils
  verifyConnection,
  getStatusNameForProject,
  type ListTasksOptions,
  type UpdateTaskOptions,
  type CreateProjectData,
  type UpdateProjectData,
  type CreateTaskData,
  type CreateColumnData,
  type UpdateColumnData,
  type CreateCommentData,
  type CreateAttachmentData,
  type CreateWebhookData,
  type ListUserTasksOptions,
} from "./api/client.js";
import { getPriorityName, type BugherdWebhookEvent } from "./types/bugherd.js";

// ============================================================================
// Server Setup
// ============================================================================

const server = new Server(
  {
    name: "bugherd-mcp",
    version: "0.2.0",
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

// Organization
const GetOrganizationSchema = z.object({});

// Users
const ListUsersSchema = z.object({});
const ListMembersSchema = z.object({});
const ListGuestsSchema = z.object({});

const GetUserTasksSchema = z.object({
  user_id: z.number().describe("The user ID"),
  status: z.string().optional().describe("Filter by status"),
  priority: z
    .enum(["critical", "important", "normal", "minor"])
    .optional()
    .describe("Filter by priority"),
  page: z.number().optional().describe("Page number for pagination"),
});

const GetUserProjectsSchema = z.object({
  user_id: z.number().describe("The user ID"),
});

// Projects
const ListProjectsSchema = z.object({});
const ListActiveProjectsSchema = z.object({});

const GetProjectSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
});

const CreateProjectSchema = z.object({
  name: z.string().describe("Project name"),
  devurl: z.string().describe("Development URL for the project"),
  is_active: z.boolean().optional().describe("Whether the project is active"),
  is_public: z.boolean().optional().describe("Whether the project is public"),
});

const UpdateProjectSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  name: z.string().optional().describe("New project name"),
  devurl: z.string().optional().describe("New development URL"),
  is_active: z.boolean().optional().describe("Whether the project is active"),
  is_public: z.boolean().optional().describe("Whether the project is public"),
});

const DeleteProjectSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID to delete"),
});

const AddMemberSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  user_id: z.number().describe("The user ID to add as member"),
});

const AddGuestSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  user_id: z.number().optional().describe("The user ID to add as guest"),
  email: z.string().optional().describe("Email of the guest to add"),
});

// Tasks
const ListTasksSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  status: z
    .string()
    .optional()
    .describe(
      "Filter by task status (use column name from bugherd_list_columns, e.g., 'backlog', 'todo', 'doing', 'Ready for review', 'done')",
    ),
  priority: z
    .enum(["critical", "important", "normal", "minor"])
    .optional()
    .describe("Filter by priority"),
  tag: z.string().optional().describe("Filter by tag name"),
  page: z.number().optional().describe("Page number for pagination"),
});

const ListFeedbackTasksSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  page: z.number().optional().describe("Page number for pagination"),
});

const ListArchivedTasksSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  page: z.number().optional().describe("Page number for pagination"),
});

const ListTaskboardTasksSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  page: z.number().optional().describe("Page number for pagination"),
});

const GetTaskSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID to retrieve"),
});

const GetTaskGlobalSchema = z.object({
  task_id: z.number().describe("The global task ID"),
});

const GetTaskByLocalIdSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  local_task_id: z.number().describe("The local task ID (#123)"),
});

const CreateTaskSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  description: z.string().describe("Task description"),
  priority: z
    .enum(["critical", "important", "normal", "minor"])
    .optional()
    .describe("Task priority"),
  status: z.string().optional().describe("Task status/column name"),
  tag_names: z.array(z.string()).optional().describe("Tags for the task"),
  assigned_to_id: z.number().optional().describe("User ID to assign task to"),
  requester_email: z.string().optional().describe("Email of the requester"),
  external_id: z.string().optional().describe("External reference ID"),
});

const MoveTasksSchema = z.object({
  project_id: z.number().describe("The source project ID"),
  task_ids: z.array(z.number()).describe("Array of task IDs to move"),
  destination_project_id: z.number().describe("The destination project ID"),
});

const UpdateTaskSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID to update"),
  status: z
    .string()
    .optional()
    .describe(
      "New status for the task (use column name from bugherd_list_columns)",
    ),
  priority: z
    .enum(["critical", "important", "normal", "minor"])
    .optional()
    .describe("New priority for the task"),
  description: z.string().optional().describe("New description for the task"),
});

// Columns
const ListColumnsSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
});

const GetColumnSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  column_id: z.number().describe("The column ID"),
});

const CreateColumnSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  name: z.string().describe("Column name"),
  position: z.number().optional().describe("Column position"),
});

const UpdateColumnSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  column_id: z.number().describe("The column ID to update"),
  name: z.string().optional().describe("New column name"),
  position: z.number().optional().describe("New column position"),
});

// Comments
const ListCommentsSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID to get comments for"),
});

const CreateCommentSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID"),
  text: z.string().describe("Comment text"),
  user_id: z.number().optional().describe("User ID posting the comment"),
  email: z
    .string()
    .optional()
    .describe("Email of the user posting the comment"),
});

// Attachments
const ListAttachmentsSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID"),
});

const GetAttachmentSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID"),
  attachment_id: z.number().describe("The attachment ID"),
});

const CreateAttachmentSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID"),
  file_name: z.string().describe("Name of the file"),
  url: z.string().describe("URL of the file to attach"),
});

const DeleteAttachmentSchema = z.object({
  project_id: z.number().describe("The BugHerd project ID"),
  task_id: z.number().describe("The task ID"),
  attachment_id: z.number().describe("The attachment ID to delete"),
});

// Webhooks
const ListWebhooksSchema = z.object({});

const CreateWebhookSchema = z.object({
  event: z
    .enum([
      "project_create",
      "task_create",
      "task_update",
      "comment",
      "task_destroy",
    ])
    .describe("Event type that triggers the webhook"),
  target_url: z.string().describe("URL to receive webhook POST requests"),
  project_id: z
    .number()
    .optional()
    .describe("Optional project ID to scope the webhook"),
});

const DeleteWebhookSchema = z.object({
  webhook_id: z.number().describe("The webhook ID to delete"),
});

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  // ==========================================================================
  // Organization
  // ==========================================================================
  {
    name: "bugherd_get_organization",
    description:
      "Get organization/account details including name and timezone.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // ==========================================================================
  // Users
  // ==========================================================================
  {
    name: "bugherd_list_users",
    description: "List all users (members + guests) in the organization.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bugherd_list_members",
    description: "List only team members in the organization.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bugherd_list_guests",
    description: "List only guests/clients in the organization.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bugherd_get_user_tasks",
    description: "Get tasks assigned to a specific user.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "number", description: "The user ID" },
        status: { type: "string", description: "Filter by status" },
        priority: {
          type: "string",
          enum: ["critical", "important", "normal", "minor"],
          description: "Filter by priority",
        },
        page: { type: "number", description: "Page number for pagination" },
      },
      required: ["user_id"],
    },
  },
  {
    name: "bugherd_get_user_projects",
    description: "Get projects accessible to a specific user.",
    inputSchema: {
      type: "object" as const,
      properties: {
        user_id: { type: "number", description: "The user ID" },
      },
      required: ["user_id"],
    },
  },

  // ==========================================================================
  // Projects
  // ==========================================================================
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
    name: "bugherd_list_active_projects",
    description: "List only active projects.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bugherd_get_project",
    description: "Get details of a specific project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "bugherd_create_project",
    description: "Create a new BugHerd project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Project name" },
        devurl: {
          type: "string",
          description: "Development URL for the project",
        },
        is_active: {
          type: "boolean",
          description: "Whether the project is active",
        },
        is_public: {
          type: "boolean",
          description: "Whether the project is public",
        },
      },
      required: ["name", "devurl"],
    },
  },
  {
    name: "bugherd_update_project",
    description: "Update a project's settings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        name: { type: "string", description: "New project name" },
        devurl: { type: "string", description: "New development URL" },
        is_active: {
          type: "boolean",
          description: "Whether the project is active",
        },
        is_public: {
          type: "boolean",
          description: "Whether the project is public",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "bugherd_delete_project",
    description:
      "⚠️ DESTRUCTIVE: Delete a project and all its tasks permanently.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: {
          type: "number",
          description: "The BugHerd project ID to delete",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "bugherd_add_member",
    description: "Add a team member to a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        user_id: {
          type: "number",
          description: "The user ID to add as member",
        },
      },
      required: ["project_id", "user_id"],
    },
  },
  {
    name: "bugherd_add_guest",
    description: "Add a guest/client to a project by user ID or email.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        user_id: { type: "number", description: "The user ID to add as guest" },
        email: { type: "string", description: "Email of the guest to add" },
      },
      required: ["project_id"],
    },
  },

  // ==========================================================================
  // Tasks
  // ==========================================================================
  {
    name: "bugherd_list_tasks",
    description:
      "List tasks (bugs/feedback) for a specific BugHerd project. Can filter by status (use column name from bugherd_list_columns), priority, or tag.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        status: {
          type: "string",
          description:
            "Filter by task status (use column name from bugherd_list_columns, e.g., 'backlog', 'todo', 'doing', 'Ready for review', 'done')",
        },
        priority: {
          type: "string",
          enum: ["critical", "important", "normal", "minor"],
          description: "Filter by priority",
        },
        tag: { type: "string", description: "Filter by tag name" },
        page: {
          type: "number",
          description: "Page number for pagination (default: 1)",
        },
      },
      required: ["project_id"],
    },
  },
  {
    name: "bugherd_list_feedback_tasks",
    description: "List feedback tasks (unprocessed/new) for a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        page: { type: "number", description: "Page number for pagination" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "bugherd_list_archived_tasks",
    description: "List archived tasks for a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        page: { type: "number", description: "Page number for pagination" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "bugherd_list_taskboard_tasks",
    description:
      "List taskboard tasks (not feedback, not archived) for a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        page: { type: "number", description: "Page number for pagination" },
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
        project_id: { type: "number", description: "The BugHerd project ID" },
        task_id: { type: "number", description: "The task ID to retrieve" },
      },
      required: ["project_id", "task_id"],
    },
  },
  {
    name: "bugherd_get_task_global",
    description:
      "Get a task by its global ID (without needing the project ID).",
    inputSchema: {
      type: "object" as const,
      properties: {
        task_id: { type: "number", description: "The global task ID" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "bugherd_get_task_by_local_id",
    description: "Get a task by its local ID (#123) within a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        local_task_id: {
          type: "number",
          description: "The local task ID (#123)",
        },
      },
      required: ["project_id", "local_task_id"],
    },
  },
  {
    name: "bugherd_create_task",
    description: "Create a new task/bug in a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        description: { type: "string", description: "Task description" },
        priority: {
          type: "string",
          enum: ["critical", "important", "normal", "minor"],
          description: "Task priority",
        },
        status: { type: "string", description: "Task status/column name" },
        tag_names: {
          type: "array",
          items: { type: "string" },
          description: "Tags for the task",
        },
        assigned_to_id: {
          type: "number",
          description: "User ID to assign task to",
        },
        requester_email: {
          type: "string",
          description: "Email of the requester",
        },
        external_id: { type: "string", description: "External reference ID" },
      },
      required: ["project_id", "description"],
    },
  },
  {
    name: "bugherd_move_tasks",
    description: "Move tasks from one project to another.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The source project ID" },
        task_ids: {
          type: "array",
          items: { type: "number" },
          description: "Array of task IDs to move",
        },
        destination_project_id: {
          type: "number",
          description: "The destination project ID",
        },
      },
      required: ["project_id", "task_ids", "destination_project_id"],
    },
  },
  {
    name: "bugherd_update_task",
    description:
      "Update a task's status, priority, or description. Use this to mark tasks as done or move them through workflow stages.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        task_id: { type: "number", description: "The task ID to update" },
        status: {
          type: "string",
          description:
            "New status for the task (use column name from bugherd_list_columns)",
        },
        priority: {
          type: "string",
          enum: ["critical", "important", "normal", "minor"],
          description: "New priority for the task",
        },
        description: {
          type: "string",
          description: "New description for the task",
        },
      },
      required: ["project_id", "task_id"],
    },
  },

  // ==========================================================================
  // Columns
  // ==========================================================================
  {
    name: "bugherd_list_columns",
    description:
      "List all columns (statuses) for a project. Use this to find the correct status names for updating tasks in projects with custom Kanban boards.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "bugherd_get_column",
    description: "Get details of a specific column.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        column_id: { type: "number", description: "The column ID" },
      },
      required: ["project_id", "column_id"],
    },
  },
  {
    name: "bugherd_create_column",
    description: "Create a new column in a project's Kanban board.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        name: { type: "string", description: "Column name" },
        position: { type: "number", description: "Column position" },
      },
      required: ["project_id", "name"],
    },
  },
  {
    name: "bugherd_update_column",
    description: "Update a column's name or position.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        column_id: { type: "number", description: "The column ID to update" },
        name: { type: "string", description: "New column name" },
        position: { type: "number", description: "New column position" },
      },
      required: ["project_id", "column_id"],
    },
  },

  // ==========================================================================
  // Comments
  // ==========================================================================
  {
    name: "bugherd_list_comments",
    description:
      "List all comments on a specific task. Returns comment text, author, and timestamp.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        task_id: {
          type: "number",
          description: "The task ID to get comments for",
        },
      },
      required: ["project_id", "task_id"],
    },
  },
  {
    name: "bugherd_create_comment",
    description: "Add a comment to a task.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        task_id: { type: "number", description: "The task ID" },
        text: { type: "string", description: "Comment text" },
        user_id: { type: "number", description: "User ID posting the comment" },
        email: {
          type: "string",
          description: "Email of the user posting the comment",
        },
      },
      required: ["project_id", "task_id", "text"],
    },
  },

  // ==========================================================================
  // Attachments
  // ==========================================================================
  {
    name: "bugherd_list_attachments",
    description: "List all attachments on a task.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        task_id: { type: "number", description: "The task ID" },
      },
      required: ["project_id", "task_id"],
    },
  },
  {
    name: "bugherd_get_attachment",
    description: "Get details of a specific attachment.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        task_id: { type: "number", description: "The task ID" },
        attachment_id: { type: "number", description: "The attachment ID" },
      },
      required: ["project_id", "task_id", "attachment_id"],
    },
  },
  {
    name: "bugherd_create_attachment",
    description: "Create an attachment from a URL.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        task_id: { type: "number", description: "The task ID" },
        file_name: { type: "string", description: "Name of the file" },
        url: { type: "string", description: "URL of the file to attach" },
      },
      required: ["project_id", "task_id", "file_name", "url"],
    },
  },
  {
    name: "bugherd_delete_attachment",
    description: "⚠️ DESTRUCTIVE: Delete an attachment permanently.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_id: { type: "number", description: "The BugHerd project ID" },
        task_id: { type: "number", description: "The task ID" },
        attachment_id: {
          type: "number",
          description: "The attachment ID to delete",
        },
      },
      required: ["project_id", "task_id", "attachment_id"],
    },
  },

  // ==========================================================================
  // Webhooks
  // ==========================================================================
  {
    name: "bugherd_list_webhooks",
    description: "List all webhooks configured for the organization.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bugherd_create_webhook",
    description:
      "Create a webhook to receive notifications for BugHerd events.",
    inputSchema: {
      type: "object" as const,
      properties: {
        event: {
          type: "string",
          enum: [
            "project_create",
            "task_create",
            "task_update",
            "comment",
            "task_destroy",
          ],
          description: "Event type that triggers the webhook",
        },
        target_url: {
          type: "string",
          description: "URL to receive webhook POST requests",
        },
        project_id: {
          type: "number",
          description: "Optional project ID to scope the webhook",
        },
      },
      required: ["event", "target_url"],
    },
  },
  {
    name: "bugherd_delete_webhook",
    description: "⚠️ DESTRUCTIVE: Delete a webhook permanently.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhook_id: { type: "number", description: "The webhook ID to delete" },
      },
      required: ["webhook_id"],
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
      // Organization
      // ====================================================================
      case "bugherd_get_organization": {
        const result = await getOrganization();
        const org = result.organization;
        return {
          content: [
            {
              type: "text" as const,
              text: `## Organization\n\n**Name:** ${org.name}\n**ID:** ${org.id}\n**Timezone:** ${org.timezone}`,
            },
          ],
        };
      }

      // ====================================================================
      // Users
      // ====================================================================
      case "bugherd_list_users": {
        const result = await listUsers();
        const users = result.users;
        if (users.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No users found." }],
          };
        }
        const userList = users
          .map((u) => `- **${u.display_name}** (ID: ${u.id}) - ${u.email}`)
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Users (${users.length})\n\n${userList}`,
            },
          ],
        };
      }

      case "bugherd_list_members": {
        const result = await listMembers();
        const members = result.members;
        if (members.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No members found." }],
          };
        }
        const memberList = members
          .map((m) => `- **${m.display_name}** (ID: ${m.id}) - ${m.email}`)
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Members (${members.length})\n\n${memberList}`,
            },
          ],
        };
      }

      case "bugherd_list_guests": {
        const result = await listGuests();
        const guests = result.guests;
        if (guests.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No guests found." }],
          };
        }
        const guestList = guests
          .map((g) => `- **${g.display_name}** (ID: ${g.id}) - ${g.email}`)
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Guests (${guests.length})\n\n${guestList}`,
            },
          ],
        };
      }

      case "bugherd_get_user_tasks": {
        const parsed = GetUserTasksSchema.parse(args);
        const options: ListUserTasksOptions = {
          status: parsed.status,
          priority: parsed.priority,
          page: parsed.page,
        };
        const result = await getUserTasks(parsed.user_id, options);
        const tasks = result.tasks;
        if (tasks.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No tasks found for this user." },
            ],
          };
        }
        const taskList = tasks
          .map(
            (t) =>
              `- Task #${t.local_task_id} (ID: ${t.id}): ${t.description.substring(0, 80)}...`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Tasks for User ${parsed.user_id}\n\n${taskList}`,
            },
          ],
        };
      }

      case "bugherd_get_user_projects": {
        const parsed = GetUserProjectsSchema.parse(args);
        const result = await getUserProjects(parsed.user_id);
        const projects = result.projects;
        if (projects.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No projects found for this user.",
              },
            ],
          };
        }
        const projectList = projects
          .map((p) => `- **${p.name}** (ID: ${p.id})`)
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Projects for User ${parsed.user_id}\n\n${projectList}`,
            },
          ],
        };
      }

      // ====================================================================
      // Projects
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

      case "bugherd_list_active_projects": {
        const result = await listActiveProjects();
        const projects = result.projects;
        if (projects.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No active projects found." },
            ],
          };
        }
        const projectList = projects
          .map((p) => `- **${p.name}** (ID: ${p.id}) - ${p.devurl}`)
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Active Projects (${projects.length})\n\n${projectList}`,
            },
          ],
        };
      }

      case "bugherd_get_project": {
        const parsed = GetProjectSchema.parse(args);
        const result = await getProject(parsed.project_id);
        const p = result.project;
        return {
          content: [
            {
              type: "text" as const,
              text: `## Project: ${p.name}\n\n**ID:** ${p.id}\n**URL:** ${p.devurl}\n**Active:** ${p.is_active ? "Yes" : "No"}\n**Public:** ${p.is_public ? "Yes" : "No"}\n**Created:** ${p.created_at}\n**Updated:** ${p.updated_at}`,
            },
          ],
        };
      }

      case "bugherd_create_project": {
        const parsed = CreateProjectSchema.parse(args);
        const data: CreateProjectData = {
          name: parsed.name,
          devurl: parsed.devurl,
          is_active: parsed.is_active,
          is_public: parsed.is_public,
        };
        const result = await createProject(data);
        const p = result.project;
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Project created!\n\n**Name:** ${p.name}\n**ID:** ${p.id}\n**URL:** ${p.devurl}`,
            },
          ],
        };
      }

      case "bugherd_update_project": {
        const parsed = UpdateProjectSchema.parse(args);
        const data: UpdateProjectData = {
          name: parsed.name,
          devurl: parsed.devurl,
          is_active: parsed.is_active,
          is_public: parsed.is_public,
        };
        const result = await updateProject(parsed.project_id, data);
        const p = result.project;
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Project updated!\n\n**Name:** ${p.name}\n**ID:** ${p.id}\n**URL:** ${p.devurl}`,
            },
          ],
        };
      }

      case "bugherd_delete_project": {
        const parsed = DeleteProjectSchema.parse(args);
        await deleteProject(parsed.project_id);
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Project ${parsed.project_id} deleted permanently.`,
            },
          ],
        };
      }

      case "bugherd_add_member": {
        const parsed = AddMemberSchema.parse(args);
        await addMember(parsed.project_id, parsed.user_id);
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ User ${parsed.user_id} added as member to project ${parsed.project_id}.`,
            },
          ],
        };
      }

      case "bugherd_add_guest": {
        const parsed = AddGuestSchema.parse(args);
        const userIdOrEmail = parsed.user_id ?? parsed.email;
        if (!userIdOrEmail) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Either user_id or email is required.",
              },
            ],
            isError: true,
          };
        }
        await addGuest(parsed.project_id, userIdOrEmail);
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Guest ${userIdOrEmail} added to project ${parsed.project_id}.`,
            },
          ],
        };
      }

      // ====================================================================
      // Tasks
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
        const taskListItems = await Promise.all(
          tasks.map(async (t) => {
            const status = await getStatusNameForProject(
              parsed.project_id,
              t.status_id,
            );
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
          }),
        );
        const taskList = taskListItems.join("\n\n");
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

      case "bugherd_list_feedback_tasks": {
        const parsed = ListFeedbackTasksSchema.parse(args);
        const result = await listFeedbackTasks(parsed.project_id, parsed.page);
        const tasks = result.tasks;
        if (tasks.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No feedback tasks found." },
            ],
          };
        }
        const taskList = tasks
          .map(
            (t) =>
              `- Task #${t.local_task_id} (ID: ${t.id}): ${t.description.substring(0, 80)}...`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Feedback Tasks (${tasks.length})\n\n${taskList}`,
            },
          ],
        };
      }

      case "bugherd_list_archived_tasks": {
        const parsed = ListArchivedTasksSchema.parse(args);
        const result = await listArchivedTasks(parsed.project_id, parsed.page);
        const tasks = result.tasks;
        if (tasks.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No archived tasks found." },
            ],
          };
        }
        const taskList = tasks
          .map(
            (t) =>
              `- Task #${t.local_task_id} (ID: ${t.id}): ${t.description.substring(0, 80)}...`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Archived Tasks (${tasks.length})\n\n${taskList}`,
            },
          ],
        };
      }

      case "bugherd_list_taskboard_tasks": {
        const parsed = ListTaskboardTasksSchema.parse(args);
        const result = await listTaskboardTasks(parsed.project_id, parsed.page);
        const tasks = result.tasks;
        if (tasks.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No taskboard tasks found." },
            ],
          };
        }
        const taskList = tasks
          .map(
            (t) =>
              `- Task #${t.local_task_id} (ID: ${t.id}): ${t.description.substring(0, 80)}...`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Taskboard Tasks (${tasks.length})\n\n${taskList}`,
            },
          ],
        };
      }

      case "bugherd_get_task": {
        const parsed = GetTaskSchema.parse(args);
        const result = await getTask(parsed.project_id, parsed.task_id);
        const task = result.task;
        const status = await getStatusNameForProject(
          parsed.project_id,
          task.status_id,
        );
        const priority = getPriorityName(task.priority_id);
        const tags =
          task.tag_names.length > 0 ? task.tag_names.join(", ") : "none";
        const pageUrl =
          task.selector_info?.url ||
          task.site?.url ||
          task.url ||
          "Not available";
        const selector = task.selector_info?.selector || "Not available";
        const clientInfo = task.client_info || {};
        const os = clientInfo.operating_system || task.os || "Not available";
        const browser = clientInfo.browser || task.browser || "Not available";
        const resolution =
          clientInfo.resolution || task.resolution || "Not available";
        const windowSize =
          clientInfo.browser_window_size || task.window_size || "Not available";
        const colorDepth =
          clientInfo.color_depth ||
          (task.color_depth ? `${task.color_depth} bit` : "Not available");
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

### Page URL
${pageUrl}

### Element Selector
\`${selector}\`

### Browser Environment
| Property | Value |
|----------|-------|
| Operating System | ${os} |
| Browser | ${browser} |
| Resolution | ${resolution} |
| Browser Window | ${windowSize} |
| Color Depth | ${colorDepth} |

### Links
- [View in BugHerd](${task.admin_link})`;
        return { content: [{ type: "text" as const, text: output }] };
      }

      case "bugherd_get_task_global": {
        const parsed = GetTaskGlobalSchema.parse(args);
        const result = await getTaskGlobal(parsed.task_id);
        const task = result.task;
        return {
          content: [
            {
              type: "text" as const,
              text: `## Task #${task.local_task_id} (Global ID: ${task.id})\n\n**Description:** ${task.description}\n**Created:** ${task.created_at}\n[View in BugHerd](${task.admin_link})`,
            },
          ],
        };
      }

      case "bugherd_get_task_by_local_id": {
        const parsed = GetTaskByLocalIdSchema.parse(args);
        const result = await getTaskByLocalId(
          parsed.project_id,
          parsed.local_task_id,
        );
        const task = result.task;
        return {
          content: [
            {
              type: "text" as const,
              text: `## Task #${task.local_task_id} (Global ID: ${task.id})\n\n**Description:** ${task.description}\n**Created:** ${task.created_at}\n[View in BugHerd](${task.admin_link})`,
            },
          ],
        };
      }

      case "bugherd_create_task": {
        const parsed = CreateTaskSchema.parse(args);
        const data: CreateTaskData = {
          description: parsed.description,
          priority: parsed.priority,
          status: parsed.status,
          tag_names: parsed.tag_names,
          assigned_to_id: parsed.assigned_to_id,
          requester_email: parsed.requester_email,
          external_id: parsed.external_id,
        };
        const result = await createTask(parsed.project_id, data);
        const task = result.task;
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Task created!\n\n**Task #${task.local_task_id}** (ID: ${task.id})\n**Description:** ${task.description}\n[View in BugHerd](${task.admin_link})`,
            },
          ],
        };
      }

      case "bugherd_move_tasks": {
        const parsed = MoveTasksSchema.parse(args);
        await moveTasks(
          parsed.project_id,
          parsed.task_ids,
          parsed.destination_project_id,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ ${parsed.task_ids.length} task(s) moved from project ${parsed.project_id} to project ${parsed.destination_project_id}.`,
            },
          ],
        };
      }

      case "bugherd_update_task": {
        const parsed = UpdateTaskSchema.parse(args);
        const options: UpdateTaskOptions = {
          status: parsed.status,
          priority: parsed.priority,
          description: parsed.description,
        };
        const result = await updateTask(
          parsed.project_id,
          parsed.task_id,
          options,
        );
        const task = result.task;
        const status = await getStatusNameForProject(
          parsed.project_id,
          task.status_id,
        );
        const priority = getPriorityName(task.priority_id);
        const debugInfo = result._debug
          ? `\n\n---\n**Debug:**\n\`\`\`json\n${JSON.stringify(result._debug, null, 2)}\n\`\`\``
          : "";
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Task #${task.local_task_id} updated!\n\n**Status:** ${status}\n**Priority:** ${priority}\n\n[View in BugHerd](${task.admin_link})${debugInfo}`,
            },
          ],
        };
      }

      // ====================================================================
      // Columns
      // ====================================================================
      case "bugherd_list_columns": {
        const parsed = ListColumnsSchema.parse(args);
        const result = await listColumns(parsed.project_id);
        const columns = result.columns;
        if (columns.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No columns found. This project uses default statuses: backlog, todo, doing, done, closed.",
              },
            ],
          };
        }
        const columnList = columns
          .sort((a, b) => a.position - b.position)
          .map(
            (col) =>
              `- **${col.name}** (ID: ${col.id}, Position: ${col.position})`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Columns for Project ${parsed.project_id}\n\nUse these column names as the \`status\` value when updating tasks:\n\n${columnList}`,
            },
          ],
        };
      }

      case "bugherd_get_column": {
        const parsed = GetColumnSchema.parse(args);
        const result = await getColumn(parsed.project_id, parsed.column_id);
        const col = result.column;
        return {
          content: [
            {
              type: "text" as const,
              text: `## Column: ${col.name}\n\n**ID:** ${col.id}\n**Position:** ${col.position}`,
            },
          ],
        };
      }

      case "bugherd_create_column": {
        const parsed = CreateColumnSchema.parse(args);
        const data: CreateColumnData = {
          name: parsed.name,
          position: parsed.position,
        };
        const result = await createColumn(parsed.project_id, data);
        const col = result.column;
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Column created!\n\n**Name:** ${col.name}\n**ID:** ${col.id}\n**Position:** ${col.position}`,
            },
          ],
        };
      }

      case "bugherd_update_column": {
        const parsed = UpdateColumnSchema.parse(args);
        const data: UpdateColumnData = {
          name: parsed.name,
          position: parsed.position,
        };
        const result = await updateColumn(
          parsed.project_id,
          parsed.column_id,
          data,
        );
        const col = result.column;
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Column updated!\n\n**Name:** ${col.name}\n**ID:** ${col.id}\n**Position:** ${col.position}`,
            },
          ],
        };
      }

      // ====================================================================
      // Comments
      // ====================================================================
      case "bugherd_list_comments": {
        const parsed = ListCommentsSchema.parse(args);
        const result = await listComments(parsed.project_id, parsed.task_id);
        const comments = result.comments;
        if (comments.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No comments on this task." },
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

      case "bugherd_create_comment": {
        const parsed = CreateCommentSchema.parse(args);
        const data: CreateCommentData = {
          text: parsed.text,
          user_id: parsed.user_id,
          email: parsed.email,
        };
        const result = await createComment(
          parsed.project_id,
          parsed.task_id,
          data,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Comment added!\n\n**ID:** ${result.comment.id}\n**Text:** ${result.comment.text}`,
            },
          ],
        };
      }

      // ====================================================================
      // Attachments
      // ====================================================================
      case "bugherd_list_attachments": {
        const parsed = ListAttachmentsSchema.parse(args);
        const result = await listAttachments(parsed.project_id, parsed.task_id);
        const attachments = result.attachments;
        if (attachments.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No attachments on this task." },
            ],
          };
        }
        const attachmentList = attachments
          .map(
            (a) =>
              `- **${a.file_name}** (ID: ${a.id}, ${a.file_size} bytes)\n  URL: ${a.url}`,
          )
          .join("\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Attachments on Task ${parsed.task_id} (${attachments.length})\n\n${attachmentList}`,
            },
          ],
        };
      }

      case "bugherd_get_attachment": {
        const parsed = GetAttachmentSchema.parse(args);
        const result = await getAttachment(
          parsed.project_id,
          parsed.task_id,
          parsed.attachment_id,
        );
        const a = result.attachment;
        return {
          content: [
            {
              type: "text" as const,
              text: `## Attachment: ${a.file_name}\n\n**ID:** ${a.id}\n**Size:** ${a.file_size} bytes\n**Created:** ${a.created_at}\n**URL:** ${a.url}`,
            },
          ],
        };
      }

      case "bugherd_create_attachment": {
        const parsed = CreateAttachmentSchema.parse(args);
        const data: CreateAttachmentData = {
          file_name: parsed.file_name,
          url: parsed.url,
        };
        const result = await createAttachment(
          parsed.project_id,
          parsed.task_id,
          data,
        );
        const a = result.attachment;
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Attachment created!\n\n**Name:** ${a.file_name}\n**ID:** ${a.id}\n**URL:** ${a.url}`,
            },
          ],
        };
      }

      case "bugherd_delete_attachment": {
        const parsed = DeleteAttachmentSchema.parse(args);
        await deleteAttachment(
          parsed.project_id,
          parsed.task_id,
          parsed.attachment_id,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Attachment ${parsed.attachment_id} deleted permanently.`,
            },
          ],
        };
      }

      // ====================================================================
      // Webhooks
      // ====================================================================
      case "bugherd_list_webhooks": {
        const result = await listWebhooks();
        const webhooks = result.webhooks;
        if (webhooks.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No webhooks configured." },
            ],
          };
        }
        const webhookList = webhooks
          .map(
            (w) =>
              `- **${w.event}** (ID: ${w.id})\n  Target: ${w.target_url}${w.project_id ? `\n  Project: ${w.project_id}` : ""}`,
          )
          .join("\n\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `## Webhooks (${webhooks.length})\n\n${webhookList}`,
            },
          ],
        };
      }

      case "bugherd_create_webhook": {
        const parsed = CreateWebhookSchema.parse(args);
        const data: CreateWebhookData = {
          event: parsed.event as BugherdWebhookEvent,
          target_url: parsed.target_url,
          project_id: parsed.project_id,
        };
        const result = await createWebhook(data);
        const w = result.webhook;
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Webhook created!\n\n**Event:** ${w.event}\n**ID:** ${w.id}\n**Target URL:** ${w.target_url}${w.project_id ? `\n**Project:** ${w.project_id}` : ""}`,
            },
          ],
        };
      }

      case "bugherd_delete_webhook": {
        const parsed = DeleteWebhookSchema.parse(args);
        await deleteWebhook(parsed.webhook_id);
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Webhook ${parsed.webhook_id} deleted permanently.`,
            },
          ],
        };
      }

      // ====================================================================
      // Unknown Tool
      // ====================================================================
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
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
