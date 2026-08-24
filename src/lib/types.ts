export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  role?: 'user' | 'client' | 'employee';
  hasPassword?: boolean;
  googleId?: string;
  createdAt?: string;
}

export type InvitationType = 'employee' | 'client';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  ownerId: string;
  type: InvitationType;
  email: string;
  name?: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationPreview {
  email: string;
  name?: string;
  type: InvitationType;
  studioName: string;
  expiresAt: string;
}

export type NotificationType = 'team_message' | 'client_message' | 'task_assigned' | 'mention';
export type NotificationSourceType = 'channel' | 'conversation' | 'task';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  sourceType: NotificationSourceType;
  sourceId: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPage {
  notifications: AppNotification[];
  nextCursor: string | null;
}

export type ActivityEventType =
  | 'task_created'
  | 'task_updated'
  | 'project_created'
  | 'project_updated'
  | 'invoice_created'
  | 'invoice_status_changed'
  | 'client_message_received'
  | 'automation_run_completed';

export type ActivityActorType = 'owner' | 'employee' | 'client' | 'system';
export type ActivitySourceType = 'task' | 'project' | 'invoice' | 'message' | 'workflow';

export interface ActivityEvent {
  id: string;
  ownerId: string;
  type: ActivityEventType;
  projectId?: string;
  clientId?: string;
  actorType?: ActivityActorType;
  actorId?: string;
  actorName?: string;
  summary: string;
  sourceType: ActivitySourceType;
  sourceId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityPage {
  events: ActivityEvent[];
  nextCursor: string | null;
}

export interface Employee {
  id: string;
  ownerId: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  status?: string;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type NoteAuthorType = 'team' | 'client';

export interface TaskNote {
  id: string;
  taskId: string;
  authorType: NoteAuthorType;
  authorName?: string;
  body: string;
  createdAt: string;
}

export interface ClientOverview {
  invoiceCount: number;
  openInvoices: number;
  totalBilled: number;
  outstanding: number;
  projectCount: number;
  projectsInProgress: number;
  taskCount: number;
  tasksOpen: number;
  tasksDone: number;
  unreadMessages: number;
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface BlockedBySummary {
  id: string;
  dependencyId: string;
  title: string;
  status: TaskStatus;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  labels?: string[];
  projectId?: string;
  clientId?: string;
  assigneeId?: string;
  order: number;
  parentTaskId?: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  client?: { id: string; name: string };
  assignee?: { id: string; name: string; type: 'owner' | 'employee' | 'client' };
  notes?: TaskNote[];
  /** Still-incomplete blockers only — embedded by the backend so the Kanban board doesn't
   *  need a per-card follow-up fetch. */
  blockedBy?: BlockedBySummary[];
}

export interface TaskDependency {
  id: string;
  ownerId: string;
  taskId: string;
  blockedByTaskId: string;
  createdAt: string;
  blockedByTask?: Task;
}

/** A person a task can be assigned to — already filtered server-side to whoever the
 *  requesting caller (owner, employee, or client) is allowed to pick. */
export interface AssignableMember {
  id: string;
  name: string;
  type: 'owner' | 'employee' | 'client';
  email?: string;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  status?: string;
  tags?: string[];
  avatarUrl?: string;
  createdAt: string;
  projects?: Project[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  progress?: number;
  dueDate?: string;
  clientId?: string;
  client?: { id: string; name: string };
  tasks?: Task[];
  createdAt: string;
}

export type CallStatus = 'pending' | 'active' | 'ended' | 'failed';
export type CallSpeaker = 'employee' | 'client';
export type CallPlatform = 'desktop' | 'google_meet' | 'zoom' | 'microsoft_teams';

export interface Call {
  id: string;
  projectId?: string;
  clientId?: string;
  status: CallStatus;
  platform: CallPlatform;
  externalMeetingUrl?: string;
  summary?: string;
  externalTranscriptText?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  createdAt: string;
}

export interface CallTranscriptChunk {
  id: string;
  callId: string;
  speaker: CallSpeaker;
  text: string;
  startedAtMs: number;
  endedAtMs: number;
  botActionSummary?: string;
  botActionTaskId?: string;
  createdAt: string;
}

export interface ProjectTemplateTask {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  labels?: string[];
  relativeDueDays?: number;
  parentTemplateTaskId?: string;
  order: number;
  createdAt: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tasks?: ProjectTemplateTask[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId?: string;
  client?: { id: string; name: string };
  issueDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  notes?: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export type MessageSender = 'user' | 'client';

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  senderName?: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  clientId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string };
  messages?: Message[];
}

export type BrainMessageRole = 'user' | 'assistant' | 'tool';

export interface BrainMessage {
  id: string;
  threadId: string;
  role: BrainMessageRole;
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  createdAt: string;
}

export interface BrainThread {
  id: string;
  title?: string;
  pendingToolCall?: {
    toolCallId: string;
    name: string;
    args: Record<string, unknown>;
    description: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  messages?: BrainMessage[];
}

export type TeamMemberType = 'owner' | 'employee' | 'client';

export interface TeamMemberOption {
  type: TeamMemberType;
  id: string;
  name: string;
}

export interface TeamChannelSummary {
  id: string;
  name: string;
  type: 'channel' | 'dm' | 'project';
  isDefault: boolean;
  lastMessage: { body: string; senderName: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface TeamChannelMessage {
  id: string;
  channelId: string;
  senderType: TeamMemberType;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export type BrainGraphNodeType = 'client' | 'project' | 'task' | 'invoice' | 'conversation' | 'employee';

export interface BrainGraphNode {
  id: string;
  type: BrainGraphNodeType;
  label: string;
  meta?: Record<string, unknown>;
}

export interface BrainGraphEdge {
  source: string;
  target: string;
}

export interface BrainGraphData {
  nodes: BrainGraphNode[];
  edges: BrainGraphEdge[];
}

// ---------------- Vault ----------------

export type VaultPrincipalType = 'owner' | 'employee' | 'client';

export interface VaultCandidate {
  type: VaultPrincipalType;
  id: string;
  name: string;
  hasVaultAccess: boolean;
}

export interface VaultIdentityRecord {
  id: string;
  principalType: VaultPrincipalType;
  principalId: string;
  publicKey: string;
  encryptedPrivateKey: string;
  encryptedPrivateKeyIv: string;
  kdfSalt: string;
  kdfParams: Record<string, unknown>;
  recoveryEncryptedPrivateKey: string;
  recoveryEncryptedPrivateKeyIv: string;
  recoveryKdfSalt: string;
  createdAt: string;
}

export interface VaultSummary {
  id: string;
  name: string;
  createdAt: string;
  /** This principal's own RSA-OAEP-wrapped copy of the vault's AES key. */
  wrappedVaultKey: string;
}

export interface VaultMemberSummary {
  id: string;
  principalType: VaultPrincipalType;
  principalId: string;
  name: string;
  addedAt: string;
}

export type VaultItemType = 'login' | 'note' | 'api_credential';

export interface VaultItemRecord {
  id: string;
  vaultId: string;
  itemType: VaultItemType;
  ciphertext: string;
  iv: string;
  createdAt: string;
  updatedAt: string;
}

/** Decrypted, client-side-only shape of a vault item's content. Never sent to the server as-is. */
export interface VaultItemContent {
  title: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  apiKey?: string;
}

export type VaultAuditAction =
  | 'vault_created'
  | 'item_created'
  | 'item_updated'
  | 'item_deleted'
  | 'item_accessed'
  | 'member_added'
  | 'member_removed';

export interface VaultAuditLogEntry {
  id: string;
  vaultId: string;
  itemId?: string;
  principalType: VaultPrincipalType;
  principalId: string;
  action: VaultAuditAction;
  createdAt: string;
}

// ---------------- Automations ----------------

export type WorkflowTriggerType = 'trigger.manual' | 'trigger.cron' | 'trigger.event';
export type WorkflowLogicType = 'logic.if' | 'logic.delay' | 'logic.forEach' | 'logic.setVariable' | 'logic.merge';
export type WorkflowActionType =
  | 'action.createTask'
  | 'action.updateTask'
  | 'action.deleteTask'
  | 'action.createProject'
  | 'action.updateProject'
  | 'action.deleteProject'
  | 'action.createInvoice'
  | 'action.updateInvoiceStatus'
  | 'action.deleteInvoice'
  | 'action.sendClientMessage'
  | 'action.sendTeamChannelMessage'
  | 'action.notifyEmployee';
export type WorkflowNodeType = WorkflowTriggerType | WorkflowLogicType | WorkflowActionType;

export const DESTRUCTIVE_NODE_TYPES: WorkflowNodeType[] = ['action.deleteTask', 'action.deleteProject', 'action.deleteInvoice'];

export type AutomationEntityType = 'task' | 'project' | 'invoice' | 'client' | 'message';
export type AutomationEventName =
  | 'task.created'
  | 'task.updated'
  | 'project.created'
  | 'project.updated'
  | 'invoice.created'
  | 'invoice.statusChanged'
  | 'client.messageReceived';

export type ExpressionOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'isEmpty' | 'isNotEmpty';

export interface ExpressionCondition {
  left: string;
  op: ExpressionOp;
  right?: string;
}

export type WorkflowTriggerConfig =
  | { type: 'trigger.manual' }
  | { type: 'trigger.cron'; cronExpression: string; timezone?: string }
  | { type: 'trigger.event'; entityType: AutomationEntityType; eventName: AutomationEventName; filter?: ExpressionCondition[] };

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNodeData {
  label: string;
  config: Record<string, unknown>;
  destructiveAck?: boolean;
  [key: string]: unknown;
}

export interface WorkflowNodeConfig {
  id: string;
  type: WorkflowNodeType;
  position: WorkflowNodePosition;
  data: WorkflowNodeData;
}

export interface WorkflowEdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Workflow {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: WorkflowTriggerConfig;
  nodes: WorkflowNodeConfig[];
  edges: WorkflowEdgeConfig[];
  nextRunAt?: string | null;
  createdByActorId: string;
  createdByKind: 'owner' | 'employee';
  createdAt: string;
  updatedAt: string;
}

export type WorkflowRunStatus = 'pending' | 'running' | 'waiting' | 'success' | 'failed' | 'cancelled';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  ownerId: string;
  status: WorkflowRunStatus;
  triggerContext: Record<string, unknown>;
  resumeAt?: string | null;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  createdAt: string;
}

export type NodeRunStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface WorkflowNodeRun {
  id: string;
  runId: string;
  nodeId: string;
  nodeType: string;
  status: NodeRunStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface WorkflowRunWithNodes extends WorkflowRun {
  nodeRuns: WorkflowNodeRun[];
}

export interface CalendarEventAttendee {
  email: string;
  name?: string;
  responseStatus?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  htmlLink: string;
  meetLink?: string;
  attendees: CalendarEventAttendee[];
}

export interface CalendarConnectionStatus {
  connected: boolean;
  googleAccountEmail?: string;
  connectedAt?: string;
}

// ---------------- Documents ----------------

export type DocumentKind = 'page' | 'file';
export type DocumentFileType = 'image' | 'video' | 'pdf' | 'other' | 'recording';
export type DocumentFileStatus = 'pending' | 'ready' | 'failed';

export interface AppDocument {
  id: string;
  projectId?: string;
  project?: { id: string; name: string };
  title: string;
  tags?: string[];
  kind: DocumentKind;
  createdById?: string;
  createdByName?: string;
  content?: unknown;
  fileType?: DocumentFileType;
  mimeType?: string;
  sizeBytes?: number;
  originalFilename?: string;
  status?: DocumentFileStatus;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentQuota {
  usedBytes: number;
  limitBytes: number;
}
