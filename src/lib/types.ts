// Keep in sync with COMPANY_MODULES in portico-backend/src/modules/auth/user.entity.ts.
export const COMPANY_MODULES = [
  'projects',
  'tasks',
  'teamChat',
  'documents',
  'vault',
  'calendar',
  'automations',
  'brain',
  'invoices',
  'projectTemplates',
  'games',
] as const;

export type CompanyModule = (typeof COMPANY_MODULES)[number];
export type CompanyApprovalStatus = 'pending' | 'approved' | 'rejected';

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
  approvalStatus?: CompanyApprovalStatus;
  enabledModules?: CompanyModule[];
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

export type NotificationType = 'team_message' | 'client_message' | 'task_assigned' | 'mention' | 'game_invite';
export type NotificationSourceType = 'channel' | 'conversation' | 'task' | 'game_room';

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

// ---------------- Arcade ----------------

export type GameType = 'snake_royale' | 'doodle_relay' | 'word_bomb';
export type GameRoomStatus = 'lobby' | 'starting' | 'in_progress' | 'finished' | 'abandoned';
export type GameRoomVisibility = 'open' | 'invite_only';
export type GameRoomMemberType = 'owner' | 'employee' | 'bot';
export type GameRoomMemberStatus = 'invited' | 'requested' | 'joined' | 'ready' | 'declined' | 'kicked' | 'left';

