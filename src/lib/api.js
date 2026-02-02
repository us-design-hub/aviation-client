import axios from 'axios';

// Auto-detect development vs production based on NODE_ENV
const getAPIBaseURL = () => {
  // Development: always use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  
  // Production: REQUIRE NEXT_PUBLIC_API_URL to be set
  if (!process.env.NEXT_PUBLIC_API_URL) {
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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getStudents: () => api.get('/users/students'),
  getInstructors: () => api.get('/users/instructors'),
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
  complete: (id) => api.post(`/lessons/${id}/complete`),
  checkConflicts: (params) => api.get('/lessons/conflicts', { params }),
  // Notes
  getNotes: (id) => api.get(`/lessons/${id}/notes`),
  addNote: (id, noteData) => api.post(`/lessons/${id}/notes`, noteData),
};

// Syllabus API
export const syllabusAPI = {
  getActive: () => api.get('/syllabus/active'),
  create: (syllabusData) => api.post('/syllabus', syllabusData),
  addStage: (syllabusId, stageData) => api.post(`/syllabus/${syllabusId}/stages`, stageData),
  updateStage: (stageId, stageData) => api.patch(`/syllabus/stages/${stageId}`, stageData),
  addLesson: (stageId, lessonData) => api.post(`/syllabus/stages/${stageId}/lessons`, lessonData),
  updateLesson: (lessonId, lessonData) => api.patch(`/syllabus/lessons/${lessonId}`, lessonData),
  deleteLesson: (lessonId) => api.delete(`/syllabus/lessons/${lessonId}`),
  // Progress tracking
  getProgress: (studentId) => api.get(`/syllabus/progress/${studentId}`),
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
  complete: (id) => api.post(`/maintenance/${id}/complete`),
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
