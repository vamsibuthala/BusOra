import { io } from 'socket.io-client';
import { handleLocalApi, localSocket } from './localBackend';

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

// Determines if requests should use the in-browser local engine
function shouldUseLocalEngine() {
  if (typeof window === 'undefined') return false;
  // If running on a remote host (e.g. Vercel deployment) and API_BASE points to localhost or isn't a remote HTTPS backend
  const isRemoteHost = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const isApiLocalhost = !API_BASE || API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1');
  return isRemoteHost && isApiLocalhost;
}

export async function apiRequest(path, method = 'GET', body = null) {
  if (shouldUseLocalEngine()) {
    return await handleLocalApi(path, method, body);
  }

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

  try {
    const response = await fetch(`${API_BASE}/api${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err) {
    // If it's a network error (like "Failed to fetch", CORS, mixed-content, or offline backend), seamlessly fallback to local engine
    if (
      err.message === 'Failed to fetch' ||
      err.name === 'TypeError' ||
      err.message.includes('NetworkError') ||
      err.message.includes('fetch')
    ) {
      console.warn(`[BusOra Engine] Backend unavailable (${err.message}). Seamlessly failing over to cloud client engine.`);
      return await handleLocalApi(path, method, body);
    }
    throw err;
  }
}

let socketInstance = null;

export function getSocket() {
  if (shouldUseLocalEngine()) {
    return localSocket;
  }

  if (!socketInstance) {
    try {
      socketInstance = io(API_BASE, {
        auth: {
          token: getToken(),
        },
        reconnectionAttempts: 2,
        timeout: 3000,
      });

      socketInstance.on('connect_error', () => {
        console.warn('[BusOra] Remote socket connection error; using local event emitter.');
      });
    } catch {
      return localSocket;
    }
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
