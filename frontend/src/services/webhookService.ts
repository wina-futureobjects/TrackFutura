import axios, { AxiosResponse } from 'axios';
import { getApiBaseUrl } from '../utils/api';

// Use the centralized API base URL detection
const API_BASE_URL = getApiBaseUrl();

export interface WebhookMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  error_rate: number;
  avg_response_time: number;
  max_response_time: number;
  min_response_time: number;
  last_success?: string;
  last_failure?: string;
}

export interface WebhookHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  timestamp: string;
  metrics: WebhookMetrics;
  issues: string[];
  health_score: number;
}

export interface WebhookEvent {
  timestamp: string;
  event_id: string;
  event_type: string;
  status: string;
  response_time: number;
  payload_size: number;
  client_ip: string;
  user_agent: string;
  error_message?: string;
  metadata?: any;
}

export interface WebhookAlert {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface WebhookAnalytics {
  total_events: number;
  success_rate: number;
  avg_response_time: number;
  hourly_breakdown: Array<{
    hour: string;
    total: number;
    success: number;
    errors: number;
    success_rate: number;
    avg_response_time: number;
  }>;
  error_types: Record<string, number>;
  top_clients: Array<{ ip: string; requests: number; success_rate: number }>;
  performance_trends: Array<{
    timestamp: string;
    response_time: number;
    success_rate: number;
  }>;
}

export interface WebhookTestResult {
  success: boolean;
  security_score: number;
  validation_results: {
    signature_valid: boolean;
    timestamp_valid: boolean;
    rate_limit_ok: boolean;
    ip_allowed: boolean;
    payload_valid: boolean;
  };
  response_time: number;
  error_message?: string;
}

export interface WebhookConfig {
  webhook_url: string;
  notify_url: string;
  webhook_token: string;
  rate_limit: number;
  allowed_ips: string[];
  max_timestamp_age: number;
}

class WebhookService {
  private baseUrl = `${API_BASE_URL}/api/brightdata`;

  constructor() {
    console.log('🔧 WebhookService initialized with API_BASE_URL:', API_BASE_URL);
    console.log('🔧 Full webhook base URL:', this.baseUrl);
    console.log('🔧 Current environment:', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'undefined',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'undefined',
      isProd: import.meta.env.PROD,
      mode: import.meta.env.MODE,
      viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL
    });
  }

  /**
   * Test the API connection and webhook endpoints
   */
  async testConnection(): Promise<{ success: boolean; details: any }> {
    try {
      console.log('Testing webhook API connection...');

      // Test basic API health first
      const healthUrl = `${API_BASE_URL}/api/health/`;
      console.log('Testing health endpoint:', healthUrl);

      try {
        const healthResponse = await axios.get(healthUrl);
        console.log('Health check successful:', healthResponse.data);
      } catch (healthError) {
        console.warn('Health check failed:', healthError);
      }

      // Test webhook metrics endpoint
      const metricsUrl = `${this.baseUrl}/webhook/metrics/`;
      console.log('Testing webhook metrics endpoint:', metricsUrl);

      const response = await axios.get(metricsUrl);

      return {
        success: true,
        details: {
          apiBaseUrl: API_BASE_URL,
          webhookBaseUrl: this.baseUrl,
          metricsEndpoint: metricsUrl,
          response: response.data
        }
      };
    } catch (error) {
      console.error('Connection test failed:', error);

      return {
        success: false,
        details: {
          apiBaseUrl: API_BASE_URL,
          webhookBaseUrl: this.baseUrl,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: axios.isAxiosError(error) ? error.response?.status : 'No status',
          responseData: axios.isAxiosError(error) ? error.response?.data : null
        }
      };
    }
  }

  async getMetrics(): Promise<WebhookMetrics> {
    try {
      const url = `${this.baseUrl}/webhook/metrics/`;
      console.log('Fetching webhook metrics from:', url);

      const response: AxiosResponse<{ metrics: WebhookMetrics }> = await axios.get(url);
      return response.data.metrics;
    } catch (error) {
      console.error('Failed to fetch webhook metrics:', error);
      console.error('Request URL was:', `${this.baseUrl}/webhook/metrics/`);

      // If this is the first failure, run a connection test
      if (axios.isAxiosError(error) && (error.response?.status === 404 || !error.response)) {
        console.log('Running connection test due to metrics failure...');
        const testResult = await this.testConnection();
        console.log('Connection test result:', testResult);
      }

      // Return default metrics structure to prevent errors
      return {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        success_rate: 0,
        error_rate: 0,
        avg_response_time: 0,
        max_response_time: 0,
        min_response_time: 0
      };
    }
  }

