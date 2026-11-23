import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {
  createSampleWorkspaceData,
  createPreviewProfile,
  PREVIEW_USER_ID,
} from '../data/sampleData';
import {detectSpaceFileKind, extractYoutubeId, toISODate} from '../lib/platform';
import {
  clearUserWorkspace,
  createEmptyWorkspace,
  deleteFileBlob,
  getAccounts,
  getActiveSessionUserId,
  getFileBlob,
  getUserProfile,
  getUserWorkspace,
  hashPassword,
  saveAccounts,
  saveFileBlob,
  saveUserProfile,
  saveUserWorkspace,
  setActiveSessionUserId,
} from '../lib/storage';
import {applyAppPaletteToDom} from '../lib/themePalettes';
import type {
  AppColorPaletteId,
  AppSection,
  AuthScreen,
  CalendarEvent,
  CategoryBudget,
  Goal,
  Habit,
  PersonMoneyEntry,
  SpaceFolder,
  SpaceItem,
  Task,
  ThemePreference,
  Transaction,
  UserProfile,
  UserWorkspaceData,
} from '../types/onespace';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

interface AppContextValue {
  // Navigation & UI
  activeSection: AppSection;
  setActiveSection: (section: AppSection) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  authScreen: AuthScreen;
  setAuthScreen: (screen: AuthScreen) => void;
  toast: ToastMessage | null;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  confirmDialog: ConfirmDialogState | null;
  requestConfirm: (dialog: ConfirmDialogState) => void;
  closeConfirm: () => void;

