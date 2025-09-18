import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export interface ScrapyJob {
  id: number;
  name: string;
  platform: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total_urls: number;
  processed_urls: number;
  successful_scrapes: number;
  failed_scrapes: number;
  created_at: string;
  updated_at: string;
  project: number;
  config: {
    id: number;
    platform: string;
    content_type: string;
    name: string;
  };
}

export interface ScrapyJobsResponse {
  count: number;
  results: ScrapyJob[];
}

export interface UseScrapyJobsProps {
  projectId?: number;
  platform?: string;
}

export const useScrapyJobs = ({ projectId, platform }: UseScrapyJobsProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ScrapyJob[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);

  const fetchJobs = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      queryParams.append('project_id', projectId.toString());

      if (platform) {
        queryParams.append('platform', platform);
      }

      const response = await apiFetch(`/api/scrapy/api/jobs/?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch scrapy jobs: ${response.status}`);
      }

      const data: ScrapyJobsResponse = await response.json();
      setJobs(data.results || []);
      setTotalJobs(data.count || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch scrapy jobs';
      setError(errorMessage);
      console.error('Scrapy jobs fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (projectId) {
      fetchJobs();
    }
  }, [projectId, platform]);

  // Get completed jobs only
  const getCompletedJobs = () => {
    return jobs.filter(job => job.status === 'completed' && job.successful_scrapes > 0);
  };

  // Get jobs by platform
  const getJobsByPlatform = (targetPlatform: string) => {
    return jobs.filter(job => job.config?.platform === targetPlatform);
  };

  // Get job statistics
  const getJobStats = () => {
    const completed = jobs.filter(job => job.status === 'completed');
    const running = jobs.filter(job => job.status === 'running');
    const failed = jobs.filter(job => job.status === 'failed');
    const pending = jobs.filter(job => job.status === 'pending');

    const totalSuccessfulScrapes = jobs.reduce((sum, job) => sum + (job.successful_scrapes || 0), 0);
    const totalFailedScrapes = jobs.reduce((sum, job) => sum + (job.failed_scrapes || 0), 0);

    return {
      total: jobs.length,
      completed: completed.length,
      running: running.length,
      failed: failed.length,
      pending: pending.length,
      totalSuccessfulScrapes,
      totalFailedScrapes,
      successRate: totalSuccessfulScrapes + totalFailedScrapes > 0
        ? Math.round((totalSuccessfulScrapes / (totalSuccessfulScrapes + totalFailedScrapes)) * 100)
        : 0
    };
  };

  // Get platform distribution
  const getPlatformDistribution = () => {
    const platformCounts: Record<string, number> = {};

    jobs.forEach(job => {
      const platform = job.config?.platform || 'unknown';
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    const total = jobs.length;
    const colors: Record<string, string> = {
      instagram: '#E1306C',
      facebook: '#1877F2',
      linkedin: '#0A66C2',
      tiktok: '#000000',
      unknown: '#757575'
    };

    return Object.entries(platformCounts).map(([platform, count]) => ({
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      value: Math.round((count / total) * 100),
      count,
      color: colors[platform] || colors.unknown
    }));
  };

  // Get most recent job with data for sentiment analysis
  const getMostRecentJobWithData = () => {
    const completedJobs = getCompletedJobs();
    if (completedJobs.length === 0) return null;

    // Sort by updated_at to get the most recent
    return completedJobs.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];
  };

  return {
    loading,
    error,
    jobs,
    totalJobs,
    fetchJobs,
    refetch: fetchJobs,
    getCompletedJobs,
    getJobsByPlatform,
    getJobStats: getJobStats(),
    getPlatformDistribution: getPlatformDistribution(),
    getMostRecentJobWithData,
  };
};

export default useScrapyJobs;