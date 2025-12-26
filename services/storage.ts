import { User, SessionResult } from '../types';

const USERS_KEY = 'neurorehab_users';
const SESSIONS_KEY = 'neurorehab_sessions';

export const storage = {
  getUsers: (): User[] => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
      return [];
    }
  },

  addUser: (name: string): User => {
    const users = storage.getUsers();
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
    };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  deleteUser: (userId: string) => {
    try {
      // Remove user
      const users = storage.getUsers().filter(u => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      
      // Remove associated sessions
      const sessions: SessionResult[] = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
      const filteredSessions = sessions.filter(s => s.userId !== userId);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(filteredSessions));
    } catch (e) {
      console.error("Failed to delete user data", e);
    }
  },

  saveSession: (session: SessionResult) => {
    try {
      const sessions: SessionResult[] = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
      sessions.push(session);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save session", e);
    }
  },

  getUserSessions: (userId: string): SessionResult[] => {
    try {
      const sessions: SessionResult[] = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
      return sessions.filter(s => s.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  },

  getAllData: () => {
    return {
      users: storage.getUsers(),
      sessions: JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
    };
  },

  importData: (data: any) => {
    if (data && Array.isArray(data.users) && Array.isArray(data.sessions)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(data.users));
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions));
      return true;
    }
    return false;
  }
};