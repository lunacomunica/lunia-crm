import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('lunia_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const contactsApi = {
  list: (params?: Record<string, string>) => api.get('/contacts', { params }),
  get: (id: number) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: number, data: any) => api.put(`/contacts/${id}`, data),
  delete: (id: number) => api.delete(`/contacts/${id}`),
  bulkDelete: (ids: number[]) => api.delete('/contacts/bulk', { data: { ids } }),
};

export const usersApi = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
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
  deleteLead: (id: number) => api.delete(`/meta/instagram-leads/${id}`),
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  readAll: () => api.patch('/notifications/read-all'),
  read: (id: number) => api.patch(`/notifications/${id}/read`),
};

export const agencyClientsApi = {
  list: () => api.get('/agency-clients'),
  get: (id: number) => api.get(`/agency-clients/${id}`),
  production: () => api.get('/agency-clients/production'),
  create: (data: any) => api.post('/agency-clients', data),
  update: (id: number, data: any) => api.put(`/agency-clients/${id}`, data),
  delete: (id: number) => api.delete(`/agency-clients/${id}`),
};

export const contentApi = {
  list: (params?: Record<string, string>) => api.get('/content', { params }),
  get: (id: number) => api.get(`/content/${id}`),
  create: (data: any) => api.post('/content', data),
  update: (id: number, data: any) => api.put(`/content/${id}`, data),
  updateStatus: (id: number, status: string, comment?: string) => api.patch(`/content/${id}/status`, { status, comment }),
  addComment: (id: number, message: string) => api.post(`/content/${id}/comments`, { message }),
  delete: (id: number) => api.delete(`/content/${id}`),
  listBatches: (params?: Record<string, string>) => api.get('/content/batches', { params }),
  createBatch: (data: any) => api.post('/content/batches', data),
  deleteBatch: (id: number) => api.delete(`/content/batches/${id}`),
  getTasks: (id: number) => api.get(`/content/${id}/tasks`),
  createWorkflow: (id: number, stages: any[]) => api.post(`/content/${id}/workflow`, { stages }),
  createBatchWorkflow: (batchId: number, stages: any[]) => api.post(`/content/batches/${batchId}/workflow`, { stages }),
  productionBatches: () => api.get('/content/batches/production'),
  bulkWorkflow: (batch_ids: number[], stages: any[]) => api.post('/content/batches/bulk-workflow', { batch_ids, stages }),
};

export const workflowTemplatesApi = {
  list: () => api.get('/workflow-templates'),
  create: (data: { name: string; stages: any[] }) => api.post('/workflow-templates', data),
  update: (id: number, data: { name: string; stages: any[] }) => api.put(`/workflow-templates/${id}`, data),
  delete: (id: number) => api.delete(`/workflow-templates/${id}`),
};

export const campaignsApi = {
  list: (params?: Record<string, string>) => api.get('/campaigns', { params }),
  get: (id: number) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: number, data: any) => api.put(`/campaigns/${id}`, data),
  delete: (id: number) => api.delete(`/campaigns/${id}`),
  addCreative: (id: number, data: any) => api.post(`/campaigns/${id}/creatives`, data),
  updateCreative: (id: number, cid: number, data: any) => api.put(`/campaigns/${id}/creatives/${cid}`, data),
  deleteCreative: (id: number, cid: number) => api.delete(`/campaigns/${id}/creatives/${cid}`),
};

export const productsApi = {
  list: () => api.get('/products'),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

export const profileApi = {
  update: (data: any) => api.put('/auth/profile', data),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (settings: Record<string, string>) => api.put('/settings', { settings }),
  getWebhookInfo: () => api.get('/settings/webhook-info'),
  testConnection: (type: string) => api.post('/settings/test-connection', { type }),
};

export const tasksApi = {
  list: (params?: Record<string, string>) => api.get('/tasks', { params }),
  create: (data: any) => api.post('/tasks', data),
  update: (id: number, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  start: (id: number) => api.post(`/tasks/${id}/start`),
  pause: (id: number) => api.post(`/tasks/${id}/pause`),
  complete: (id: number, handoff?: { next_assigned_to?: number; next_stage?: string; next_title?: string }) =>
    api.post(`/tasks/${id}/complete`, handoff || {}),
  listComments: (id: number) => api.get(`/tasks/${id}/comments`),
  addComment: (id: number, content: string) => api.post(`/tasks/${id}/comments`, { content }),
  teamOverview: () => api.get('/tasks/team-overview'),
};

export const clientCrmApi = {
  dashboard: (clientId: number) => api.get(`/client-crm/${clientId}/dashboard`),
  contacts: (clientId: number, params?: Record<string, string>) => api.get(`/client-crm/${clientId}/contacts`, { params }),
  createContact: (clientId: number, data: any) => api.post(`/client-crm/${clientId}/contacts`, data),
  updateContact: (clientId: number, id: number, data: any) => api.put(`/client-crm/${clientId}/contacts/${id}`, data),
  deleteContact: (clientId: number, id: number) => api.delete(`/client-crm/${clientId}/contacts/${id}`),
  deals: (clientId: number) => api.get(`/client-crm/${clientId}/deals`),
  createDeal: (clientId: number, data: any) => api.post(`/client-crm/${clientId}/deals`, data),
  updateDeal: (clientId: number, id: number, data: any) => api.put(`/client-crm/${clientId}/deals/${id}`, data),
  deleteDeal: (clientId: number, id: number) => api.delete(`/client-crm/${clientId}/deals/${id}`),
};

export const clientPortalApi = {
  summary: (clientId: number) => api.get(`/client-portal/${clientId}/summary`),
  goals: (clientId: number) => api.get(`/client-portal/${clientId}/goals`),
  updateGoals: (clientId: number, goals: any[]) => api.put(`/client-portal/${clientId}/goals`, { goals }),
  positioning: (clientId: number) => api.get(`/client-portal/${clientId}/positioning`),
  updatePositioning: (clientId: number, data: any) => api.put(`/client-portal/${clientId}/positioning`, data),
};

export const uploadApi = {
  files: (files: File[]) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const adminApi = {
  listTenants: () => api.get('/admin/tenants'),
  createTenant: (data: { name: string; admin_name: string; admin_email: string; admin_password: string }) => api.post('/admin/tenants', data),
  deleteTenant: (id: number) => api.delete(`/admin/tenants/${id}`),
};
