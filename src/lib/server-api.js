// Server-side API utilities for Next.js App Router
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function serverFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Server API Error (${endpoint}):`, error);
    throw error;
  }
}

// Aircraft API
export const serverAircraftAPI = {
  getAll: () => serverFetch('/aircraft'),
  getById: (id) => serverFetch(`/aircraft/${id}`),
  create: (data) => serverFetch('/aircraft', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => serverFetch(`/aircraft/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => serverFetch(`/aircraft/${id}`, { method: 'DELETE' }),
};

// Maintenance API
export const serverMaintenanceAPI = {
  getByAircraft: (aircraftId) => serverFetch(`/maintenance/aircraft/${aircraftId}`),
  create: (aircraftId, data) => serverFetch(`/maintenance/aircraft/${aircraftId}`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  complete: (id) => serverFetch(`/maintenance/${id}/complete`, { method: 'POST' }),
};

// Users API
export const serverUsersAPI = {
  getAll: () => serverFetch('/users'),
  create: (data) => serverFetch('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => serverFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Lessons API
export const serverLessonsAPI = {
  getAll: () => serverFetch('/lessons'),
  create: (data) => serverFetch('/lessons', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => serverFetch(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => serverFetch(`/lessons/${id}`, { method: 'DELETE' }),
};

// Squawks API
export const serverSquawksAPI = {
  getAll: () => serverFetch('/squawks'),
  create: (data) => serverFetch('/squawks', { method: 'POST', body: JSON.stringify(data) }),
  resolve: (id) => serverFetch(`/squawks/${id}/resolve`, { method: 'POST' }),
};
