// Static demo data for fallback when API is unavailable
export const demoJobs = [
  {
    id: 1,
    name: 'Instagram Profile Analysis - Tech Influencers',
    platform: 'instagram',
    status: 'completed',
    created_at: '2024-09-15T10:30:00Z',
    updated_at: '2024-09-15T14:45:00Z',
    spider_name: 'instagram_spider',
    target_urls: ['https://instagram.com/tech_influencer_1'],
    results_count: 25
  },
  {
    id: 2,
    name: 'Facebook Page Monitoring - Brand Campaign',
    platform: 'facebook',
    status: 'completed',
    created_at: '2024-09-14T09:15:00Z',
    updated_at: '2024-09-14T16:20:00Z',
    spider_name: 'facebook_spider',
    target_urls: ['https://facebook.com/brand_page'],
    results_count: 18
  },
  {
    id: 3,
    name: 'LinkedIn Professional Network Analysis',
    platform: 'linkedin',
    status: 'completed',
    created_at: '2024-09-13T11:00:00Z',
    updated_at: '2024-09-13T17:30:00Z',
    spider_name: 'linkedin_spider',
    target_urls: ['https://linkedin.com/company/tech-corp'],
    results_count: 32
  },
  {
    id: 4,
    name: 'TikTok Trending Content Research',
    platform: 'tiktok',
    status: 'completed',
    created_at: '2024-09-12T14:20:00Z',
    updated_at: '2024-09-12T19:45:00Z',
    spider_name: 'tiktok_spider',
    target_urls: ['https://tiktok.com/@trending_creator'],
    results_count: 42
  }
];

export const demoResults = {
  instagram: [
    {
      id: 1,
      job_id: 1,
      item_id: 'ig_post_001',
      data: {
        post_id: 'ig_post_001',
        text: 'Just launched our new AI-powered productivity app! 🚀 Been working on this for months and excited to share it with you all. What features would you love to see next? #TechStartup #AI #Productivity',
        likes: 1247,
        comments: 89,
        shares: 23,
        timestamp: '2024-09-15T12:30:00Z',
        author: 'tech_influencer_1',
        url: 'https://instagram.com/p/demo_post_1',
        hashtags: ['#TechStartup', '#AI', '#Productivity'],
        mentions: ['@team_member_1', '@investor_abc']
      },
      platform: 'instagram',
      status: 'processed',
      created_at: '2024-09-15T12:35:00Z'
    },
    {
      id: 2,
      job_id: 1,
      item_id: 'ig_post_002',
      data: {
        post_id: 'ig_post_002',
        text: 'Behind the scenes of our latest product photoshoot 📸 The team put so much effort into making everything perfect. Swipe to see the final results! #BehindTheScenes #ProductPhotography #TeamWork',
        likes: 892,
        comments: 45,
        shares: 12,
        timestamp: '2024-09-14T16:45:00Z',
        author: 'tech_influencer_1',
        url: 'https://instagram.com/p/demo_post_2',
        hashtags: ['#BehindTheScenes', '#ProductPhotography', '#TeamWork'],
        mentions: ['@photographer_pro', '@design_team']
      },
      platform: 'instagram',
      status: 'processed',
      created_at: '2024-09-14T16:50:00Z'
    }
  ],
  facebook: [
    {
      id: 3,
      job_id: 2,
      item_id: 'fb_post_001',
      data: {
        post_id: 'fb_post_001',
        text: 'Exciting news! Our Q3 campaign exceeded all expectations with a 300% increase in engagement. Thank you to our amazing community for your continued support. Here\'s what\'s coming in Q4...',
        likes: 456,
        comments: 78,
        shares: 89,
        timestamp: '2024-09-14T14:20:00Z',
        author: 'brand_page',
        url: 'https://facebook.com/posts/demo_post_1',
        reactions: {
          like: 456,
          love: 123,
          wow: 45,
          angry: 2,
          sad: 1
        }
      },
      platform: 'facebook',
      status: 'processed',
      created_at: '2024-09-14T14:25:00Z'
    }
  ],
  linkedin: [
    {
      id: 4,
      job_id: 3,
      item_id: 'li_post_001',
      data: {
        post_id: 'li_post_001',
        text: 'Proud to announce that our company has been recognized as one of the top 10 innovative startups in the region! This achievement wouldn\'t be possible without our dedicated team and supportive clients. #Innovation #Startup #TeamSuccess',
        likes: 234,
        comments: 56,
        shares: 34,
        timestamp: '2024-09-13T13:15:00Z',
        author: 'tech-corp',
        url: 'https://linkedin.com/posts/demo_post_1',
        author_title: 'CEO at TechCorp',
        company: 'TechCorp'
      },
      platform: 'linkedin',
      status: 'processed',
      created_at: '2024-09-13T13:20:00Z'
    }
  ],
  tiktok: [
    {
      id: 5,
      job_id: 4,
      item_id: 'tt_post_001',
      data: {
        post_id: 'tt_post_001',
        text: 'POV: You\'re a developer at 3 AM debugging code that worked yesterday 😭 #DeveloperLife #Coding #TechHumor #Programming',
        likes: 12500,
        comments: 456,
        shares: 890,
        timestamp: '2024-09-12T16:30:00Z',
        author: 'trending_creator',
        url: 'https://tiktok.com/@trending_creator/video/demo_1',
        views: 150000,
        duration: 15
      },
      platform: 'tiktok',
      status: 'processed',
      created_at: '2024-09-12T16:35:00Z'
    }
  ]
};

