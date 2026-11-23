export type AppSection =
  | 'home'
  | 'tasks'
  | 'calendar'
  | 'habits'
  | 'finance'
  | 'goals'
  | 'myspace'
  | 'profile';

export type AuthScreen = 'welcome' | 'login' | 'signup' | 'forgot' | 'profile-setup';

export type ThemePreference = 'light' | 'dark';

export type AppColorPaletteId =
  | 'slate'
  | 'emerald'
  | 'indigo'
  | 'plum'
  | 'terracotta'
  | 'cobalt'
  | 'teal'
  | 'charcoal'
  | 'custom';

export interface NotificationSettings {
  enabled: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  habitReminders: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roleTitle: string;
  bio: string;
  avatarDataUrl?: string;
  currency: string;
  theme: ThemePreference;
  colorPalette?: AppColorPaletteId;
  customColor?: string;
  notifications: NotificationSettings;
  profileCompleted: boolean;
  isPreviewAccount?: boolean;
  createdAt: string;
}

export interface LocalAuthAccount {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD or ''
  priority: TaskPriority;
  category: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export type CalendarEventType = 'event' | 'reminder' | 'important';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm or ''
  endTime: string; // HH:mm or ''
  type: CalendarEventType;
  description: string;
  createdAt: string;
}

export type HabitFrequency = 'daily' | 'weekly';

export interface Habit {
  id: string;
  title: string;
  frequency: HabitFrequency;
  targetPerWeek: number;
  category: string;
  completedDates: string[]; // YYYY-MM-DD[]
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
}

export type PersonMoneyDirection = 'given' | 'received';

export interface PersonMoneyEntry {
  id: string;
  direction: PersonMoneyDirection;
  personName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  dueDate?: string; // optional expected return date YYYY-MM-DD
  note: string;
  createdAt: string;
}

export interface CategoryBudget {
  id: string;
  category: string;
  monthlyLimit: number;
}

export type GoalCategory = 'personal' | 'professional';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  deadline: string; // YYYY-MM-DD or ''
  description: string;
  milestones: Milestone[];
  completed: boolean;
  createdAt: string;
}

export type SpaceItemType = 'file' | 'link' | 'note';

export type SpaceFileKind =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'ppt'
  | 'image'
  | 'other';

export interface SpaceFolder {
  id: string;
  parentId: string | null;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceItem {
  id: string;
  folderId: string | null; // null = root My Space
  itemType: SpaceItemType;
  title: string;
  description: string;
  // File fields
  fileKind?: SpaceFileKind;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  blobKey?: string;
  // Link fields
  url?: string;
  isYoutube?: boolean;
  // Note fields
  noteContent?: string;
  // Organization
  favorite: boolean;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export interface UserWorkspaceData {
  tasks: Task[];
  events: CalendarEvent[];
  habits: Habit[];
  transactions: Transaction[];
  personEntries: PersonMoneyEntry[];
  budgets: CategoryBudget[];
  financeCategories: string[];
  taskCategories: string[];
  goals: Goal[];
  folders: SpaceFolder[];
  spaceItems: SpaceItem[];
}
