import { useState } from 'react';
import { apiFetch } from '../utils/api';

export interface UseAIReportProps {
  jobId?: number;
}

export const useAIReport = ({ jobId }: UseAIReportProps = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async (targetJobId?: number) => {
    const effectiveJobId = targetJobId || jobId;

    if (!effectiveJobId) {
      setError('No job ID provided for report generation');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/scrapy/api/jobs/${effectiveJobId}/generate_ai_report/`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to generate AI report: ${response.status}`);
      }

      // The response should be a PDF file
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from response headers if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'ai-report.pdf';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI report';
      setError(errorMessage);
      console.error('AI report generation error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const generateSentimentAnalysis = async (targetJobId?: number) => {
    const effectiveJobId = targetJobId || jobId;

    if (!effectiveJobId) {
      setError('No job ID provided for sentiment analysis');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch('/api/scrapy/api/enhanced-sentiment-analysis/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: effectiveJobId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze sentiment: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return { success: true, data: result };
      } else {
        throw new Error(result.error || 'Sentiment analysis failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze sentiment';
      setError(errorMessage);
      console.error('Sentiment analysis error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    generateReport,
    generateSentimentAnalysis,
  };
};

export default useAIReport;