  async getHealth(): Promise<WebhookHealth> {
    try {
      const url = `${this.baseUrl}/webhook/health/`;
      console.log('Fetching webhook health from:', url);

      const response: AxiosResponse<{ health: WebhookHealth }> = await axios.get(url);
      return response.data.health;
    } catch (error) {
      console.error('Failed to fetch webhook health:', error);
      console.error('Request URL was:', `${this.baseUrl}/webhook/health/`);

      // Return default health structure to prevent errors
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        metrics: {
          total_requests: 0,
          successful_requests: 0,
          failed_requests: 0,
          success_rate: 0,
          error_rate: 0,
          avg_response_time: 0,
          max_response_time: 0,
          min_response_time: 0
        },
        issues: ['Unable to connect to webhook service'],
        health_score: 0
      };
    }
  }

  async getEvents(params?: {
    limit?: number;
    event_type?: string;
    status?: string;
    since?: string;
  }): Promise<WebhookEvent[]> {
    try {
      const response: AxiosResponse<{ events: WebhookEvent[] }> = await axios.get(
        `${this.baseUrl}/webhook/events/`,
        { params }
      );
      // Ensure we always return an array
      return Array.isArray(response.data.events) ? response.data.events : [];
    } catch (error) {
      console.error('Failed to fetch webhook events:', error);
      // Return empty array instead of throwing error to prevent map errors
      return [];
    }
  }

  async getAlerts(severity?: string): Promise<WebhookAlert[]> {
    try {
      const response: AxiosResponse<{ alerts: WebhookAlert[] }> = await axios.get(
        `${this.baseUrl}/webhook/alerts/`,
        { params: severity ? { severity } : {} }
      );
      // Ensure we always return an array
      return Array.isArray(response.data.alerts) ? response.data.alerts : [];
    } catch (error) {
      console.error('Failed to fetch webhook alerts:', error);
      // Return empty array instead of throwing error to prevent map errors
      return [];
    }
  }

  async getAnalytics(hours = 24): Promise<WebhookAnalytics> {
    try {
      const response: AxiosResponse<{ analytics: WebhookAnalytics }> = await axios.get(
        `${this.baseUrl}/webhook/analytics/`,
        { params: { hours } }
      );
      return response.data.analytics;
    } catch (error) {
      console.error('Failed to fetch webhook analytics:', error);
      // Return default analytics structure to prevent errors
      return {
        total_events: 0,
        success_rate: 0,
        avg_response_time: 0,
        hourly_breakdown: [],
        error_types: {},
        top_clients: [],
        performance_trends: []
      };
    }
  }

  async testWebhookSecurity(testData?: any): Promise<WebhookTestResult> {
    try {
      const response: AxiosResponse<WebhookTestResult> = await axios.post(
        `${this.baseUrl}/webhook/test/`,
        testData || { test: true, timestamp: Date.now() }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to test webhook security:', error);
      throw this.handleError(error);
    }
  }

  async getConfiguration(): Promise<WebhookConfig> {
    try {
      const response: AxiosResponse<{ config: WebhookConfig }> = await axios.get(
        `${this.baseUrl}/webhook/config/`
      );
      return response.data.config;
    } catch (error) {
      console.error('Failed to fetch webhook configuration:', error);
      throw this.handleError(error);
    }
  }

  async updateConfiguration(config: Partial<WebhookConfig>): Promise<WebhookConfig> {
    try {
      const response: AxiosResponse<{ config: WebhookConfig }> = await axios.put(
        `${this.baseUrl}/webhook/config/`,
        config
      );
      return response.data.config;
    } catch (error) {
      console.error('Failed to update webhook configuration:', error);
      throw this.handleError(error);
    }
  }

  async resetMetrics(): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/webhook/reset-metrics/`);
    } catch (error) {
      console.error('Failed to reset webhook metrics:', error);
      throw this.handleError(error);
    }
  }

  async clearAlerts(): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/webhook/clear-alerts/`);
    } catch (error) {
      console.error('Failed to clear webhook alerts:', error);
      throw this.handleError(error);
    }
  }

  async exportEvents(format: 'csv' | 'json' = 'csv', params?: {
    start_date?: string;
    end_date?: string;
    event_type?: string;
    status?: string;
  }): Promise<Blob> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/webhook/export-events/`,
        {
          params: { ...params, format },
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to export webhook events:', error);
      throw this.handleError(error);
    }
  }

  // Real-time webhook monitoring using Server-Sent Events
  createEventStream(onEvent: (event: WebhookEvent) => void, onError?: (error: any) => void): EventSource | null {
    try {
      const eventSource = new EventSource(`${this.baseUrl}/webhook/stream/`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(data);
        } catch (error) {
          console.error('Failed to parse webhook event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Webhook event stream error:', error);
        if (onError) onError(error);
      };

      return eventSource;
    } catch (error) {
      console.error('Failed to create webhook event stream:', error);
      if (onError) onError(error);
      return null;
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'Server error';
      return new Error(`${message} (${error.response.status})`);
    } else if (error.request) {
      // Request failed to reach server
      return new Error('Network error: Unable to reach the server');
    } else {
      // Other error
      return new Error(error.message || 'Unknown error occurred');
    }
  }
}

export const webhookService = new WebhookService();
export default webhookService;
