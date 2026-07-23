import axios from 'axios';

// Auto-detect development vs production based on NODE_ENV
const getAPIBaseURL = () => {
  // Development: always use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  
  // Production: REQUIRE NEXT_PUBLIC_API_URL to be set
  if (!process.env.NEXT_PUBLIC_API_URL) {
    if (typeof window === 'undefined') {
      return 'http://localhost:4000';
    }
    console.error('❌ CRITICAL: NEXT_PUBLIC_API_URL is not set in production!');
    console.error('Please set this environment variable to your backend API URL.');
    throw new Error('NEXT_PUBLIC_API_URL is required in production');
  }
  
  return process.env.NEXT_PUBLIC_API_URL;
};

const API_BASE_URL = getAPIBaseURL();

// Debug: Log the API URL being used
if (typeof window !== 'undefined') {
  console.log('🔗 API_BASE_URL:', API_BASE_URL);
  console.log('🔗 NODE_ENV:', process.env.NODE_ENV);
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: redirect to login on expired/invalid session — but not for
// failed login/register attempts (those also return 401 and must surface errors in-place).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      const url = String(error.config?.url || '');
      const isPublicAuthFailure =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/forgot-password') ||
        url.includes('/auth/reset-password') ||
        url.includes('/auth/validate-reset-token');
      if (!isPublicAuthFailure) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  validateResetToken: (token) => api.post('/auth/validate-reset-token', { token }),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.patch('/auth/me', data),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getStudents: () => api.get('/users/students'),
  getInstructors: () => api.get('/users/instructors'),
  getRenters: () => api.get('/users/renters'),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.patch(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, password) => api.post(`/users/${id}/reset-password`, { password }),
  // Instructor assignments
  getAssignments: (instructorId) => api.get(`/users/instructors/${instructorId}/students`),
  assignStudent: (instructorId, studentId) => api.post(`/users/instructors/${instructorId}/students`, { studentId }),
  unassignStudent: (instructorId, studentId) => api.delete(`/users/instructors/${instructorId}/students/${studentId}`),
  getMyStudents: () => api.get('/users/my-students'), // For instructors to get their assigned students
  getStudentDashboard: (studentId) => api.get(`/users/students/${studentId}/dashboard`), // Student dashboard data
  getInstructionBilling: (userId) => api.get(`/users/${userId}/instructor-billing`),
  saveInstructionBilling: (userId, data) => api.post(`/users/${userId}/instructor-billing`, data),
  // People lookup
  getPeople: (ids) => api.get('/users/people', { params: { ids: ids.join(',') } }),
};

// Aircraft API
export const aircraftAPI = {
  getAll: () => api.get('/aircraft'),
  getById: (id) => api.get(`/aircraft/${id}`),
  create: (aircraftData) => api.post('/aircraft', aircraftData),
  update: (id, aircraftData) => api.patch(`/aircraft/${id}`, aircraftData),
  delete: (id) => api.delete(`/aircraft/${id}`),
  // Weight & Balance
  getLatestWeightBalance: (id) => api.get(`/aircraft/${id}/wb/latest`),
  updateWeightBalance: (id, wbData) => api.post(`/aircraft/${id}/wb`, wbData),
  // Hobbs & Tach Logs
  getLogs: (id) => api.get(`/aircraft/${id}/logs`),
  checkout: (id, hobbsTachData) => api.post(`/aircraft/${id}/checkout`, hobbsTachData),
  checkin: (id, hobbsTachData) => api.post(`/aircraft/${id}/checkin`, hobbsTachData),
  getFlights: () => api.get('/aircraft/flights'),
  createFlight: (data) => api.post('/aircraft/flights', data),
  removeFlight: (id) => api.delete(`/aircraft/flights/${id}`),
  checkoutFlight: (id, data) => api.post(`/aircraft/flights/${id}/checkout`, data),
  checkinFlight: (id, data) => api.post(`/aircraft/flights/${id}/checkin`, data),
};

// Squawks API
export const squawksAPI = {
  getAll: () => api.get('/squawks'),
  getById: (id) => api.get(`/squawks/${id}`),
  getByAircraft: (aircraftId) => api.get(`/squawks/aircraft/${aircraftId}`),
  create: (aircraftId, squawkData) => api.post(`/squawks/aircraft/${aircraftId}`, squawkData),
  resolve: (id) => api.post(`/squawks/${id}/resolve`),
};

// Lessons API
export const lessonsAPI = {
  getAll: (params = {}) => api.get('/lessons', { params }),
  getById: (id) => api.get(`/lessons/${id}`),
  create: (lessonData) => api.post('/lessons', lessonData),
  update: (id, lessonData) => api.patch(`/lessons/${id}`, lessonData),
  delete: (id) => api.delete(`/lessons/${id}`),
  checkout: (id, data) => api.post(`/lessons/${id}/checkout`, data),
  checkin: (id, data) => api.post(`/lessons/${id}/checkin`, data),
  complete: (id, data = {}) => api.post(`/lessons/${id}/complete`, data),
  checkConflicts: (params) => api.get('/lessons/conflicts', { params }),
  // Notes
  getNotes: (id) => api.get(`/lessons/${id}/notes`),
  addNote: (id, noteData) => api.post(`/lessons/${id}/notes`, noteData),
};