export interface GameRoomMember {
  id: string;
  roomId: string;
  seatIndex: number | null;
  memberType: GameRoomMemberType;
  memberId: string;
  displayName: string;
  isHost: boolean;
  isBot: boolean;
  status: GameRoomMemberStatus;
  joinedAt?: string;
  readyAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameRoomSummary {
  id: string;
  gameType: GameType;
  hostType: 'owner' | 'employee';
  hostId: string;
  hostName: string;
  status: GameRoomStatus;
  visibility: GameRoomVisibility;
  maxPlayers: number;
  fillWithBots: boolean;
  roundsTotal: number;
  roundsPlayed: number;
  activeCount: number;
  isHost: boolean;
  myStatus: GameRoomMemberStatus | null;
  createdAt: string;
}

export interface GameRoomDetail {
  id: string;
  ownerId: string;
  gameType: GameType;
  hostType: 'owner' | 'employee';
  hostId: string;
  status: GameRoomStatus;
  visibility: GameRoomVisibility;
  maxPlayers: number;
  fillWithBots: boolean;
  roundsTotal: number;
  roundsPlayed: number;
  settings: Record<string, unknown>;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
  members: GameRoomMember[];
}

export interface GameMatchPlayerResult {
  id: string;
  matchId: string;
  memberType: GameRoomMemberType;
  memberId: string;
  displayName: string;
  isBot: boolean;
  teamId?: string;
  placement?: number;
  won: boolean;
  score: number;
  roundsWon: number;
  createdAt: string;
}

export interface GameMatchHistoryEntry {
  id: string;
  roomId: string;
  gameType: GameType;
  isSoloPractice: boolean;
  roundsPlayed: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  players: GameMatchPlayerResult[];
}

export interface GameRoundResultEntry {
  id: string;
  matchId: string;
  roundNumber: number;
  summary: string;
  payload: Record<string, unknown>;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface GameRoomResult {
  id: string;
  roomId: string;
  ownerId: string;
  gameType: GameType;
  isSoloPractice: boolean;
  roundsPlayed: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  players: GameMatchPlayerResult[];
  rounds: GameRoundResultEntry[];
}

export interface ArcadeLeaderboardRow {
  memberType: GameRoomMemberType;
  memberId: string;
  displayName: string;
  wins: number;
  matchesPlayed: number;
  totalScore: number;
  totalRoundsWon: number;
}

export interface ArcadeSeatRef {
  seatIndex: number;
  memberType: GameRoomMemberType;
  memberId: string;
  displayName: string;
  isBot: boolean;
}

export interface RoomStartedPayload {
  roomId: string;
  gameType: GameType;
  seats: ArcadeSeatRef[];
}

export interface RoomStartingPayload {
  roomId: string;
  startsAt: string;
}

export interface PresenceUpdatePayload {
  roomId: string;
  online: string[];
}

// Word Bomb realtime payloads (socket-only, never persisted verbatim — see word-bomb.engine.ts)

export interface WordBombTurnStartPayload {
  roomId: string;
  activeSeat: number;
  prompt: string;
  fuseMs: number;
  deadlineAt: number;
  players: { seat: number; lives: number; alive: boolean }[];
}

export type WordBombRejectReason = 'empty' | 'not_a_word' | 'already_used' | 'missing_substring';

export interface WordBombSubmitResultPayload {
  roomId: string;
  seat: number;
  word: string;
  accepted: boolean;
  reason?: WordBombRejectReason;
}

export interface WordBombEliminatedPayload {
  roomId: string;
  seat: number;
  livesRemaining: number;
  eliminated: boolean;
  cause: 'timeout';
}

export interface WordBombRoundEndPayload {
  roomId: string;
  roundNumber: number;
  winnerSeat: number | null;
  standings: { seat: number; roundsWon: number; score: number }[];
}

export interface WordBombMatchEndPayload {
  roomId: string;
  players: { seat: number; placement?: number; won: boolean; score: number; roundsWon: number }[];
}

// Snake Royale realtime payloads — snake:tick fires ~15x/sec (server tick rate), never
// persisted verbatim (see snake-royale.engine.ts).

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GridPoint {
  x: number;
  y: number;
}

export interface SnakeSnapshotEntry {
  seat: number;
  alive: boolean;
  segments: GridPoint[];
  length: number;
}

export interface ArenaBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SnakeRoundStartPayload {
  roomId: string;
  roundNumber: number;
  gridSize: number;
  tickMs: number;
  snakes: SnakeSnapshotEntry[];
  pickups: GridPoint[];
  arenaBounds: ArenaBounds;
}

export interface SnakeTickPayload {
  roomId: string;
  tick: number;
  snakes: SnakeSnapshotEntry[];
  pickups: GridPoint[];
  arenaBounds: ArenaBounds;
  deaths: number[];
}

export interface SnakeRoundEndPayload {
  roomId: string;
  roundNumber: number;
  winnerSeat: number | null;
  standings: { seat: number; roundsWon: number; score: number }[];
}

export interface SnakeMatchEndPayload {
  roomId: string;
  players: { seat: number; placement?: number; won: boolean; score: number; roundsWon: number }[];
}

// Doodle Relay realtime payloads. Strokes are pure ephemeral relay, never persisted.

export type DoodleTool = 'pen' | 'eraser';
export type StrokePhase = 'start' | 'move' | 'end';

/** Normalized 0-1 coordinates (resolution-independent — the artist's canvas may be a
 *  different pixel size than a guesser's). */
export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface DoodleRoundStartPayload {
  roomId: string;
  roundNumber: number;
  artistSeat: number;
  wordLength: number;
  durationMs: number;
  deadlineAt: number;
}

/** Sent only to the artist, over their personal socket room — never broadcast room-wide. */
export interface DoodleRoundStartArtistPayload {
  roomId: string;
  roundNumber: number;
  word: string;
  durationMs: number;
  deadlineAt: number;
}

export interface DoodleStrokePayload {
  roomId: string;
  strokeId: string;
  phase: StrokePhase;
  point?: NormalizedPoint;
  color?: string;
  width?: number;
  tool?: DoodleTool;
}

export interface DoodleClearPayload {
  roomId: string;
}

export interface DoodleGuessResultPayload {
  roomId: string;
  correct: boolean;
  pointsAwarded?: number;
}

export interface DoodleGuessPublicPayload {
  roomId: string;
  seat: number;
  text: string;
}

export interface DoodleGuessCorrectPayload {
  roomId: string;
  seat: number;
  pointsAwarded: number;
  order: number;
}

export interface DoodleRoundRevealPayload {
  roomId: string;
  roundNumber: number;
  word: string;
  artistSeat: number;
  winnerSeat: number | null;
  scores: { seat: number; score: number; roundsWon: number }[];
}

export interface DoodleMatchEndPayload {
  roomId: string;
  players: { seat: number; placement?: number; won: boolean; score: number; roundsWon: number }[];
}

export type InquiryStatus = 'new' | 'replied' | 'archived';

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  status: InquiryStatus;
  replyMessage: string | null;
  repliedAt: string | null;
  createdAt: string;
}
