import axios from 'axios';
import type { Container, YardLocation, AIRecommendation, Yard, Block, YardOverviewResponse } from '../app/types/yard-optimization';

// API Base URL - update this if your backend runs on a different port
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationInfo {
  skip: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

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
   * Get containers with pagination
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum records to return (default: 100, max: 1000)
   */
  getAll: async (params?: { skip?: number; limit?: number }): Promise<PaginatedResponse<Container>> => {
    const response = await api.get<PaginatedResponse<Container>>('/containers', { params });
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
   * Search containers with filters and pagination
   */
  search: async (params?: {
    q?: string;
    container_number?: string;
    shipping_line?: string;
    pod?: string;
    customs_status?: string;
    container_type?: string;
    block_id?: string;
    has_location?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Container>> => {
    const response = await api.get<PaginatedResponse<Container>>('/containers/search', { params });
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
   * Get yard locations with optional filters and pagination
   * @param skip - Number of records to skip (default: 0)
   * @param limit - Maximum records to return (default: 500, max: 2000)
   */
  getAll: async (params?: {
    yard_name?: string;
    block_id?: string;
    occupied?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<PaginatedResponse<YardLocation>> => {
    const response = await api.get<PaginatedResponse<YardLocation>>('/locations', { params });
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
   * Get available locations with pagination
   */
  getAvailable: async (params?: { yard_name?: string; block_id?: string; skip?: number; limit?: number }) => {
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
      request,
      { timeout: 60000 }  // 60s timeout for LLM processing
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
// YARD API
// ============================================================================

export const yardAPI = {
  /**
   * Get full yard overview hierarchy (yards grouped by type with blocks and occupancy)
   */
  getOverview: async (): Promise<YardOverviewResponse> => {
    const response = await api.get<YardOverviewResponse>('/yards/overview');
    return response.data;
  },

  /**
   * Get all yards
   */
  getAll: async (): Promise<Yard[]> => {
    const response = await api.get<Yard[]>('/yards');
    return response.data;
  },

  /**
   * Get yard occupancy stats
   */
  getOccupancy: async (yardName: string) => {
    const response = await api.get(`/yards/${yardName}/occupancy`);
    return response.data;
  },
};


// ============================================================================
// BLOCK API
// ============================================================================

export const blockAPI = {
  /**
   * Get all blocks
   */
  getAll: async (): Promise<Block[]> => {
    const response = await api.get<Block[]>('/blocks');
    return response.data;
  },

  /**
   * Get block with all locations and embedded container data (for detail view)
   */
  getDetails: async (blockId: string): Promise<Block> => {
    const response = await api.get<Block>(`/blocks/${blockId}/details`);
    return response.data;
  },

  /**
   * Get containers in a block
   */
  getContainers: async (blockId: string) => {
    const response = await api.get(`/blocks/${blockId}/containers`);
    return response.data;
  },
};


// ============================================================================
// SYNC API
// ============================================================================

export interface SyncResult {
  message: string;
  placed_count: number;
  skipped_count: number;
  error_count: number;
  placed: Array<{
    container_number: string;
    container_id: string;
    location_id: string;
    block_id: string;
    bay: number;
    row: number;
    tier: number;
    event_type: string;
  }>;
  skipped: Array<{ container_number: string; reason: string }>;
  errors: Array<{ container_number: string; reason: string }>;
}

export const syncAPI = {
  /**
   * Sync container placements from event history.
   * Finds latest event per container_number and places those
   * with valid block_id/bay/row/tier into YardLocations.
   */
  placeContainers: async (): Promise<SyncResult> => {
    const response = await api.post<SyncResult>('/sync/place-containers');
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