  // Auth & Profile
  user: UserProfile | null;
  isAuthReady: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ok: boolean; error?: string}>;
  login: (email: string, password: string) => Promise<{ok: boolean; error?: string}>;
  resetLocalPassword: (email: string, newPassword: string) => Promise<{ok: boolean; error?: string}>;
  enterSamplePreview: () => void;
  completeProfileSetup: (updates: Partial<UserProfile>) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemePreference) => void;
  setColorPalette: (colorPalette: AppColorPaletteId, customColor?: string) => void;
  logout: () => void;
  clearAllUserData: () => void;

  // Workspace Data
  data: UserWorkspaceData;

  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addTaskCategory: (name: string) => void;

  // Calendar Events
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Habits
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'completedDates'>) => void;
  toggleHabitDate: (habitId: string, isoDate?: string) => void;
  deleteHabit: (habitId: string) => void;

  // Finance
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  deleteTransaction: (id: string) => void;
  addPersonEntry: (entry: Omit<PersonMoneyEntry, 'id' | 'createdAt'>) => void;
  updatePersonEntry: (id: string, updates: Partial<PersonMoneyEntry>) => void;
  deletePersonEntry: (id: string) => void;
  addFinanceCategory: (name: string) => void;
  upsertBudget: (category: string, monthlyLimit: number) => void;
  deleteBudget: (id: string) => void;

  // Goals
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'completed'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  toggleGoalCompleted: (goalId: string) => void;
  deleteGoal: (goalId: string) => void;

  // My Space
  createFolder: (name: string, parentId: string | null, description?: string) => SpaceFolder;
  renameFolder: (folderId: string, name: string, description?: string) => void;
  deleteFolder: (folderId: string) => Promise<void>;
  uploadFilesToSpace: (
    files: FileList | File[],
    folderId: string | null,
    category?: string,
    tags?: string[]
  ) => Promise<void>;
  addLinkToSpace: (payload: {
    folderId: string | null;
    title: string;
    url: string;
    description: string;
    category: string;
    tags: string[];
  }) => void;
  addNoteToSpace: (payload: {
    folderId: string | null;
    title: string;
    description: string;
    noteContent: string;
    category: string;
    tags: string[];
  }) => void;
  updateSpaceItem: (itemId: string, updates: Partial<SpaceItem>) => void;
  deleteSpaceItem: (itemId: string) => Promise<void>;
  touchSpaceItem: (itemId: string) => void;
  getSpaceFileBlob: (blobKey: string) => Promise<Blob | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AppProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('welcome');
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [globalSearch, setGlobalSearch] = useState('');
  const [data, setData] = useState<UserWorkspaceData>(() => createEmptyWorkspace());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = makeId('toast');
    setToast({id, type, text});
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3400);
  }, []);

  const requestConfirm = useCallback((dialog: ConfirmDialogState) => {
    setConfirmDialog(dialog);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  // Apply Tailwind v4 `.dark` class and dynamic color palette CSS vars on <html>
  useEffect(() => {
    const theme = user?.theme ?? 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    applyAppPaletteToDom(user?.colorPalette ?? 'slate', user?.customColor);
  }, [user?.theme, user?.colorPalette, user?.customColor]);

  // Restore active user session on mount
  useEffect(() => {
    const sessionUserId = getActiveSessionUserId();
    if (sessionUserId) {
      const loadedProfile = getUserProfile(sessionUserId);
      if (loadedProfile) {
        setUser(loadedProfile);
        setData(getUserWorkspace(sessionUserId));
        if (!loadedProfile.profileCompleted) {
          setAuthScreen('profile-setup');
        }
      } else {
        setActiveSessionUserId(null);
      }
    }
    setIsAuthReady(true);
  }, []);

  // Helper to update workspace and persist isolated to current user
  const commitData = useCallback(
    (updater: (prev: UserWorkspaceData) => UserWorkspaceData) => {
      setData((prev) => {
        const next = updater(prev);
        if (user) {
          saveUserWorkspace(user.id, next);
        }
        return next;
      });
    },
    [user]
  );

  // Auth Actions
  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const normalized = email.trim().toLowerCase();
      const accounts = getAccounts();
      if (accounts.some((acc) => acc.email === normalized)) {
        return {ok: false, error: 'An account with this email already exists on this device.'};
      }
      const userId = makeId('user');
      const passwordHash = await hashPassword(password);
      saveAccounts([
        ...accounts,
        {id: userId, email: normalized, passwordHash, createdAt: new Date().toISOString()},
      ]);

      const newProfile: UserProfile = {
        id: userId,
        email: normalized,
        fullName: fullName.trim(),
        roleTitle: '',
        bio: '',
        currency: 'USD',
        theme: 'light',
        notifications: {
          enabled: true,
          taskReminders: true,
          eventReminders: true,
          habitReminders: true,
        },
        profileCompleted: false,
        isPreviewAccount: false,
        createdAt: new Date().toISOString(),
      };

      const emptyWorkspace = createEmptyWorkspace();
      saveUserProfile(newProfile);
      saveUserWorkspace(userId, emptyWorkspace);
      setActiveSessionUserId(userId);
      setUser(newProfile);
      setData(emptyWorkspace);
      setAuthScreen('profile-setup');
      setActiveSection('home');
      showToast('Account created. Let us finish setting up your profile.');
      return {ok: true};
    },
    [showToast]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      const accounts = getAccounts();
      const match = accounts.find((acc) => acc.email === normalized);
      if (!match) {
        return {ok: false, error: 'No local account found for that email address.'};
      }
      const hash = await hashPassword(password);
      if (match.passwordHash !== hash) {
        return {ok: false, error: 'Incorrect password. Please try again.'};
      }
      const profile = getUserProfile(match.id);
      if (!profile) {
        return {ok: false, error: 'Account profile data could not be loaded.'};
      }
      setActiveSessionUserId(match.id);
      setUser(profile);
      setData(getUserWorkspace(match.id));
      setActiveSection('home');
      if (!profile.profileCompleted) {
        setAuthScreen('profile-setup');
      }
      showToast(`Welcome back, ${profile.fullName.split(' ')[0]}!`);
      return {ok: true};
    },
    [showToast]
  );

  const resetLocalPassword = useCallback(
    async (email: string, newPassword: string) => {
      const normalized = email.trim().toLowerCase();
      const accounts = getAccounts();
      const idx = accounts.findIndex((acc) => acc.email === normalized);
      if (idx === -1) {
        return {ok: false, error: 'No local account exists with this email address.'};
      }
      const nextHash = await hashPassword(newPassword);
      const updated = [...accounts];
      updated[idx] = {...updated[idx], passwordHash: nextHash};
      saveAccounts(updated);
      showToast('Local account password updated. You can log in now.');
      return {ok: true};
    },
    [showToast]
  );

  const enterSamplePreview = useCallback(() => {
    let previewProfile = getUserProfile(PREVIEW_USER_ID);
    if (!previewProfile) {
      previewProfile = createPreviewProfile();
      saveUserProfile(previewProfile);
    }
    const existingRaw = localStorage.getItem(`onespace_v2_workspace_${PREVIEW_USER_ID}`);
    const workspace = existingRaw
      ? getUserWorkspace(PREVIEW_USER_ID)
      : createSampleWorkspaceData();
    if (!existingRaw) {
      saveUserWorkspace(PREVIEW_USER_ID, workspace);
    }
    setActiveSessionUserId(PREVIEW_USER_ID);
    setUser(previewProfile);
    setData(workspace);
    setActiveSection('home');
    showToast('Entered Sample Preview Workspace (clearly separated from real accounts).', 'info');
  }, [showToast]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = {...prev, ...updates};
      saveUserProfile(next);
      return next;
    });
  }, []);

  const completeProfileSetup = useCallback(
    (updates: Partial<UserProfile>) => {
      updateProfile({...updates, profileCompleted: true});
      showToast('Profile setup complete!');
    },
    [updateProfile, showToast]
  );

  const setTheme = useCallback(
    (theme: ThemePreference) => {
      updateProfile({theme});
    },
    [updateProfile]
  );

  const toggleTheme = useCallback(() => {
    if (!user) return;
    updateProfile({theme: user.theme === 'dark' ? 'light' : 'dark'});
  }, [user, updateProfile]);

  const setColorPalette = useCallback(
    (colorPalette: AppColorPaletteId, customColor?: string) => {
      updateProfile({
        colorPalette,
        ...(customColor !== undefined ? {customColor} : {}),
      });
    },
    [updateProfile]
  );

  const logout = useCallback(() => {
    setActiveSessionUserId(null);
    setUser(null);
    setData(createEmptyWorkspace());
    setGlobalSearch('');
    setAuthScreen('welcome');
    setActiveSection('home');
    document.documentElement.classList.remove('dark');
    applyAppPaletteToDom('slate');
    showToast('Logged out safely.', 'info');
  }, [showToast]);

  const clearAllUserData = useCallback(() => {
    if (!user) return;
    // Delete all IndexedDB blobs belonging to this user
    data.spaceItems.forEach((item) => {
      if (item.blobKey) {
        void deleteFileBlob(item.blobKey);
      }
    });
    clearUserWorkspace(user.id);
    const fresh = createEmptyWorkspace();
    saveUserWorkspace(user.id, fresh);
    setData(fresh);
    showToast('All personal workspace items have been cleared.', 'info');
  }, [user, data.spaceItems, showToast]);

  // Tasks
  const addTask = useCallback(
    (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => {
      const nextTask: Task = {
        ...task,
        id: makeId('task'),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      commitData((prev) => ({...prev, tasks: [nextTask, ...prev.tasks]}));
      showToast('Task added.');
    },
    [commitData, showToast]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      commitData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? {...t, ...updates} : t)),
      }));
      showToast('Task updated.');
    },
    [commitData, showToast]
  );

  const toggleTask = useCallback(
    (id: string) => {
      commitData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? new Date().toISOString() : undefined,
              }
            : t
        ),
      }));
    },
    [commitData]
  );

  const deleteTask = useCallback(
    (id: string) => {
      commitData((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      }));
      showToast('Task deleted.', 'info');
    },
    [commitData, showToast]
  );

  const addTaskCategory = useCallback(
    (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      commitData((prev) =>
        prev.taskCategories.includes(clean)
          ? prev
          : {...prev, taskCategories: [...prev.taskCategories, clean]}
      );
    },
    [commitData]
  );

  // Calendar Events
  const addEvent = useCallback(
    (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
      const nextEvent: CalendarEvent = {
        ...event,
        id: makeId('evt'),
        createdAt: new Date().toISOString(),
      };
      commitData((prev) => ({...prev, events: [...prev.events, nextEvent]}));
      showToast('Event added to calendar.');
    },
    [commitData, showToast]
  );

  const updateEvent = useCallback(
    (id: string, updates: Partial<CalendarEvent>) => {
      commitData((prev) => ({
        ...prev,
        events: prev.events.map((e) => (e.id === id ? {...e, ...updates} : e)),
      }));
      showToast('Event updated.');
    },
    [commitData, showToast]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      commitData((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.id !== id),
      }));
      showToast('Event deleted.', 'info');
    },
    [commitData, showToast]
  );

  // Habits
  const addHabit = useCallback(
    (habit: Omit<Habit, 'id' | 'createdAt' | 'completedDates'>) => {
      const nextHabit: Habit = {
        ...habit,
        id: makeId('hab'),
        completedDates: [],
        createdAt: new Date().toISOString(),
      };
      commitData((prev) => ({...prev, habits: [nextHabit, ...prev.habits]}));
      showToast('Habit created.');
    },
    [commitData, showToast]
  );

  const toggleHabitDate = useCallback(
    (habitId: string, isoDate: string = toISODate()) => {
      commitData((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== habitId) return h;
          const exists = h.completedDates.includes(isoDate);
          return {
            ...h,
            completedDates: exists
              ? h.completedDates.filter((d) => d !== isoDate)
              : [...h.completedDates, isoDate].sort(),
          };
        }),
      }));
    },
    [commitData]
  );

  const deleteHabit = useCallback(
    (habitId: string) => {
      commitData((prev) => ({
        ...prev,
        habits: prev.habits.filter((h) => h.id !== habitId),
      }));
      showToast('Habit deleted.', 'info');
    },
    [commitData, showToast]
  );

  // Finance
  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
      const nextTx: Transaction = {
        ...tx,
        id: makeId('tx'),
        createdAt: new Date().toISOString(),
      };
      commitData((prev) => ({
        ...prev,
        transactions: [nextTx, ...prev.transactions],
        financeCategories: prev.financeCategories.includes(tx.category)
          ? prev.financeCategories
          : [...prev.financeCategories, tx.category],
      }));
      showToast(`${tx.type === 'income' ? 'Income' : 'Expense'} recorded.`);
    },
    [commitData, showToast]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      commitData((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
      showToast('Transaction deleted.', 'info');
    },
    [commitData, showToast]
  );

  const addPersonEntry = useCallback(
    (entry: Omit<PersonMoneyEntry, 'id' | 'createdAt'>) => {
      const nextEntry: PersonMoneyEntry = {
        ...entry,
        personName: entry.personName.trim(),
        note: entry.note.trim(),
        id: makeId('pm'),
        createdAt: new Date().toISOString(),
      };
      commitData((prev) => ({
        ...prev,
        personEntries: [nextEntry, ...(prev.personEntries ?? [])],
      }));
      showToast(
        entry.direction === 'given'
          ? `Recorded money given to ${nextEntry.personName}.`
          : `Recorded money received from ${nextEntry.personName}.`
      );
    },
    [commitData, showToast]
  );

  const updatePersonEntry = useCallback(
    (id: string, updates: Partial<PersonMoneyEntry>) => {
      commitData((prev) => ({
        ...prev,
        personEntries: (prev.personEntries ?? []).map((item) =>
          item.id === id
            ? {
                ...item,
                ...updates,
                personName:
                  updates.personName !== undefined
                    ? updates.personName.trim()
                    : item.personName,
                note: updates.note !== undefined ? updates.note.trim() : item.note,
              }
            : item
        ),
      }));
      showToast('Person entry updated.');
    },
    [commitData, showToast]
  );

  const deletePersonEntry = useCallback(
    (id: string) => {
      commitData((prev) => ({
        ...prev,
        personEntries: (prev.personEntries ?? []).filter((item) => item.id !== id),
      }));
      showToast('Person entry deleted.', 'info');
    },
    [commitData, showToast]
  );

  const addFinanceCategory = useCallback(
    (name: string) => {
      const clean = name.trim();
      if (!clean) return;
      commitData((prev) =>
        prev.financeCategories.includes(clean)
          ? prev
          : {...prev, financeCategories: [...prev.financeCategories, clean]}
      );
      showToast(`Category "${clean}" added.`);
    },
    [commitData, showToast]
  );

  const upsertBudget = useCallback(
    (category: string, monthlyLimit: number) => {
      commitData((prev) => {
        const existing = prev.budgets.find((b) => b.category === category);
        if (existing) {
          return {
            ...prev,
            budgets: prev.budgets.map((b) =>
              b.category === category ? {...b, monthlyLimit} : b
            ),
          };
        }
        const nextBudget: CategoryBudget = {
          id: makeId('bud'),
          category,
          monthlyLimit,
        };
        return {...prev, budgets: [...prev.budgets, nextBudget]};
      });
      showToast('Monthly budget saved.');
    },
    [commitData, showToast]
  );

  const deleteBudget = useCallback(
    (id: string) => {
      commitData((prev) => ({
        ...prev,
        budgets: prev.budgets.filter((b) => b.id !== id),
      }));
      showToast('Budget removed.', 'info');
    },
    [commitData, showToast]
  );

  // Goals
  const addGoal = useCallback(
    (goal: Omit<Goal, 'id' | 'createdAt' | 'completed'>) => {
      const nextGoal: Goal = {
        ...goal,
        id: makeId('goal'),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      commitData((prev) => ({...prev, goals: [nextGoal, ...prev.goals]}));
      showToast('Goal created.');
    },
    [commitData, showToast]
  );

  const updateGoal = useCallback(
    (id: string, updates: Partial<Goal>) => {
      commitData((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === id ? {...g, ...updates} : g)),
      }));
      showToast('Goal updated.');
    },
    [commitData, showToast]
  );

  const toggleMilestone = useCallback(
    (goalId: string, milestoneId: string) => {
      commitData((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => {
          if (g.id !== goalId) return g;
          const updatedMilestones = g.milestones.map((m) =>
            m.id === milestoneId ? {...m, completed: !m.completed} : m
          );
          const allDone =
            updatedMilestones.length > 0 && updatedMilestones.every((m) => m.completed);
          return {
            ...g,
            milestones: updatedMilestones,
            completed: allDone ? true : g.completed,
          };
        }),
      }));
    },
    [commitData]
  );

  const toggleGoalCompleted = useCallback(
    (goalId: string) => {
      commitData((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === goalId ? {...g, completed: !g.completed} : g
        ),
      }));
    },
    [commitData]
  );

  const deleteGoal = useCallback(
    (goalId: string) => {
      commitData((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== goalId),
      }));
      showToast('Goal deleted.', 'info');
    },
    [commitData, showToast]
  );

  // My Space
  const createFolder = useCallback(
    (name: string, parentId: string | null, description = '') => {
      const now = new Date().toISOString();
      const folder: SpaceFolder = {
        id: makeId('fld'),
        parentId,
        name: name.trim(),
        description: description.trim(),
        createdAt: now,
        updatedAt: now,
      };
      commitData((prev) => ({...prev, folders: [...prev.folders, folder]}));
      showToast(`Folder "${folder.name}" created.`);
      return folder;
    },
    [commitData, showToast]
  );

  const renameFolder = useCallback(
    (folderId: string, name: string, description?: string) => {
      commitData((prev) => ({
        ...prev,
        folders: prev.folders.map((f) =>
          f.id === folderId
            ? {
                ...f,
                name: name.trim(),
                description: description !== undefined ? description.trim() : f.description,
                updatedAt: new Date().toISOString(),
              }
            : f
        ),
      }));
      showToast('Folder updated.');
    },
    [commitData, showToast]
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      // Collect folder + all nested descendant folder IDs
      const toDeleteFolderIds = new Set<string>([folderId]);
      let added = true;
      while (added) {
        added = false;
        for (const f of data.folders) {
          if (f.parentId && toDeleteFolderIds.has(f.parentId) && !toDeleteFolderIds.has(f.id)) {
            toDeleteFolderIds.add(f.id);
            added = true;
          }
        }
      }

      // Remove binary blobs for files inside deleted folders
      const affectedItems = data.spaceItems.filter(
        (item) => item.folderId && toDeleteFolderIds.has(item.folderId)
      );
      for (const item of affectedItems) {
        if (item.blobKey) {
          await deleteFileBlob(item.blobKey);
        }
      }

      commitData((prev) => ({
        ...prev,
        folders: prev.folders.filter((f) => !toDeleteFolderIds.has(f.id)),
        spaceItems: prev.spaceItems.filter(
          (item) => !item.folderId || !toDeleteFolderIds.has(item.folderId)
        ),
      }));
      showToast('Folder and its contents deleted.', 'info');
    },
    [commitData, data.folders, data.spaceItems, showToast]
  );

  const uploadFilesToSpace = useCallback(
    async (
      files: FileList | File[],
      folderId: string | null,
      category = 'Documents',
      tags: string[] = []
    ) => {
      if (!user) return;
      const list = Array.from(files);
      if (list.length === 0) return;

      const createdItems: SpaceItem[] = [];
      for (const file of list) {
        const itemId = makeId('file');
        const blobKey = `${user.id}__${itemId}`;
        await saveFileBlob(blobKey, file);
        const now = new Date().toISOString();
        const kind = detectSpaceFileKind(file.name, file.type);
        createdItems.push({
          id: itemId,
          folderId,
          itemType: 'file',
          title: file.name,
          description: '',
          fileKind: kind,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          blobKey,
          favorite: false,
          category,
          tags,
          createdAt: now,
          updatedAt: now,
          lastAccessedAt: now,
        });
      }

      commitData((prev) => ({
        ...prev,
        spaceItems: [...createdItems, ...prev.spaceItems],
      }));
      showToast(
        createdItems.length === 1
          ? `Saved "${createdItems[0].fileName}" locally (Supabase Storage not yet connected).`
          : `Saved ${createdItems.length} files locally (Supabase Storage not yet connected).`
      );
    },
    [user, commitData, showToast]
  );

  const addLinkToSpace = useCallback(
    (payload: {
      folderId: string | null;
      title: string;
      url: string;
      description: string;
      category: string;
      tags: string[];
    }) => {
      const now = new Date().toISOString();
      const isYoutube = Boolean(extractYoutubeId(payload.url));
      const item: SpaceItem = {
        id: makeId('lnk'),
        folderId: payload.folderId,
        itemType: 'link',
        title: payload.title.trim(),
        description: payload.description.trim(),
        url: payload.url.trim(),
        isYoutube,
        favorite: false,
        category: payload.category.trim() || (isYoutube ? 'Video' : 'Web Link'),
        tags: payload.tags,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
      };
      commitData((prev) => ({
        ...prev,
        spaceItems: [item, ...prev.spaceItems],
      }));
      showToast(isYoutube ? 'YouTube link saved.' : 'Website link saved.');
    },
    [commitData, showToast]
  );

  const addNoteToSpace = useCallback(
    (payload: {
      folderId: string | null;
      title: string;
      description: string;
      noteContent: string;
      category: string;
      tags: string[];
    }) => {
      const now = new Date().toISOString();
      const item: SpaceItem = {
        id: makeId('note'),
        folderId: payload.folderId,
        itemType: 'note',
        title: payload.title.trim(),
        description: payload.description.trim(),
        noteContent: payload.noteContent,
        favorite: false,
        category: payload.category.trim() || 'Notes',
        tags: payload.tags,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
      };
      commitData((prev) => ({
        ...prev,
        spaceItems: [item, ...prev.spaceItems],
      }));
      showToast('Personal note saved.');
    },
    [commitData, showToast]
  );

  const updateSpaceItem = useCallback(
    (itemId: string, updates: Partial<SpaceItem>) => {
      commitData((prev) => ({
        ...prev,
        spaceItems: prev.spaceItems.map((item) =>
          item.id === itemId
            ? {...item, ...updates, updatedAt: new Date().toISOString()}
            : item
        ),
      }));
      showToast('Item updated.');
    },
    [commitData, showToast]
  );

  const deleteSpaceItem = useCallback(
    async (itemId: string) => {
      const target = data.spaceItems.find((i) => i.id === itemId);
      if (target?.blobKey) {
        await deleteFileBlob(target.blobKey);
      }
      commitData((prev) => ({
        ...prev,
        spaceItems: prev.spaceItems.filter((i) => i.id !== itemId),
      }));
      showToast('Item deleted.', 'info');
    },
    [commitData, data.spaceItems, showToast]
  );

  const touchSpaceItem = useCallback(
    (itemId: string) => {
      commitData((prev) => ({
        ...prev,
        spaceItems: prev.spaceItems.map((i) =>
          i.id === itemId ? {...i, lastAccessedAt: new Date().toISOString()} : i
        ),
      }));
    },
    [commitData]
  );

  const getSpaceFileBlob = useCallback(async (blobKey: string) => {
    return getFileBlob(blobKey);
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeSection,
        setActiveSection,
        globalSearch,
        setGlobalSearch,
        authScreen,
        setAuthScreen,
        toast,
        showToast,
        confirmDialog,
        requestConfirm,
        closeConfirm,
        user,
        isAuthReady,
        signUp,
        login,
        resetLocalPassword,
        enterSamplePreview,
        completeProfileSetup,
        updateProfile,
        toggleTheme,
        setTheme,
        setColorPalette,
        logout,
        clearAllUserData,
        data,
        addTask,
        updateTask,
        toggleTask,
        deleteTask,
        addTaskCategory,
        addEvent,
        updateEvent,
        deleteEvent,
        addHabit,
        toggleHabitDate,
        deleteHabit,
        addTransaction,
        deleteTransaction,
        addPersonEntry,
        updatePersonEntry,
        deletePersonEntry,
        addFinanceCategory,
        upsertBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        toggleMilestone,
        toggleGoalCompleted,
        deleteGoal,
        createFolder,
        renameFolder,
        deleteFolder,
        uploadFilesToSpace,
        addLinkToSpace,
        addNoteToSpace,
        updateSpaceItem,
        deleteSpaceItem,
        touchSpaceItem,
        getSpaceFileBlob,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
