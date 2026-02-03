// frontend/src/services/api.js

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('accessToken', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ==========================================
// AUTH APIs
// ==========================================

export const login = async (username, password) => {
  const response = await api.post('/auth/login/', { username, password });
  return response.data;
};

export const logout = async (refreshToken) => {
  const response = await api.post('/auth/logout/', { refresh: refreshToken });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/user/');
  return response.data;
};

// ==========================================
// ⚡ OPTIMIZED APPLICATIONS APIs WITH PAGINATION
// ==========================================

export const getApplications = async (params = {}) => {
  try {
    console.time('⚡ Fetch Applications');
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Pagination
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    // Filters
    if (params.search) queryParams.append('search', params.search);
    if (params.police_station) queryParams.append('police_station', params.police_station);
    if (params.division) queryParams.append('division', params.division);
    if (params.category) queryParams.append('category', params.category);
    if (params.status) queryParams.append('status', params.status);
    if (params.feedback) queryParams.append('feedback', params.feedback);
    if (params.from_date) queryParams.append('from_date', params.from_date);
    if (params.to_date) queryParams.append('to_date', params.to_date);
    if (params.marked_to) queryParams.append('marked_to', params.marked_to);
    
    // Ordering
    if (params.ordering) queryParams.append('ordering', params.ordering);
    
    const response = await api.get(`/applications/?${queryParams.toString()}`);
    
    console.timeEnd('⚡ Fetch Applications');
    console.log(`✅ Fetched page ${params.page || 1}: ${response.data.results?.length || 0} items`);
    console.log(`📊 Total: ${response.data.count} applications`);
    
    // Returns paginated response: { count, next, previous, results }
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    throw error;
  }
};

// GET - Fetch single application by ID
export const getApplicationById = async (id) => {
  try {
    const response = await api.get(`/applications/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching application ${id}:`, error);
    throw error;
  }
};

// POST - Create new application
export const createApplication = async (data) => {
  try {
    console.log('📝 Creating new application:', data);
    const response = await api.post('/applications/', data);
    console.log('✅ Application created successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error creating application:', error);
    throw error;
  }
};

// PUT - Update entire application
export const updateApplication = async (id, data) => {
  try {
    console.log(`📝 Updating application ${id}:`, data);
    const response = await api.put(`/applications/${id}/`, data);
    console.log('✅ Application updated successfully');
    return response.data;
  } catch (error) {
    console.error(`❌ Error updating application ${id}:`, error);
    throw error;
  }
};

// PATCH - Partial update of application
export const patchApplication = async (id, data) => {
  try {
    console.log(`📝 Patching application ${id}:`, data);
    const response = await api.patch(`/applications/${id}/`, data);
    console.log('✅ Application patched successfully');
    return response.data;
  } catch (error) {
    console.error(`❌ Error patching application ${id}:`, error);
    throw error;
  }
};

// DELETE - Delete application
export const deleteApplication = async (id) => {
  try {
    console.log(`🗑️ Deleting application ${id}`);
    const response = await api.delete(`/applications/${id}/`);
    console.log('✅ Application deleted successfully');
    return response.data;
  } catch (error) {
    console.error(`❌ Error deleting application ${id}:`, error);
    throw error;
  }
};

// PATCH - Update only status
export const updateApplicationStatus = async (id, status) => {
  try {
    const response = await api.patch(`/applications/${id}/update_status/`, { status });
    return response.data;
  } catch (error) {
    console.error(`❌ Error updating status for application ${id}:`, error);
    throw error;
  }
};

// PATCH - Update only feedback
export const updateApplicationFeedback = async (id, feedback, remarks = '') => {
  try {
    const response = await api.patch(`/applications/${id}/update_feedback/`, { feedback, remarks });
    return response.data;
  } catch (error) {
    console.error(`❌ Error updating feedback for application ${id}:`, error);
    throw error;
  }
};

// ==========================================
// DASHBOARD APIs
// ==========================================

export const getDashboardStats = async () => {
  try {
    const response = await api.get('/dashboard-stats/');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    throw error;
  }
};

// ==========================================
// METADATA APIs
// ==========================================

export const getPoliceStations = async () => {
  try {
    const response = await api.get('/police-stations/');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching police stations:', error);
    throw error;
  }
};

export const getCategories = async () => {
  try{
    const response = await api.get('/categories/');
    return response.data;
  } 
  catch (error) {
    console.error('❌ Error fetching categories:', error);
    throw error;
  }
};

export const getDivisions = async () => {
  const response = await api.get('/divisions/');
  return response.data;
};
// ⚡ EXPORT ALL APPLICATIONS (No pagination limits)
export const exportApplications = async (params = {}) => {
  try {
    console.time('⚡ Export All Applications');
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.police_station) queryParams.append('police_station', params.police_station);
    if (params.category) queryParams.append('category', params.category);
    if (params.feedback) queryParams.append('feedback', params.feedback);
    if (params.from_date) queryParams.append('from_date', params.from_date);
    if (params.to_date) queryParams.append('to_date', params.to_date);
    if (params.ordering) queryParams.append('ordering', params.ordering);
    
    const response = await api.get(`/export-applications/?${queryParams.toString()}`);
    
    console.timeEnd('⚡ Export All Applications');
    console.log(`✅ Fetched ${response.data.count} applications for export`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error exporting applications:', error);
    throw error;
  }
};
// ==========================================
// EXCEL UPLOAD API
// ==========================================

export const uploadExcel = async (file) => {
  try {
    console.log('📤 Uploading Excel file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload-excel/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('✅ Excel file uploaded successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading Excel file:', error);
    throw error;
  }
};

// ⭐ STAFF MANAGEMENT APIs
export const getAllStaff = async () => {
  const response = await api.get('/staff/');
  return response.data;
};

export const getStaffById = async (id) => {
  const response = await api.get(`/staff/${id}/`);
  return response.data;
};

export const createStaff = async (data) => {
  const response = await api.post('/staff/', data);
  return response.data;
};

export const updateStaff = async (id, data) => {
  const response = await api.put(`/staff/${id}/`, data);
  return response.data;
};

export const deleteStaff = async (id) => {
  const response = await api.delete(`/staff/${id}/`);
  return response.data;
};

// ==========================================
// VIDEO FEEDBACK APIs
// ==========================================

export const getAllVideoFeedback = async (params = {}) => {
  try {
    console.log('🎥 Fetching video feedback...');
    const response = await api.get('/video-feedback/', { params });
    
    const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
    
    console.log(`✅ Fetched ${data.length} videos`);
    return data;
  } catch (error) {
    console.error('❌ Error fetching video feedback:', error);
    throw error;
  }
};

export const getVideoFeedbackById = async (id) => {
  try {
    const response = await api.get(`/video-feedback/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching video ${id}:`, error);
    throw error;
  }
};

export const submitVideoFeedback = async (id, feedback, remarks = '') => {
  try {
    console.log(`📝 Submitting feedback for video ${id}: ${feedback}`);
    const response = await api.post(`/video-feedback/${id}/submit_feedback/`, {
      feedback,
      remarks
    });
    console.log('✅ Feedback submitted successfully');
    return response.data;
  } catch (error) {
    console.error(`❌ Error submitting feedback for video ${id}:`, error);
    throw error;
  }
};

export const getVideoFeedbackStats = async () => {
  try {
    const response = await api.get('/video-feedback-stats/');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching video feedback stats:', error);
    return { total: 0, pending: 0, liked: 0, disliked: 0 };
  }
};

export default api;