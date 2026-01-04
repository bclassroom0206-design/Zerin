
export interface User {
  id: string;
  email: string;
  password?: string;
  pin: string;
  mobile: string;
  profilePic?: string;
  name: string;
  tier?: 'FREE' | 'PRO' | 'ENTERPRISE';
  status?: 'ACTIVE' | 'REVOKED';
}

const STORAGE_KEY = 'zerin_users';
const CURRENT_USER_KEY = 'zerin_current_user';

const DEFAULT_TEST_USER: User = {
  id: 'default-tester-id',
  email: 'info@ab.com',
  pin: '1234',
  mobile: '0000000000',
  name: 'System Tester',
  tier: 'ENTERPRISE',
  status: 'ACTIVE',
  password: 'password123'
};

export const authService = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    let users: User[] = data ? JSON.parse(data) : [];
    
    // Ensure the default testing user always exists in the pool
    if (!users.find(u => u.email === DEFAULT_TEST_USER.email)) {
      users.push(DEFAULT_TEST_USER);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
    
    return users;
  },

  register: (user: Omit<User, 'id'>): User => {
    const users = authService.getUsers();
    const newUser: User = { 
      ...user, 
      id: Math.random().toString(36).substr(2, 9),
      tier: 'FREE',
      status: 'ACTIVE'
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return newUser;
  },

  login: (email: string, password?: string, pin?: string): User | null => {
    const users = authService.getUsers();
    const user = users.find(u => u.email === email);
    if (!user || user.status === 'REVOKED') return null;
    
    if (password && user.password === password) return user;
    if (pin && user.pin === pin) return user;
    
    return null;
  },

  updateUser: (id: string, updates: Partial<User>) => {
    const users = authService.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return;
    users[index] = { ...users[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    
    const current = authService.getCurrentUser();
    if (current && current.id === id) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[index]));
    }
  },

  deleteUser: (id: string) => {
    const users = authService.getUsers().filter(u => u.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  verifyPin: (pin: string): User | null => {
    const current = authService.getCurrentUser();
    if (current && current.pin === pin) return current;
    return null;
  },

  resetPin: (email: string) => {
    const users = authService.getUsers();
    const user = users.find(u => u.email === email);
    if (user) {
      console.log(`Email sent to ${email}. Your PIN is: ${user.pin}`);
      return true;
    }
    return false;
  }
};