export const demoChatHistory = [
  {
    id: 1,
    title: 'Instagram Campaign Analysis',
    messages: [
      {
        id: 1,
        role: 'user',
        content: 'Analyze the performance of our recent Instagram posts for the tech product launch',
        timestamp: '2024-09-15T15:00:00Z'
      },
      {
        id: 2,
        role: 'assistant',
        content: 'Based on the scraped data from your Instagram campaign, here are the key insights:\n\n**Performance Overview:**\n• Total engagement: 2,139 interactions across 2 posts\n• Average likes per post: 1,069\n• Comment rate: 3.1% (above industry average of 1.9%)\n\n**Top Performing Content:**\n• AI productivity app announcement: 1,247 likes, 89 comments\n• Behind-the-scenes content: 892 likes, 45 comments\n\n**Hashtag Analysis:**\n• #TechStartup and #AI generated the highest engagement\n• #BehindTheScenes posts show 15% higher comment rates\n\n**Recommendations:**\n1. Increase behind-the-scenes content (higher engagement rates)\n2. Continue using #TechStartup and #AI hashtags\n3. Post during 12-4 PM for optimal reach\n\n**Audience Insights:**\n• Peak engagement occurs on weekdays\n• Tech-focused content resonates well with your audience\n• Visual content performs 40% better than text-only posts',
        timestamp: '2024-09-15T15:02:00Z'
      },
      {
        id: 3,
        role: 'user',
        content: 'What about sentiment analysis of the comments?',
        timestamp: '2024-09-15T15:05:00Z'
      },
      {
        id: 4,
        role: 'assistant',
        content: '**Sentiment Analysis Results:**\n\n**Overall Sentiment Distribution:**\n• Positive: 78% (105 comments)\n• Neutral: 18% (24 comments)\n• Negative: 4% (5 comments)\n\n**Key Positive Themes:**\n• Excitement about AI features (mentioned 23 times)\n• Appreciation for transparency and behind-the-scenes content\n• Users asking about beta access and early adoption\n\n**Neutral Comments:**\n• Questions about pricing and availability\n• Technical specification inquiries\n• General curiosity about features\n\n**Negative Feedback:**\n• 3 comments about app store availability\n• 2 concerns about data privacy (addressable with clear privacy policy)\n\n**Actionable Insights:**\n1. Create FAQ content addressing common questions\n2. Develop privacy-focused content to address concerns\n3. Leverage the excitement by creating beta signup campaigns\n4. The high positive sentiment (78%) indicates strong market fit',
        timestamp: '2024-09-15T15:07:00Z'
      }
    ]
  },
  {
    id: 2,
    title: 'Cross-Platform Performance Comparison',
    messages: [
      {
        id: 5,
        role: 'user',
        content: 'Compare performance across all platforms - Instagram, Facebook, LinkedIn, and TikTok',
        timestamp: '2024-09-16T10:00:00Z'
      },
      {
        id: 6,
        role: 'assistant',
        content: '**Cross-Platform Performance Analysis:**\n\n**Engagement Metrics by Platform:**\n\n**TikTok (Best Overall Performance):**\n• Average views: 150,000\n• Engagement rate: 8.9%\n• Best for: Viral content, younger demographics\n• Top content: Developer humor content\n\n**Instagram (High Quality Engagement):**\n• Average likes: 1,069\n• Comment rate: 3.1%\n• Best for: Visual storytelling, product launches\n• Top content: Product announcements\n\n**LinkedIn (Professional Network):**\n• Average engagement: 324 interactions\n• Share rate: 14.5%\n• Best for: B2B content, thought leadership\n• Top content: Company achievements\n\n**Facebook (Community Building):**\n• Average reach: 5,600\n• Share rate: 19.5%\n• Best for: Community updates, detailed content\n• Top content: Campaign results\n\n**Platform Recommendations:**\n1. **TikTok**: Focus on developer humor and quick tips\n2. **Instagram**: Product launches and visual content\n3. **LinkedIn**: Thought leadership and company news\n4. **Facebook**: Detailed updates and community building\n\n**Content Strategy:**\n• Repurpose content across platforms with platform-specific adaptations\n• TikTok and Instagram for product awareness\n• LinkedIn and Facebook for community and credibility',
        timestamp: '2024-09-16T10:05:00Z'
      }
    ]
  }
];

export const demoMetrics = {
  totalPosts: 117,
  totalEngagement: 45678,
  averageEngagement: 390,
  topPerformingPlatform: 'TikTok',
  engagementGrowth: '+23.5%',
  followerGrowth: '+12.8%',
  platformStats: {
    instagram: { posts: 25, engagement: 12450, followers: 8900 },
    facebook: { posts: 18, engagement: 8200, followers: 12400 },
    linkedin: { posts: 32, engagement: 15680, followers: 5600 },
    tiktok: { posts: 42, engagement: 9348, followers: 23400 }
  }
};