import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const contactsApi = {
  list: (params?: Record<string, string>) => api.get('/contacts', { params }),
  get: (id: number) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: number, data: any) => api.put(`/contacts/${id}`, data),
  delete: (id: number) => api.delete(`/contacts/${id}`),
};

export const dealsApi = {
  list: (params?: Record<string, string>) => api.get('/deals', { params }),
  get: (id: number) => api.get(`/deals/${id}`),
  create: (data: any) => api.post('/deals', data),
  update: (id: number, data: any) => api.put(`/deals/${id}`, data),
  updateStage: (id: number, stage: string) => api.patch(`/deals/${id}/stage`, { stage }),
  delete: (id: number) => api.delete(`/deals/${id}`),
};

export const conversationsApi = {
  list: (params?: Record<string, string>) => api.get('/conversations', { params }),
  getMessages: (id: number) => api.get(`/conversations/${id}/messages`),
  sendMessage: (id: number, content: string) => api.post(`/conversations/${id}/messages`, { content }),
  markRead: (id: number) => api.patch(`/conversations/${id}/read`),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const metaApi = {
  getInstagramLeads: () => api.get('/meta/instagram-leads'),
  convertLead: (id: number) => api.post(`/meta/instagram-leads/${id}/convert`),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (settings: Record<string, string>) => api.put('/settings', { settings }),
  getWebhookInfo: () => api.get('/settings/webhook-info'),
  testConnection: (type: string) => api.post('/settings/test-connection', { type }),
};
