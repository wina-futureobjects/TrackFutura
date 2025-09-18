import { apiFetch } from '../utils/api';

export interface InputCollection {
  id: number;
  project: number;
  project_name: string;
  platform_service: number;
  platform_service_details: {
    platform: {
      id: number;
      name: string;
      display_name: string;
      is_enabled: boolean;
    };
    service: {
      id: number;
      name: string;
      display_name: string;
    };
    is_enabled: boolean;
  };
  platform_name: string;
  service_name: string;
  urls: string[];
  url_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ScrapingJob {
  id: number;
  scraping_run: number;
  input_collection: number;
  input_collection_name: string;
  batch_job: number;
  batch_job_name: string;
  batch_job_status: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  dataset_id: string;
  platform: string;
  service_type: string;
  url: string;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ScrapingRun {
  id: number;
  project: number;
  project_name: string;
  name: string;
  configuration: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_jobs: number;
  completed_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  progress_percentage: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  scraping_jobs: ScrapingJob[];
}

export interface WorkflowTask {
  id: number;
  input_collection: number;
  input_collection_details: InputCollection;
  batch_job: number;
  batch_job_name: string;
  batch_job_status: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface PlatformService {
  id: number;
  platform: {
    id: number;
    name: string;
    display_name: string;
    is_enabled: boolean;
  };
  service: {
    id: number;
    name: string;
    display_name: string;
  };
  is_enabled: boolean;
  description: string;
}

export interface CreateInputCollectionRequest {
  project: number;
  platform_service: number;
  urls: string[];
}

export interface CreateScrapingRunRequest {
  project: number;
  name?: string;
  configuration: {
    num_of_posts?: number | null;
    start_date?: string;
    end_date?: string;
    auto_create_folders: boolean;
    output_folder_pattern: string;
    period?: 'daily' | 'weekly' | 'monthly';
  };
}

export interface TrackSource {
  id: number;
  name: string;
  platform: string;
  service_name: string;
  facebook_link: string | null;
  instagram_link: string | null;
  linkedin_link: string | null;
  tiktok_link: string | null;
  other_social_media: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackSourceCollection {
  id: number;
  name: string;
  platform_name: string;
  service_name: string;
  urls: string[];
  url_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  source_type: 'track_source' | 'input_collection';
  original_source_id: number;
  platform_service_id?: number;
}

class WorkflowService {
  private baseUrl = '/api/workflow';

  private generateUniqueId(sourceId: number, index: number): number {
    return sourceId * 1000 + index;
  }

  /**
   * Get all available platforms
   */
  async getAvailablePlatforms() {
    try {
      const response = await apiFetch(`${this.baseUrl}/input-collections/available_platforms/`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch platforms');
    } catch (error) {
      console.error('Error fetching platforms:', error);
      throw new Error('Failed to fetch platforms');
    }
  }

  /**
   * Get available services for a platform
   */
  async getAvailableServices(platformId: number) {
    try {
      const response = await apiFetch(`${this.baseUrl}/input-collections/${platformId}/available_services/`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch services');
    } catch (error) {
      console.error('Error fetching services:', error);
      throw new Error('Failed to fetch services');
    }
  }

  /**
   * Get all platform services
   */
  async getPlatformServices(): Promise<PlatformService[]> {
    try {
      const response = await apiFetch(`${this.baseUrl}/input-collections/platform_services/`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch platform services');
    } catch (error) {
      console.error('Error fetching platform services:', error);
      throw new Error('Failed to fetch platform services');
    }
  }

  /**
   * Get input collections for a project
   */
  async getInputCollections(projectId: number): Promise<InputCollection[]> {
    try {
      const response = await apiFetch(`${this.baseUrl}/input-collections/?project=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        return data.results || data;
      }
      throw new Error('Failed to fetch input collections');
    } catch (error) {
      console.error('Error fetching input collections:', error);
      throw new Error('Failed to fetch input collections');
    }
  }

  /**
   * Create a new input collection
   */
  async createInputCollection(data: CreateInputCollectionRequest): Promise<InputCollection> {
    try {
      const response = await apiFetch(`${this.baseUrl}/input-collections/`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to create input collection');
    } catch (error) {
      console.error('Error creating input collection:', error);
      throw new Error('Failed to create input collection');
    }
  }

  /**
   * Get workflow tasks for an input collection
   */
  async getWorkflowTasks(inputCollectionId: number): Promise<WorkflowTask[]> {
    try {
      const response = await apiFetch(`${this.baseUrl}/input-collections/${inputCollectionId}/workflow_tasks/`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch workflow tasks');
    } catch (error) {
      console.error('Error fetching workflow tasks:', error);
      throw new Error('Failed to fetch workflow tasks');
    }
  }

  /**
   * Retry an input collection
   */
  async retryInputCollection(inputCollectionId: number): Promise<{ message: string }> {
    try {
      const response = await apiFetch(`${this.baseUrl}/input-collections/${inputCollectionId}/retry/`, {
        method: 'POST'
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to retry input collection');
    } catch (error) {
      console.error('Error retrying input collection:', error);
      throw new Error('Failed to retry input collection');
    }
  }

  /**
   * Get workflow tasks by status
   */
  async getWorkflowTasksByStatus(status: string, projectId?: number): Promise<WorkflowTask[]> {
    try {
      let url = `${this.baseUrl}/workflow-tasks/by_status/?status=${status}`;
      if (projectId) {
        url += `&project=${projectId}`;
      }
      const response = await apiFetch(url);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch workflow tasks by status');
    } catch (error) {
      console.error('Error fetching workflow tasks by status:', error);
      throw new Error('Failed to fetch workflow tasks by status');
    }
  }

  /**
   * Get all workflow tasks for a project
   */
  async getAllWorkflowTasks(projectId: number): Promise<WorkflowTask[]> {
    try {
      const response = await apiFetch(`${this.baseUrl}/workflow-tasks/?project=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        return data.results || data;
      }
      throw new Error('Failed to fetch all workflow tasks');
    } catch (error) {
      console.error('Error fetching all workflow tasks:', error);
      throw new Error('Failed to fetch all workflow tasks');
    }
  }

  /**
   * Get scraping runs for a project
   */
  async getScrapingRuns(projectId: number): Promise<ScrapingRun[]> {
    try {
      const response = await apiFetch(`${this.baseUrl}/scraping-runs/?project=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        return data.results || data;
      }
      throw new Error('Failed to fetch scraping runs');
    } catch (error) {
      console.error('Error fetching scraping runs:', error);
      throw new Error('Failed to fetch scraping runs');
    }
  }

  /**
   * Create a new scraping run
   */
  async createScrapingRun(data: CreateScrapingRunRequest): Promise<ScrapingRun> {
    try {
      console.log('Creating scraping run with data:', data);
      const response = await apiFetch(`${this.baseUrl}/scraping-runs/`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      console.log('Create scraping run response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('Created scraping run result:', result);
        return result;
      }
      const errorText = await response.text();
      console.error('Failed to create scraping run:', errorText);
      throw new Error('Failed to create scraping run');
    } catch (error) {
      console.error('Error creating scraping run:', error);
      throw new Error('Failed to create scraping run');
    }
  }

  /**
   * Start a scraping run
   */
  async startScrapingRun(runId: number): Promise<{ message: string; total_jobs: number }> {
    try {
      console.log('Starting scraping run with ID:', runId);
      const response = await apiFetch(`${this.baseUrl}/scraping-runs/${runId}/start_run/`, {
        method: 'POST'
      });
      console.log('Start scraping run response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('Start scraping run result:', result);
        return result;
      }
      const errorText = await response.text();
      console.error('Failed to start scraping run:', errorText);
      throw new Error('Failed to start scraping run');
    } catch (error) {
      console.error('Error starting scraping run:', error);
      throw new Error('Failed to start scraping run');
    }
  }

  /**
   * Get scraping jobs for a run
   */
  async getScrapingJobs(runId: number): Promise<ScrapingJob[]> {
    try {
      const response = await apiFetch(`${this.baseUrl}/scraping-jobs/?run=${runId}`);
      if (response.ok) {
        const data = await response.json();
        return data.results || data;
      }
      throw new Error('Failed to fetch scraping jobs');
    } catch (error) {
      console.error('Error fetching scraping jobs:', error);
      throw new Error('Failed to fetch scraping jobs');
    }
  }

  /**
   * Retry a failed scraping job
   */
  async retryScrapingJob(jobId: number): Promise<{ message: string }> {
    try {
      const response = await apiFetch(`${this.baseUrl}/scraping-jobs/${jobId}/retry/`, {
        method: 'POST'
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to retry scraping job');
    } catch (error) {
      console.error('Error retrying scraping job:', error);
      throw new Error('Failed to retry scraping job');
    }
  }

  /**
   * Get all input collections including TrackSource data for a project
   */
  async getTrackSources(projectId: number): Promise<TrackSourceCollection[]> {
    try {
      console.log('=== getTrackSources DEBUG ===');
      console.log('Project ID:', projectId);
      
      // Fetch TrackSource data only
      const trackSourcesResponse = await apiFetch(`/api/track-accounts/sources/?project=${projectId}&page_size=1000`);

      console.log('TrackSources Response Status:', trackSourcesResponse.status);

      const collections: TrackSourceCollection[] = [];
      let collectionCounter = 0;

      // Process TrackSource data
      if (trackSourcesResponse.ok) {
        const trackData = await trackSourcesResponse.json();
        const trackSources = trackData.results || trackData;
        console.log('TrackSources found:', trackSources.length);
        console.log('TrackSources data:', trackSources);
        
        trackSources.forEach((source: TrackSource) => {
          // Extract URLs from TrackSource
          const urls: string[] = [];
          if (source.facebook_link) urls.push(source.facebook_link);
          if (source.instagram_link) urls.push(source.instagram_link);
          if (source.linkedin_link) urls.push(source.linkedin_link);
          if (source.tiktok_link) urls.push(source.tiktok_link);
          if (source.other_social_media) urls.push(source.other_social_media);

          // Create separate collections for each platform that has URLs
          const platformUrls = {
            'Facebook': source.facebook_link ? [source.facebook_link] : [],
            'Instagram': source.instagram_link ? [source.instagram_link] : [],
            'LinkedIn': source.linkedin_link ? [source.linkedin_link] : [],
            'TikTok': source.tiktok_link ? [source.tiktok_link] : [],
            'Other': source.other_social_media ? [source.other_social_media] : []
          };

          Object.entries(platformUrls).forEach(([platform, platformUrls]) => {
            if (platformUrls.length > 0) {
              collections.push({
                id: source.id * 1000 + collectionCounter++, // Generate unique ID using counter
                name: `${source.name} - ${platform}`,
                platform_name: platform,
                service_name: source.service_name, // Use the actual service name
                urls: platformUrls,
                url_count: platformUrls.length,
                status: 'pending', // TrackSource items start as pending
                created_at: source.created_at,
                updated_at: source.updated_at,
                source_type: 'track_source',
                original_source_id: source.id
              });
            }
          });
        });
      } else {
        console.error('TrackSources API failed:', trackSourcesResponse.status);
        const errorText = await trackSourcesResponse.text();
        console.error('TrackSources API error:', errorText);
      }

      console.log('Total TrackSource collections created:', collections.length);
      console.log('Collections:', collections);
      console.log('=== END getTrackSources DEBUG ===');

      return collections;
    } catch (error) {
      console.error('Error fetching track sources:', error);
      throw new Error('Failed to fetch track sources');
    }
  }

  async getAllInputCollections(projectId: number): Promise<TrackSourceCollection[]> {
    try {
      console.log('=== getAllInputCollections DEBUG (TrackSource Only) ===');
      console.log('Project ID:', projectId);
      
      // Fetch only TrackSource data (simplified flow)
      const trackSourcesResponse = await apiFetch(`/api/track-accounts/sources/?project=${projectId}&page_size=1000`);

      console.log('TrackSources Response Status:', trackSourcesResponse.status);

      const collections: TrackSourceCollection[] = [];
      let collectionCounter = 0;

      // Process TrackSource data only
      if (trackSourcesResponse.ok) {
        const trackData = await trackSourcesResponse.json();
        const trackSources = trackData.results || trackData;
        console.log('TrackSources found:', trackSources.length);
        console.log('TrackSources data:', trackSources);
        
        trackSources.forEach((source: TrackSource) => {
          // Create separate collections for each platform that has URLs
          const platformUrls = {
            'Facebook': source.facebook_link ? [source.facebook_link] : [],
            'Instagram': source.instagram_link ? [source.instagram_link] : [],
            'LinkedIn': source.linkedin_link ? [source.linkedin_link] : [],
            'TikTok': source.tiktok_link ? [source.tiktok_link] : [],
            'Other': source.other_social_media ? [source.other_social_media] : []
          };

          Object.entries(platformUrls).forEach(([platform, platformUrls]) => {
            if (platformUrls.length > 0) {
              collections.push({
                id: source.id * 1000 + collectionCounter++, // Generate unique ID using counter
                name: `${source.name} - ${platform}`,
                platform_name: platform,
                service_name: source.service_name, // Use the actual service name
                urls: platformUrls,
                url_count: platformUrls.length,
                status: 'pending', // TrackSource items start as pending
                created_at: source.created_at,
                updated_at: source.updated_at,
                source_type: 'track_source',
                original_source_id: source.id
              });
            }
          });
        });
      } else {
        console.error('TrackSources API failed:', trackSourcesResponse.status);
        const errorText = await trackSourcesResponse.text();
        console.error('TrackSources API error:', errorText);
      }

      console.log('Total collections created:', collections.length);
      console.log('Collections:', collections);
      console.log('=== END getAllInputCollections DEBUG ===');

      return collections;
    } catch (error) {
      console.error('Error fetching all input collections:', error);
      throw new Error('Failed to fetch input collections');
    }
  }
}

export const workflowService = new WorkflowService();
export default workflowService; 