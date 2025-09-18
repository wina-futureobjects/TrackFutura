import { demoJobs, demoResults, demoChatHistory, demoMetrics } from '../data/demoData';

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

// Utility function to make API calls with demo fallback
export const apiWithFallback = async (endpoint: string, options?: RequestInit) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`API call failed for ${endpoint}, using demo data:`, error);
    return getFallbackData(endpoint);
  }
};

// Get appropriate fallback data based on endpoint
const getFallbackData = (endpoint: string) => {
  // Scrapy jobs endpoints
  if (endpoint.includes('/api/scrapy/api/jobs/')) {
    if (endpoint.includes('platform=instagram')) {
      return demoJobs.filter(job => job.platform === 'instagram');
    }
    if (endpoint.includes('platform=facebook')) {
      return demoJobs.filter(job => job.platform === 'facebook');
    }
    if (endpoint.includes('platform=linkedin')) {
      return demoJobs.filter(job => job.platform === 'linkedin');
    }
    if (endpoint.includes('platform=tiktok')) {
      return demoJobs.filter(job => job.platform === 'tiktok');
    }
    return demoJobs;
  }

  // Scrapy results endpoints
  if (endpoint.includes('/api/scrapy/api/jobs/') && endpoint.includes('/results/')) {
    const jobId = endpoint.match(/jobs\/(\d+)\/results/)?.[1];
    if (jobId) {
      const job = demoJobs.find(j => j.id.toString() === jobId);
      if (job) {
        const platform = job.platform as keyof typeof demoResults;
        return demoResults[platform] || [];
      }
    }
    return [];
  }

  // Chat endpoints
  if (endpoint.includes('/api/chat/') || endpoint.includes('/chat/')) {
    if (endpoint.includes('/threads/')) {
      return demoChatHistory;
    }
    if (endpoint.includes('/messages/')) {
      const threadId = endpoint.match(/threads\/(\d+)\/messages/)?.[1];
      const thread = demoChatHistory.find(t => t.id.toString() === threadId);
      return thread?.messages || [];
    }
    return demoChatHistory;
  }

  // Dashboard/metrics endpoints
  if (endpoint.includes('/api/dashboard/') || endpoint.includes('/metrics/')) {
    return demoMetrics;
  }

  // Default fallback
  console.warn(`No specific fallback data for endpoint: ${endpoint}`);
  return { message: 'Demo data - API temporarily unavailable', data: [] };
};

// Specific helper functions for common endpoints
export const getScrapyJobs = (platform?: string) => {
  const endpoint = platform
    ? `/api/scrapy/api/jobs/?platform=${platform}`
    : '/api/scrapy/api/jobs/';
  return apiWithFallback(endpoint);
};

export const getScrapyResults = (jobId: number) => {
  return apiWithFallback(`/api/scrapy/api/jobs/${jobId}/results/`);
};

export const getChatThreads = () => {
  return apiWithFallback('/api/chat/threads/');
};

export const getChatMessages = (threadId: number) => {
  return apiWithFallback(`/api/chat/threads/${threadId}/messages/`);
};

export const getDashboardMetrics = () => {
  return apiWithFallback('/api/dashboard/metrics/');
};