// Syllabus API
export const syllabusAPI = {
  list: () => api.get('/syllabus'),
  get: (id) => api.get(`/syllabus/${id}`),
  getActive: () => api.get('/syllabus/active'),
  create: (data) => api.post('/syllabus', data),
  update: (id, data) => api.patch(`/syllabus/${id}`, data),
  remove: (id) => api.delete(`/syllabus/${id}`),
  activate: (id) => api.post(`/syllabus/${id}/activate`),
  addStage: (syllabusId, data) => api.post(`/syllabus/${syllabusId}/stages`, data),
  updateStage: (stageId, data) => api.patch(`/syllabus/stages/${stageId}`, data),
  deleteStage: (stageId) => api.delete(`/syllabus/stages/${stageId}`),
  addLesson: (stageId, data) => api.post(`/syllabus/stages/${stageId}/lessons`, data),
  updateLesson: (lessonId, data) => api.patch(`/syllabus/lessons/${lessonId}`, data),
  deleteLesson: (lessonId) => api.delete(`/syllabus/lessons/${lessonId}`),
  getProgress: (studentId, syllabusId) => api.get(`/syllabus/progress/${studentId}${syllabusId ? `?syllabusId=${syllabusId}` : ''}`),
  markLessonComplete: (studentId, lessonId, note) => api.post(`/syllabus/progress/${studentId}/lessons/${lessonId}/credit`, { note }),
  unmarkLessonComplete: (studentId, lessonId) => api.delete(`/syllabus/progress/${studentId}/lessons/${lessonId}/credit`),
  getStageChecks: (studentId) => api.get(`/syllabus/stage-checks/${studentId}`),
  createStageCheck: (data) => api.post('/syllabus/stage-check', data),
};

// Maintenance API
export const maintenanceAPI = {
  getAll: () => api.get('/maintenance'),
  getById: (id) => api.get(`/maintenance/${id}`),
  getByAircraft: (aircraftId) => api.get(`/maintenance/aircraft/${aircraftId}`),
  create: (aircraftId, maintenanceData) => api.post(`/maintenance/aircraft/${aircraftId}`, maintenanceData),
  update: (id, maintenanceData) => api.patch(`/maintenance/${id}`, maintenanceData),
  delete: (id) => api.delete(`/maintenance/${id}`),
  complete: (id, data = {}) => api.post(`/maintenance/${id}/complete`, data),
};

// Rentals API
export const rentalsAPI = {
  getAll: () => api.get('/rentals'),
  getSchedule: (params = {}) => api.get('/rentals/schedule', { params }),
  getDashboard: (userId) => api.get(userId ? `/rentals/dashboard/${userId}` : '/rentals/dashboard'),
  getHours: (userId) => api.get(userId ? `/rentals/hours/${userId}` : '/rentals/hours'),
  allocateHours: (userId, data) => api.post(`/rentals/hours/${userId}/allocate`, data),
  getDocuments: (userId) => api.get(userId ? `/rentals/documents/${userId}` : '/rentals/documents'),
  createDocument: (userId, data) => api.post(userId ? `/rentals/documents/${userId}` : '/rentals/documents', data),
  updateDocument: (documentId, data) => api.patch(`/rentals/documents/record/${documentId}`, data),
  deleteDocument: (documentId) => api.delete(`/rentals/documents/record/${documentId}`),
  create: (data) => api.post('/rentals', data),
  update: (id, data) => api.patch(`/rentals/${id}`, data),
  remove: (id) => api.delete(`/rentals/${id}`),
  checkout: (id, data) => api.post(`/rentals/${id}/checkout`, data),
  checkin: (id, data) => api.post(`/rentals/${id}/checkin`, data),
};

// Billing and hour-package API
export const billingAPI = {
  getCatalog: () => api.get('/billing/catalog', {
    params: { _fresh: Date.now() },
    headers: { "Cache-Control": "no-cache" },
  }),
  createPackage: (data) => api.post('/billing/packages', data),
  updatePackage: (id, data) => api.patch(`/billing/packages/${id}`, data),
  updateConfig: (data) => api.post('/billing/config', data),
  getSummary: (userId) => api.get(userId ? `/billing/summary/${userId}` : '/billing/summary'),
  getPurchases: (params = {}) => api.get('/billing/purchases', { params }),
  createPurchase: (data) => api.post('/billing/purchases', data),
  confirmPurchase: (id, data = {}) => api.post(`/billing/purchases/${id}/confirm`, data),
  cancelPurchase: (id) => api.post(`/billing/purchases/${id}/cancel`),
  getPayables: (params = {}) => api.get('/billing/payables', { params }),
  recordInstructorPayment: (instructorId, data) => api.post(`/billing/payables/${instructorId}/payments`, data),
  recordStudentInstructionPayment: (userId, data) => api.post(`/users/${userId}/instructor-billing`, { ...data, entryType: 'PAYMENT' }),
  getAdminOverview: () => api.get('/billing/admin/overview'),
};



// Availability API
export const availabilityAPI = {
  getAll: () => api.get('/availability'),
  create: (availabilityData) => api.post('/availability', availabilityData),
  update: (id, availabilityData) => api.patch(`/availability/${id}`, availabilityData),
  delete: (id) => api.delete(`/availability/${id}`),
};

// Admin API
export const adminAPI = {
  clearCache: () => api.post('/admin/clear-cache'),
};

// Settings API (Admin only)
export const settingsAPI = {
  getSmtp: () => api.get('/settings/smtp'),
  updateSmtp: (config) => api.post('/settings/smtp', config),
  testSmtp: (sendTestTo) => api.post('/settings/smtp/test', { sendTestTo }),
  testSms: (to) => api.post('/settings/sms/test', { to }),
};

// Notifications API (placeholder for future implementation)
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export default api;
