import { apiFetch } from '../utils/api';

export interface Platform {
  id: number;
  name: string;
  display_name: string;
  is_enabled: boolean;
  description?: string;
  icon_name?: string;
  color?: string;
  available_services: Service[];
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformService {
  id: number;
  platform: Platform;
  service: Service;
  is_enabled: boolean;
  is_available: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AvailablePlatformService {
  id: number;
  platform: Platform;
  service: Service;
  is_enabled: boolean;
  is_available: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

class PlatformServiceAPI {
  // Get all available platforms for regular users
  async getAvailablePlatforms(): Promise<Platform[]> {
    const response = await apiFetch('/api/users/available-platforms/');
    if (!response.ok) {
      throw new Error('Failed to fetch available platforms');
    }
    return response.json();
  }

  // Get all available platform-service combinations for regular users
  async getAllAvailablePlatformServices(): Promise<AvailablePlatformService[]> {
    const response = await apiFetch('/api/users/available-platforms/all_available/');
    if (!response.ok) {
      throw new Error('Failed to fetch available platform services');
    }
    return response.json();
  }

  // Get services for a specific platform
  async getPlatformServices(platformId: number): Promise<Service[]> {
    const response = await apiFetch(`/api/users/available-platforms/${platformId}/services/`);
    if (!response.ok) {
      throw new Error('Failed to fetch platform services');
    }
    return response.json();
  }

  // Superadmin only: Get all platforms
  async getAllPlatforms(): Promise<Platform[]> {
    const response = await apiFetch('/api/users/platforms/');
    if (!response.ok) {
      throw new Error('Failed to fetch platforms');
    }
    return response.json();
  }

  // Superadmin only: Get all services
  async getAllServices(): Promise<Service[]> {
    const response = await apiFetch('/api/users/services/');
    if (!response.ok) {
      throw new Error('Failed to fetch services');
    }
    return response.json();
  }

  // Superadmin only: Get all platform-service combinations
  async getAllPlatformServices(): Promise<PlatformService[]> {
    const response = await apiFetch('/api/users/platform-services/');
    if (!response.ok) {
      throw new Error('Failed to fetch platform services');
    }
    return response.json();
  }

  // Superadmin only: Create a new platform
  async createPlatform(platformData: Partial<Platform>): Promise<Platform> {
    const response = await apiFetch('/api/users/platforms/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(platformData),
    });
    if (!response.ok) {
      throw new Error('Failed to create platform');
    }
    return response.json();
  }

  // Superadmin only: Update a platform
  async updatePlatform(platformId: number, platformData: Partial<Platform>): Promise<Platform> {
    const response = await apiFetch(`/api/users/platforms/${platformId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(platformData),
    });
    if (!response.ok) {
      throw new Error('Failed to update platform');
    }
    return response.json();
  }

  // Superadmin only: Create a new service
  async createService(serviceData: Partial<Service>): Promise<Service> {
    const response = await apiFetch('/api/users/services/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serviceData),
    });
    if (!response.ok) {
      throw new Error('Failed to create service');
    }
    return response.json();
  }

  // Superadmin only: Update a service
  async updateService(serviceId: number, serviceData: Partial<Service>): Promise<Service> {
    const response = await apiFetch(`/api/users/services/${serviceId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serviceData),
    });
    if (!response.ok) {
      throw new Error('Failed to update service');
    }
    return response.json();
  }

  // Superadmin only: Create a new platform-service combination
  async createPlatformService(platformServiceData: {
    platform: number;
    service: number;
    is_enabled?: boolean;
    description?: string;
  }): Promise<PlatformService> {
    const response = await apiFetch('/api/users/platform-services/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(platformServiceData),
    });
    if (!response.ok) {
      throw new Error('Failed to create platform service');
    }
    return response.json();
  }

  // Superadmin only: Update a platform-service combination
  async updatePlatformService(
    platformServiceId: number,
    platformServiceData: Partial<PlatformService>
  ): Promise<PlatformService> {
    const response = await apiFetch(`/api/users/platform-services/${platformServiceId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(platformServiceData),
    });
    if (!response.ok) {
      throw new Error('Failed to update platform service');
    }
    return response.json();
  }

  // Superadmin only: Delete a platform-service combination
  async deletePlatformService(platformServiceId: number): Promise<void> {
    const response = await apiFetch(`/api/users/platform-services/${platformServiceId}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete platform service');
    }
  }

  // Utility function to validate platform-service combination
  async validatePlatformService(platformName: string, serviceName: string): Promise<boolean> {
    try {
      const platformServices = await this.getAllAvailablePlatformServices();
      return platformServices.some(
        ps => ps.platform.name === platformName && ps.service.name === serviceName && ps.is_available
      );
    } catch (error) {
      console.error('Error validating platform-service combination:', error);
      return false;
    }
  }

  // Utility function to get available services for a platform
  async getAvailableServicesForPlatform(platformName: string): Promise<Service[]> {
    try {
      const platformServices = await this.getAllAvailablePlatformServices();
      return platformServices
        .filter(ps => ps.platform.name === platformName && ps.is_available)
        .map(ps => ps.service);
    } catch (error) {
      console.error('Error getting available services for platform:', error);
      return [];
    }
  }

  // Utility function to get available platforms
  async getAvailablePlatforms(): Promise<Platform[]> {
    try {
      return await this.getAvailablePlatforms();
    } catch (error) {
      console.error('Error getting available platforms:', error);
      return [];
    }
  }
}

export const platformServiceAPI = new PlatformServiceAPI(); 