const API_BASE = '/api';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('hardino_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) {
    localStorage.removeItem('hardino_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// Auth
export const login = (username: string, password: string) =>
  request<{ access_token: string; role: string; username: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const getMe = () => request<{ username: string; role: string }>('/users/me');

export const changePassword = (oldPassword: string, newPassword: string) =>
  request<any>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });

// LLM Settings
export const getLLMSettings = () => request<any>('/settings/llm');
export const updateLLMSettings = (data: any) =>
  request<any>('/settings/llm', { method: 'PUT', body: JSON.stringify(data) });
export const testLLMConnection = () =>
  request<{ status: string; message: string }>('/settings/llm/test', { method: 'POST' });

// Engagements
export const createEngagement = (data: any) =>
  request<{ id: string }>('/engagements', { method: 'POST', body: JSON.stringify(data) });

export const listEngagements = () => request<any[]>('/engagements');
export const getEngagement = (id: string) => request<any>(`/engagements/${id}`);
export const deleteEngagement = (id: string) =>
  request<any>(`/engagements/${id}`, { method: 'DELETE' });

export const runEngagement = (id: string) =>
  request<any>(`/engagements/${id}/run`, { method: 'POST' });

// Findings, Sessions, Reports
export const getFindings = (engagementId: string) =>
  request<any[]>(`/engagements/${engagementId}/findings`);

export const getSessions = (engagementId: string) =>
  request<any[]>(`/engagements/${engagementId}/sessions`);

export const getActions = (sessionId: string) =>
  request<any[]>(`/sessions/${sessionId}/actions`);

export const getReports = (engagementId: string) =>
  request<any[]>(`/engagements/${engagementId}/reports`);

export const getPhases = (engagementId: string) =>
  request<any[]>(`/engagements/${engagementId}/phases`);

// Dashboard
export const getDashboardStats = () => request<any>('/dashboard/stats');

// Tools
export const getChecklists = () => request<any>('/tools/checklists');
