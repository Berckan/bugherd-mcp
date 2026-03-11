/**
 * BugHerd API v2 TypeScript Types
 * @see https://www.bugherd.com/api_v2
 */

// ============================================================================
// Organization Types
// ============================================================================

export interface BugherdOrganization {
  id: number;
  name: string;
  timezone: string;
}

export interface BugherdOrganizationResponse {
  organization: BugherdOrganization;
}

// ============================================================================
// User Types
// ============================================================================

export interface BugherdUser {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface BugherdMember extends BugherdUser {
  role?: string;
  projects?: number[];
}

export interface BugherdGuest extends BugherdUser {
  projects?: number[];
}

export interface BugherdUsersResponse {
  users: BugherdUser[];
}

export interface BugherdMembersResponse {
  members: BugherdMember[];
}

export interface BugherdGuestsResponse {
  guests: BugherdGuest[];
}

// ============================================================================
// Project Types
// ============================================================================

export interface BugherdProject {
  id: number;
  name: string;
  devurl: string;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface BugherdProjectsResponse {
  projects: BugherdProject[];
}

export interface BugherdProjectResponse {
  project: BugherdProject;
}

// ============================================================================
// Task Types
// ============================================================================

export type BugherdTaskStatus =
  | "backlog"
  | "todo"
  | "doing"
  | "done"
  | "closed";

export type BugherdTaskPriority =
  | "not set"
  | "critical"
  | "important"
  | "normal"
  | "minor";

export interface BugherdSelectorInfo {
  path?: string;
  html?: string;
  version?: number;
  data?: {
    bugOffsetX?: number;
    bugOffsetY?: number;
  };
}

export interface BugherdScreenshotData {
  screenshot_width?: number;
  screenshot_height?: number;
  screenshot_pin_x?: number;
  screenshot_pin_y?: number;
}

export interface BugherdTask {
  id: number;
  local_task_id: number;
  priority_id: number | null;
  status_id: number;
  description: string;
  created_at: string;
  updated_at: string;
  external_id: string | null;
  requester_id: number;
  requester_email: string;
  assigned_to_id: number | null;
  tag_names: string[];
  admin_link: string;
  secret_link?: string;

  // Screenshot
  screenshot_url: string | null;
  screenshot_data?: BugherdScreenshotData;

  // Page context
  site?: string;
  url?: string;

  // Element selector (CSS path + HTML snippet)
  selector_info?: BugherdSelectorInfo | null;

  // Browser/environment metadata
  requester_os?: string;
  requester_browser?: string;
  requester_browser_size?: string;
  requester_resolution?: string;

  // Computed fields
  status?: BugherdTaskStatus;
  priority?: BugherdTaskPriority;
}

export interface BugherdTasksResponse {
  tasks: BugherdTask[];
  meta: {
    count: number;
    total_pages: number;
    current_page: number;
  };
}

export interface BugherdTaskResponse {
  task: BugherdTask;
}

// ============================================================================
// Comment Types
// ============================================================================

export interface BugherdComment {
  id: number;
  user_id: number;
  text: string;
  created_at: string;
  user: BugherdUser;
}

export interface BugherdCommentsResponse {
  comments: BugherdComment[];
}

// ============================================================================
// API Error
// ============================================================================

export interface BugherdApiError {
  error: string;
  message?: string;
}

// ============================================================================
// Status and Priority Mappings
// ============================================================================

export const STATUS_MAP: Record<number, BugherdTaskStatus> = {
  0: "backlog",
  1: "todo",
  2: "doing",
  3: "done",
  4: "closed",
};

export const PRIORITY_MAP: Record<number, BugherdTaskPriority> = {
  0: "not set",
  1: "critical",
  2: "important",
  3: "normal",
  4: "minor",
};

export function getStatusName(statusId: number): BugherdTaskStatus {
  return STATUS_MAP[statusId] ?? "backlog";
}

export function getPriorityName(
  priorityId: number | null,
): BugherdTaskPriority {
  if (priorityId === null) return "not set";
  return PRIORITY_MAP[priorityId] ?? "not set";
}

// ============================================================================
// Attachment Types
// ============================================================================

export interface BugherdAttachment {
  id: number;
  file_name: string;
  file_size: number;
  url: string;
  created_at: string;
}

export interface BugherdAttachmentsResponse {
  attachments: BugherdAttachment[];
}

export interface BugherdAttachmentResponse {
  attachment: BugherdAttachment;
}

// ============================================================================
// Webhook Types
// ============================================================================

export type BugherdWebhookEvent =
  | "project_create"
  | "task_create"
  | "task_update"
  | "comment"
  | "task_destroy";

export interface BugherdWebhook {
  id: number;
  event: BugherdWebhookEvent;
  target_url: string;
  project_id: number | null;
}

export interface BugherdWebhooksResponse {
  webhooks: BugherdWebhook[];
}

export interface BugherdWebhookResponse {
  webhook: BugherdWebhook;
}

// ============================================================================
// Column Types (extended)
// ============================================================================

export interface BugherdColumn {
  id: number;
  name: string;
  position: number;
}

export interface BugherdColumnsResponse {
  columns: BugherdColumn[];
}

export interface BugherdColumnResponse {
  column: BugherdColumn;
}
