import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

export interface SentimentStats {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentPost {
  sentiment: 'positive' | 'negative' | 'neutral';
  main_text: string;
  comments_count: number;
  [key: string]: any;
}

export interface SentimentAnalysisResult {
  success: boolean;
  posts: SentimentPost[];
  sentiment_stats: SentimentStats;
  total_posts: number;
  error?: string;
}

export interface UseSentimentAnalysisProps {
  jobId?: number;
  projectId?: number;
}

export const useSentimentAnalysis = ({ jobId, projectId }: UseSentimentAnalysisProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentAnalysisResult | null>(null);

  const analyzeSentiment = async (targetJobId?: number) => {
    if (!targetJobId && !jobId) {
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
          job_id: targetJobId || jobId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze sentiment: ${response.status}`);
      }

      const result: SentimentAnalysisResult = await response.json();

      if (result.success) {
        setSentimentData(result);
      } else {
        throw new Error(result.error || 'Sentiment analysis failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze sentiment';
      setError(errorMessage);
      console.error('Sentiment analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-analyze on mount if jobId is provided
  useEffect(() => {
    if (jobId) {
      analyzeSentiment(jobId);
    }
  }, [jobId]);

  // Generate chart data from sentiment stats
  const getChartData = () => {
    if (!sentimentData?.sentiment_stats) return [];

    return [
      {
        name: 'Positive',
        value: sentimentData.sentiment_stats.positive,
        color: '#4CAF50',
        percentage: sentimentData.total_posts > 0
          ? Math.round((sentimentData.sentiment_stats.positive / sentimentData.total_posts) * 100)
          : 0
      },
      {
        name: 'Neutral',
        value: sentimentData.sentiment_stats.neutral,
        color: '#2196F3',
        percentage: sentimentData.total_posts > 0
          ? Math.round((sentimentData.sentiment_stats.neutral / sentimentData.total_posts) * 100)
          : 0
      },
      {
        name: 'Negative',
        value: sentimentData.sentiment_stats.negative,
        color: '#E91E63',
        percentage: sentimentData.total_posts > 0
          ? Math.round((sentimentData.sentiment_stats.negative / sentimentData.total_posts) * 100)
          : 0
      }
    ];
  };

  // Get overall sentiment summary
  const getSentimentSummary = () => {
    if (!sentimentData?.sentiment_stats) return 'No data available';

    const stats = sentimentData.sentiment_stats;
    const total = sentimentData.total_posts;

    if (total === 0) return 'No posts analyzed';

    const positivePercentage = Math.round((stats.positive / total) * 100);
    const negativePercentage = Math.round((stats.negative / total) * 100);
    const neutralPercentage = Math.round((stats.neutral / total) * 100);

    if (positivePercentage >= 50) {
      return `Mostly positive sentiment (${positivePercentage}% positive)`;
    } else if (negativePercentage >= 30) {
      return `Mixed sentiment with ${negativePercentage}% negative feedback`;
    } else {
      return `Balanced sentiment across ${total} posts`;
    }
  };

  return {
    loading,
    error,
    sentimentData,
    analyzeSentiment,
    chartData: getChartData(),
    summary: getSentimentSummary(),
    refetch: () => analyzeSentiment(jobId),
  };
};

export default useSentimentAnalysis;