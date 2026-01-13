/**
 * BugHerd API v2 Client
 * @see https://www.bugherd.com/api_v2
 *
 * Authentication: Basic HTTP Auth with API key as user, 'x' as password
 * Rate Limit: 60 requests/minute average, bursts of 10
 */

import type {
  BugherdProjectsResponse,
  BugherdProjectResponse,
  BugherdTasksResponse,
  BugherdTaskResponse,
  BugherdCommentsResponse,
} from "../types/bugherd.js";

const BUGHERD_BASE_URL = "https://www.bugherd.com/api_v2";

/**
 * Get the API key from environment variables
 */
function getApiKey(): string {
  const apiKey = process.env.BUGHERD_API_KEY;
  if (!apiKey) {
    throw new Error(
      "BUGHERD_API_KEY environment variable is required. " +
        "Get your API key from BugHerd Settings > General Settings.",
    );
  }
  return apiKey;
}

/**
 * Make an authenticated request to the BugHerd API
 */
async function bugherdRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();
  const auth = Buffer.from(`${apiKey}:x`).toString("base64");

  const url = `${BUGHERD_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "BugHerd API rate limit exceeded. Wait a moment and try again.",
      );
    }
    if (response.status === 401) {
      throw new Error(
        "BugHerd API authentication failed. Check your BUGHERD_API_KEY.",
      );
    }
    if (response.status === 404) {
      throw new Error(`BugHerd resource not found: ${endpoint}`);
    }

    const errorText = await response.text();
    throw new Error(`BugHerd API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Projects
// ============================================================================

/**
 * List all projects accessible to the authenticated user
 */
export async function listProjects(): Promise<BugherdProjectsResponse> {
  return bugherdRequest<BugherdProjectsResponse>("/projects.json");
}

/**
 * Get a single project by ID
 */
export async function getProject(
  projectId: number,
): Promise<BugherdProjectResponse> {
  return bugherdRequest<BugherdProjectResponse>(`/projects/${projectId}.json`);
}

// ============================================================================
// Tasks
// ============================================================================

export interface ListTasksOptions {
  status?: "backlog" | "todo" | "doing" | "done" | "closed";
  priority?: "critical" | "important" | "normal" | "minor";
  tag?: string;
  assignedTo?: number;
  page?: number;
}

/**
 * List tasks for a project with optional filters
 */
export async function listTasks(
  projectId: number,
  options: ListTasksOptions = {},
): Promise<BugherdTasksResponse> {
  const params = new URLSearchParams();

  if (options.status) params.set("status", options.status);
  if (options.priority) params.set("priority", options.priority);
  if (options.tag) params.set("tag", options.tag);
  if (options.assignedTo)
    params.set("assigned_to_id", options.assignedTo.toString());
  if (options.page) params.set("page", options.page.toString());

  const query = params.toString();
  const endpoint = `/projects/${projectId}/tasks.json${query ? `?${query}` : ""}`;

  return bugherdRequest<BugherdTasksResponse>(endpoint);
}

/**
 * Get a single task by ID
 */
export async function getTask(
  projectId: number,
  taskId: number,
): Promise<BugherdTaskResponse> {
  return bugherdRequest<BugherdTaskResponse>(
    `/projects/${projectId}/tasks/${taskId}.json`,
  );
}

// ============================================================================
// Comments
// ============================================================================

/**
 * List comments for a task
 */
export async function listComments(
  projectId: number,
  taskId: number,
): Promise<BugherdCommentsResponse> {
  return bugherdRequest<BugherdCommentsResponse>(
    `/projects/${projectId}/tasks/${taskId}/comments.json`,
  );
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Verify API connection by fetching organization info
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    await listProjects();
    return true;
  } catch {
    return false;
  }
}
