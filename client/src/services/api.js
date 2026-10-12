import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getToken() {
  return localStorage.getItem('busora_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('busora_token', token);
  } else {
    localStorage.removeItem('busora_token');
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('busora_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('busora_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('busora_user');
  }
}

export async function apiRequest(path, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}/api${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(API_BASE, {
      auth: {
        token: getToken(),
      },
      reconnectionAttempts: 5,
    });
  }
  return socketInstance;
}

export function resetSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export const API_URL = API_BASE;
