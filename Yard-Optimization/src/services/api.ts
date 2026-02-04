import axios from 'axios';
import type { Container, YardLocation, AIRecommendation } from '../app/types/yard-optimization';

// API Base URL - update this if your backend runs on a different port
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for adding auth tokens, logging, etc.
api.interceptors.request.use(
  (config) => {
    // You can add auth headers here if needed
    // config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);


// ============================================================================
// CONTAINER API
// ============================================================================

export const containerAPI = {
  /**
   * Get all containers
   */
  getAll: async () => {
    const response = await api.get<Container[]>('/containers');
    return response.data;
  },

  /**
   * Get a specific container by ID
   */
  getById: async (containerId: string) => {
    const response = await api.get<Container>(`/containers/${containerId}`);
    return response.data;
  },

  /**
   * Create a new container
   */
  create: async (container: Container) => {
    const response = await api.post<Container>('/containers', container);
    return response.data;
  },

  /**
   * Update an existing container
   */
  update: async (containerId: string, container: Partial<Container>) => {
    const response = await api.put<Container>(`/containers/${containerId}`, container);
    return response.data;
  },

  /**
   * Delete a container
   */
  delete: async (containerId: string) => {
    const response = await api.delete(`/containers/${containerId}`);
    return response.data;
  },
};


// ============================================================================
// YARD LOCATION API
// ============================================================================

export const locationAPI = {
  /**
   * Get all yard locations with optional filters
   */
  getAll: async (params?: {
    yard_name?: string;
    block_id?: string;
    occupied?: boolean;
  }) => {
    const response = await api.get<YardLocation[]>('/locations', { params });
    return response.data;
  },

  /**
   * Get a specific location by ID
   */
  getById: async (locationId: string) => {
    const response = await api.get<YardLocation>(`/locations/${locationId}`);
    return response.data;
  },

  /**
   * Create a new yard location
   */
  create: async (location: YardLocation) => {
    const response = await api.post<YardLocation>('/locations', location);
    return response.data;
  },

  /**
   * Update a yard location (e.g., mark as occupied)
   */
  update: async (locationId: string, location: Partial<YardLocation>) => {
    const response = await api.put<YardLocation>(`/locations/${locationId}`, location);
    return response.data;
  },

  /**
   * Get available locations
   */
  getAvailable: async (params?: { yard_name?: string; block_id?: string }) => {
    return locationAPI.getAll({ ...params, occupied: false });
  },
};


// ============================================================================
// OPTIMIZATION API
// ============================================================================

export interface PlacementRequest {
  container_id: string;
  container_type?: string;
  pod?: string;
  weight_class?: string;
  hazmat_flag?: boolean;
  reefer_flag?: boolean;
}

export interface PlacementRecommendation {
  container_id: string;
  recommendations: AIRecommendation[];
}

export const optimizationAPI = {
  /**
   * Get AI-powered placement recommendations for a container
   */
  getPlacementRecommendations: async (request: PlacementRequest) => {
    const response = await api.post<PlacementRecommendation>(
      '/optimize/placement',
      request
    );
    return response.data;
  },
};


// ============================================================================
// STATISTICS API
// ============================================================================

export interface YardStats {
  total_containers: number;
  total_locations: number;
  occupied_locations: number;
  available_locations: number;
  occupancy_rate: number;
  containers_by_type?: Record<string, number>;
}

export interface ContainerStats {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
}

export const statsAPI = {
  /**
   * Get overall yard statistics
   */
  getYardStats: async () => {
    const response = await api.get<YardStats>('/stats/overview');
    return response.data;
  },

  /**
   * Get container statistics
   */
  getContainerStats: async () => {
    const response = await api.get<ContainerStats>('/stats/containers');
    return response.data;
  },
};


// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthAPI = {
  /**
   * Check if API is running
   */
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};


// Export the axios instance for custom requests
export default api;
