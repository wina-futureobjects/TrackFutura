import { apiFetch } from '../utils/api';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date | string;
  is_error?: boolean;
  tokens_used?: number;
  response_time?: number;
  data_context?: {
    total_posts_analyzed: number;
    platforms_covered: string[];
    total_engagement: number;
    date_range: {
      earliest: string | null;
      latest: string | null;
    };
  };
}

export interface ChatThread {
  id: string;
  title: string | null;
  project_id: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  messages: Message[];
  last_message: Message | null;
}

export interface ProjectDataSummary {
  total_results: number;
  platforms: Record<string, any>;
  jobs: Record<string, any>;
  all_posts: any[];
  statistics: {
    total_posts: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    total_engagement: number;
    platform_breakdown: Record<string, any>;
    engagement_metrics: Record<string, number>;
    top_performing_posts: any[];
  };
}

export interface AIAnalysisResponse {
  success: boolean;
  response?: string;
  error?: string;
  data_context?: any;
  tokens_used?: number;
  response_time?: number;
  project_id?: number;
}

class ChatService {
  private baseUrl = 'http://localhost:8000/api/scrapy';
  
  getCurrentProjectId(): number {
    // Extract project ID from current URL
    const path = window.location.pathname;
    const projectMatch = path.match(/\/organizations\/\d+\/projects\/(\d+)/);
    return projectMatch ? parseInt(projectMatch[1], 10) : 9; // Default to project 9 which has the most scraped data
  }

  async createThread(projectId?: number): Promise<ChatThread> {
    const currentProjectId = projectId || this.getCurrentProjectId();
    
    const response = await fetch(`${this.baseUrl}/api/chat/threads/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: currentProjectId,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create chat thread');
    }
    
    const data = await response.json();
    return {
      ...data,
      messages: data.messages || [],
      timestamp: new Date(data.timestamp || data.created_at)
    };
  }

  async getThreads(projectId?: number): Promise<ChatThread[]> {
    const currentProjectId = projectId || this.getCurrentProjectId();
    
    const response = await fetch(`${this.baseUrl}/api/chat/threads/?project_id=${currentProjectId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch chat threads');
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data.map(thread => ({
      ...thread,
      messages: thread.messages || [],
      timestamp: new Date(thread.timestamp || thread.created_at)
    })) : [];
  }

  async getThread(threadId: string): Promise<ChatThread> {
    const response = await fetch(`${this.baseUrl}/api/chat/threads/${threadId}/`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch chat thread');
    }
    
    const data = await response.json();
    return {
      ...data,
      messages: (data.messages || []).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    };
  }

  async addMessage(threadId: string, content: string, sender: 'user' | 'ai' = 'user'): Promise<{ user_message?: Message; ai_message?: Message } | Message> {
    const response = await fetch(`${this.baseUrl}/api/chat/threads/${threadId}/add_message/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        sender,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to add message');
    }
    
    const data = await response.json();
    
    // Handle both single message and user/ai message pair responses
    if (data.user_message && data.ai_message) {
      return {
        user_message: {
          ...data.user_message,
          timestamp: new Date(data.user_message.timestamp)
        },
        ai_message: {
          ...data.ai_message,
          timestamp: new Date(data.ai_message.timestamp)
        }
      };
    } else {
      return {
        ...data,
        timestamp: new Date(data.timestamp)
      };
    }
  }

  async archiveThread(threadId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/threads/${threadId}/archive/`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to archive thread');
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/threads/${threadId}/`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete thread');
    }
  }

  async getDirectAIAnalysis(question: string, projectId?: number): Promise<AIAnalysisResponse> {
    const currentProjectId = projectId || this.getCurrentProjectId();
    
    const response = await fetch(`${this.baseUrl}/api/ai-chat-analysis/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        project_id: currentProjectId,
      }),
    });
    
    const data = await response.json();
    return data;
  }

  async getProjectDataSummary(projectId?: number): Promise<{ success: boolean; data_summary?: ProjectDataSummary; error?: string }> {
    const currentProjectId = projectId || this.getCurrentProjectId();
    
    const response = await fetch(`${this.baseUrl}/api/project-data-summary/?project_id=${currentProjectId}`);
    const data = await response.json();
    return data;
  }
}

export const chatService = new ChatService(); 