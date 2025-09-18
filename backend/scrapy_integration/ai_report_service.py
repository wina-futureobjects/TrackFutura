import os
import json
from openai import OpenAI
from typing import List, Dict, Any
from django.conf import settings
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from io import BytesIO
import tempfile
from datetime import datetime
import re
from collections import Counter
import nltk
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import base64

# Configure OpenAI
OPENAI_API_KEY = getattr(settings, 'OPENAI_API_KEY', None)
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in settings. Please configure it in settings.py")

import httpx
# Create custom HTTP client to avoid proxy issues
http_client = httpx.Client(
    timeout=60.0,
    follow_redirects=True
)
# Initialize with custom http client
client = OpenAI(
    api_key=OPENAI_API_KEY,
    http_client=http_client
)

class AIReportGenerator:
    """
    AI-powered report generator for social media scraping data
    Uses OpenAI to analyze scraped content and generate insights
    """
    
    def __init__(self):
        self.client = client
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom styles for PDF generation"""
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Title'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2E86AB')
        )
        
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=15,
            spaceBefore=20,
            textColor=colors.HexColor('#A23B72')
        )
        
        self.subheading_style = ParagraphStyle(
            'CustomSubHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            spaceBefore=15,
            textColor=colors.HexColor('#F18F01')
        )
        
        self.body_style = ParagraphStyle(
            'CustomBody',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=8,
            alignment=TA_JUSTIFY,
            leading=14
        )
        
        self.highlight_style = ParagraphStyle(
            'Highlight',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=8,
            leftIndent=20,
            rightIndent=20,
            backColor=colors.HexColor('#F0F8FF'),
            borderColor=colors.HexColor('#2E86AB'),
            borderWidth=1,
            borderPadding=10
        )

    def extract_text_content(self, scraped_data: List[Dict]) -> List[str]:
        """Extract text content from scraped data"""
        text_content = []
        
        for item in scraped_data:
            if isinstance(item, dict):
                # Extract text from various possible fields
                text_fields = ['caption', 'text', 'content', 'description', 'post_text', 'body']
                for field in text_fields:
                    if field in item and item[field]:
                        text_content.append(str(item[field]))
                        
                # Extract comments if available
                if 'comments' in item and isinstance(item['comments'], list):
                    for comment in item['comments']:
                        if isinstance(comment, dict) and 'text' in comment:
                            text_content.append(str(comment['text']))
                        elif isinstance(comment, str):
                            text_content.append(comment)
        
        return [text for text in text_content if text and len(text.strip()) > 10]

    def analyze_with_openai(self, text_content: List[str], platform: str, basic_stats: Dict = None) -> Dict[str, Any]:
        """Use OpenAI to analyze the text content and generate insights"""
        
        # Combine all text content
        combined_text = "\n\n".join(text_content[:50])  # Limit to first 50 posts to avoid token limits
        
        # Include statistical context if provided
        stats_context = ""
        if basic_stats:
            stats_context = f"""
        
        STATISTICAL CONTEXT:
        - Total posts analyzed: {basic_stats.get('total_posts', 0)}
        - Average likes per post: {basic_stats.get('avg_likes', 0):.1f}
        - Average comments per post: {basic_stats.get('avg_comments', 0):.1f}
        - Average shares per post: {basic_stats.get('avg_shares', 0):.1f}
        - Total engagement: {basic_stats.get('total_likes', 0) + basic_stats.get('total_comments', 0) + basic_stats.get('total_shares', 0):,}
        - Top performing post engagement: {basic_stats.get('top_posts', [{}])[0].get('engagement', 0) if basic_stats.get('top_posts') else 0}
        
        Use these numbers to provide specific, data-driven insights and recommendations.
        """
        
        prompt = f"""
        Analyze the following {platform} social media content and provide detailed insights:

        Content to analyze:
        {combined_text}{stats_context}

        Please provide a comprehensive analysis with the following structure and formatting:

        # Social Media Content Analysis Report

        ## 1. **Content Summary**
        Provide a brief overview of the main themes and topics discussed in 2-3 paragraphs.

        ## 2. **Sentiment Analysis** 
        - Overall sentiment distribution (positive, negative, neutral percentages)
        - Key emotional indicators found in the content
        - Sentiment patterns and trends

        ## 3. **Common Words Analysis**
        **Positive Words:** List the most frequently used positive words (minimum 10 words)
        
        **Negative Words:** List the most frequently used negative words (minimum 10 words)
        
        **Neutral/Descriptive Words:** List the most frequently used neutral/descriptive words (minimum 15 words)
        
        **Trending Hashtags:** List trending hashtags and keywords

        ## 4. **Engagement Insights**
        - Content types that generate more engagement
        - Optimal posting patterns and timing
        - Audience resonance themes
        - Performance indicators

        ## 5. **Comment Strategy Recommendations**
        **Recommended Engagement Phrases:**
        - List suggested words and phrases for positive engagement
        
        **Words to Avoid:**
        - List words to avoid in comments
        
        **Tone Guidelines:**
        - Provide tone and style recommendations for this audience

        ## 6. **Content Opportunities**
        - **Trending Topics:** Topics to leverage
        - **Content Gaps:** Opportunities for new content
        - **Audience Interests:** Key preferences and interests

        ## 7. **Risk Assessment**
        - **Negative Sentiment Areas:** Potential concerns
        - **Controversial Topics:** Topics to handle carefully  
        - **Brand Safety:** Safety considerations and recommendations

        Please ensure each section is clearly formatted with proper headings and bullet points where appropriate. 
        Make the analysis practical, business-oriented, and include specific examples from the analyzed content.
        Use **bold text** for emphasis on key points and recommendations.
        
        IMPORTANT: Base all insights and recommendations on the specific data provided. Reference actual engagement numbers, content themes, and patterns from the analyzed posts. Avoid generic advice and focus on data-driven insights.
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Using GPT-4o-mini for cost efficiency
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert social media analyst. Provide detailed, actionable insights about social media content with proper formatting using markdown headers (# ##) and bold text (**text**)."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=4000,
                temperature=0.7
            )
            
            return {
                'success': True,
                'analysis': response.choices[0].message.content,
                'platform': platform,
                'analyzed_posts': len(text_content),
                'total_characters': len(combined_text)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'platform': platform,
                'analyzed_posts': len(text_content)
            }

    def generate_basic_stats(self, scraped_data: List[Dict]) -> Dict[str, Any]:
        """Generate basic statistics from scraped data"""
        stats = {
            'total_posts': len(scraped_data),
            'total_likes': 0,
            'total_comments': 0,
            'total_shares': 0,
            'avg_likes': 0,
            'avg_comments': 0,
            'avg_shares': 0,
            'top_posts': [],
            'post_types': Counter(),
            'posting_times': []
        }
        
        likes_list = []
        comments_list = []
        shares_list = []
        
        for item in scraped_data:
            if isinstance(item, dict):
                # Extract engagement metrics
                likes = item.get('likes', 0) or item.get('num_likes', 0) or 0
                comments = item.get('comments_count', 0) or item.get('num_comments', 0) or item.get('comments', 0) or 0
                shares = item.get('shares', 0) or item.get('num_shares', 0) or 0
                
                if isinstance(likes, str):
                    likes = int(re.sub(r'[^\d]', '', likes)) if re.sub(r'[^\d]', '', likes) else 0
                if isinstance(comments, str):
                    comments = int(re.sub(r'[^\d]', '', comments)) if re.sub(r'[^\d]', '', comments) else 0
                if isinstance(shares, str):
                    shares = int(re.sub(r'[^\d]', '', shares)) if re.sub(r'[^\d]', '', shares) else 0
                
                stats['total_likes'] += likes
                stats['total_comments'] += comments
                stats['total_shares'] += shares
                
                likes_list.append(likes)
                comments_list.append(comments)
                shares_list.append(shares)
                
                # Track post types
                if 'media_type' in item:
                    stats['post_types'][item['media_type']] += 1
                elif 'type' in item:
                    stats['post_types'][item['type']] += 1
                else:
                    stats['post_types']['post'] += 1
                
                # Track posting times
                if 'timestamp' in item:
                    stats['posting_times'].append(item['timestamp'])
        
        # Calculate averages
        if stats['total_posts'] > 0:
            stats['avg_likes'] = round(stats['total_likes'] / stats['total_posts'], 2)
            stats['avg_comments'] = round(stats['total_comments'] / stats['total_posts'], 2)
            stats['avg_shares'] = round(stats['total_shares'] / stats['total_posts'], 2)
        
        # Find top performing posts
        posts_with_engagement = []
        for i, item in enumerate(scraped_data):
            if isinstance(item, dict):
                engagement = likes_list[i] + comments_list[i] + shares_list[i]
                posts_with_engagement.append({
                    'index': i,
                    'engagement': engagement,
                    'likes': likes_list[i],
                    'comments': comments_list[i],
                    'shares': shares_list[i],
                    'content': item.get('caption', item.get('text', item.get('description', '')))[:100]
                })
        
        stats['top_posts'] = sorted(posts_with_engagement, key=lambda x: x['engagement'], reverse=True)[:5]
        
        return stats

    def generate_strategic_recommendations(self, basic_stats: Dict, ai_analysis: Dict, job_data: Dict) -> List[str]:
        """Generate data-driven strategic recommendations based on analysis results"""
        recommendations = []
        platform = job_data.get('platform', 'social media').lower()
        
        # Analyze engagement patterns
        avg_engagement = basic_stats.get('avg_likes', 0) + basic_stats.get('avg_comments', 0) + basic_stats.get('avg_shares', 0)
        total_posts = basic_stats.get('total_posts', 0)
        
        # 1. Content Type Recommendations based on top performers
        top_posts = basic_stats.get('top_posts', [])
        if top_posts:
            best_performer = top_posts[0]
            best_engagement = best_performer.get('engagement', 0)
            if best_engagement > avg_engagement * 2:
                content_preview = best_performer.get('content', '')[:50]
                recommendations.append(f"Focus on content similar to your top performer ('{content_preview}...') which achieved {best_engagement:,} total engagements - {int((best_engagement / avg_engagement - 1) * 100)}% above average")
            else:
                recommendations.append(f"Your top-performing content averages {best_engagement:,} engagements. Consider analyzing what makes these posts successful and replicate those elements")
        
        # 2. Platform-specific engagement insights
        if platform == 'instagram':
            if basic_stats.get('avg_comments', 0) > basic_stats.get('avg_likes', 0) * 0.1:
                recommendations.append("Your Instagram content generates strong comment engagement. Leverage this by asking more questions and creating conversation-starter posts")
            else:
                recommendations.append("Consider increasing comment engagement on Instagram through interactive content, polls in stories, and direct questions to your audience")
        elif platform == 'linkedin':
            if basic_stats.get('avg_shares', 0) > 0:
                recommendations.append(f"Your LinkedIn content averages {basic_stats.get('avg_shares', 0):.1f} shares per post. Focus on professional insights and industry trends to maintain this sharing momentum")
            else:
                recommendations.append("Increase LinkedIn shareability by posting industry insights, professional tips, and thought leadership content that professionals want to share with their networks")
        elif platform == 'facebook':
            recommendations.append(f"Your Facebook posts average {basic_stats.get('avg_likes', 0):.1f} likes. Focus on community-building content and posts that encourage discussion")
        elif platform == 'tiktok':
            recommendations.append(f"With {total_posts} TikTok posts analyzed, focus on trending sounds, hashtag challenges, and short-form video content that encourages user interaction")
        
        # 3. Posting frequency and timing recommendations
        if total_posts > 0:
            if total_posts < 10:
                recommendations.append(f"Increase posting frequency - with only {total_posts} posts analyzed, more consistent content creation could improve overall engagement and reach")
            elif total_posts > 50:
                recommendations.append(f"With {total_posts} posts analyzed, you have consistent content creation. Focus on quality optimization and audience engagement strategies")
            else:
                recommendations.append(f"Your {total_posts} posts show good content consistency. Analyze your top-performing posting times and schedule content accordingly")
        
        # 4. Engagement rate analysis
        if avg_engagement > 0:
            if basic_stats.get('avg_likes', 0) > basic_stats.get('avg_comments', 0) * 10:
                recommendations.append("Your content gets good likes but limited comments. Create more conversation-starting content with questions and calls-to-action")
            elif basic_stats.get('avg_comments', 0) > basic_stats.get('avg_likes', 0) * 0.2:
                recommendations.append("Excellent comment engagement! Continue creating content that sparks discussions and respond actively to maintain this engagement")
        
        # 5. AI-driven insights integration
        if ai_analysis.get('success') and ai_analysis.get('analysis'):
            analysis_text = ai_analysis.get('analysis', '').lower()
            
            if 'positive' in analysis_text and 'sentiment' in analysis_text:
                recommendations.append("Maintain your positive content tone as it resonates well with your audience, while occasionally addressing challenges to show authenticity")
            
            if 'hashtag' in analysis_text or 'trending' in analysis_text:
                recommendations.append("Leverage the trending topics and hashtags identified in your content analysis to increase discoverability and reach")
            
            if 'engagement' in analysis_text and 'opportunity' in analysis_text:
                recommendations.append("Capitalize on the engagement opportunities identified in your content analysis by creating more interactive and participatory content")
        
        # 6. Performance benchmarking
        if top_posts and len(top_posts) >= 3:
            top_3_avg = sum(post.get('engagement', 0) for post in top_posts[:3]) / 3
            bottom_posts = top_posts[-3:] if len(top_posts) >= 6 else top_posts[len(top_posts)//2:]
            bottom_avg = sum(post.get('engagement', 0) for post in bottom_posts) / len(bottom_posts) if bottom_posts else 0
            
            if top_3_avg > bottom_avg * 2:
                performance_gap = int((top_3_avg / bottom_avg - 1) * 100) if bottom_avg > 0 else 0
                recommendations.append(f"There's a {performance_gap}% performance gap between your top and average content. Analyze your top 3 posts' common elements and apply those insights to future content")
        
        # 7. Content diversity and optimization
        post_types = basic_stats.get('post_types', {})
        if post_types:
            most_common_type = max(post_types.items(), key=lambda x: x[1])
            if most_common_type[1] > total_posts * 0.7:
                recommendations.append(f"Consider diversifying your content mix - {most_common_type[0]} posts dominate your feed. Try incorporating different content formats to reach broader audience segments")
            else:
                recommendations.append(f"Good content variety with {len(post_types)} different post types. Continue testing different formats while doubling down on your best-performing content types")
        
        # Ensure we have at least 5 recommendations
        while len(recommendations) < 5:
            fallback_recommendations = [
                f"Monitor your {platform.title()} analytics weekly to identify trending content patterns and optimal posting times",
                "Engage with your audience within the first hour of posting to boost algorithmic visibility",
                "Create content pillars that align with your brand values and audience interests for consistent messaging",
                "Test different content formats and track performance metrics to optimize your content strategy",
                "Build a content calendar that balances promotional, educational, and entertaining content"
            ]
            for fallback in fallback_recommendations:
                if fallback not in recommendations and len(recommendations) < 7:
                    recommendations.append(fallback)
        
        return recommendations[:7]  # Limit to 7 recommendations

    def create_pdf_report(self, job_data: Dict, ai_analysis: Dict, basic_stats: Dict) -> BytesIO:
        """Create a comprehensive PDF report"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=inch, bottomMargin=inch)
        story = []
        
        # Title Page
        story.append(Paragraph(f"Social Media Analytics Report", self.title_style))
        story.append(Spacer(1, 20))
        
        # Job Information
        job_info_data = [
            ['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ['Platform:', ai_analysis.get('platform', 'Unknown').title()],
            ['Job Name:', job_data.get('name', 'N/A')],
            ['Total Posts Analyzed:', str(basic_stats.get('total_posts', 0))],
            ['Analysis Status:', 'Success' if ai_analysis.get('success') else 'Partial']
        ]
        
        job_table = Table(job_info_data, colWidths=[2*inch, 3*inch])
        job_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8F9FA')),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(job_table)
        story.append(Spacer(1, 30))
        
        # Executive Summary
        story.append(Paragraph("Executive Summary", self.heading_style))
        summary_text = f"""
        This report analyzes {basic_stats.get('total_posts', 0)} social media posts from {ai_analysis.get('platform', 'the platform').title()}.
        The analysis reveals key insights about content performance, audience engagement patterns, and strategic opportunities
        for content optimization and community engagement.
        """
        story.append(Paragraph(summary_text, self.body_style))
        story.append(Spacer(1, 20))
        
        # Key Metrics Overview
        story.append(Paragraph("Key Performance Metrics", self.heading_style))
        
        metrics_data = [
            ['Metric', 'Value', 'Average per Post'],
            ['Total Engagement', f"{basic_stats.get('total_likes', 0) + basic_stats.get('total_comments', 0) + basic_stats.get('total_shares', 0):,}", f"{basic_stats.get('avg_likes', 0) + basic_stats.get('avg_comments', 0) + basic_stats.get('avg_shares', 0):.1f}"],
            ['Total Likes', f"{basic_stats.get('total_likes', 0):,}", f"{basic_stats.get('avg_likes', 0):.1f}"],
            ['Total Comments', f"{basic_stats.get('total_comments', 0):,}", f"{basic_stats.get('avg_comments', 0):.1f}"],
            ['Total Shares', f"{basic_stats.get('total_shares', 0):,}", f"{basic_stats.get('avg_shares', 0):.1f}"]
        ]
        
        metrics_table = Table(metrics_data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#A23B72')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8F9FA')),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')])
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 20))
        
        # Top Performing Posts
        if basic_stats.get('top_posts'):
            story.append(Paragraph("Top Performing Posts", self.heading_style))
            
            top_posts_data = [['Rank', 'Content Preview', 'Likes', 'Comments', 'Shares', 'Total Engagement']]
            for i, post in enumerate(basic_stats['top_posts'][:5], 1):
                content_preview = post['content'][:60] + "..." if len(post['content']) > 60 else post['content']
                top_posts_data.append([
                    str(i),
                    content_preview,
                    str(post['likes']),
                    str(post['comments']),
                    str(post['shares']),
                    str(post['engagement'])
                ])
            
            top_posts_table = Table(top_posts_data, colWidths=[0.5*inch, 2.5*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1*inch])
            top_posts_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F18F01')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (1, 1), (1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8F9FA')),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP')
            ]))
            story.append(top_posts_table)
            story.append(Spacer(1, 20))
        
        # AI Analysis Section
        if ai_analysis.get('success') and ai_analysis.get('analysis'):
            story.append(PageBreak())
            story.append(Paragraph("AI-Powered Content Analysis", self.title_style))
            story.append(Spacer(1, 20))
            
            # Process AI analysis with better formatting
            analysis_text = ai_analysis['analysis']
            
            # Split by major sections (## headers)
            sections = re.split(r'\n\s*#+\s*\d*\.?\s*\*\*([^*]+)\*\*', analysis_text)
            
            if len(sections) > 1:
                # First section is usually the title/intro
                if sections[0].strip():
                    intro_lines = sections[0].strip().split('\n')
                    for line in intro_lines:
                        line = line.strip()
                        if line.startswith('#'):
                            # Main title
                            title_text = re.sub(r'^#+\s*', '', line)
                            story.append(Paragraph(title_text, self.title_style))
                            story.append(Spacer(1, 20))
                        elif line:
                            story.append(Paragraph(line, self.body_style))
                
                # Process section pairs
                for i in range(1, len(sections), 2):
                    if i + 1 < len(sections):
                        section_title = sections[i].strip()
                        section_content = sections[i + 1].strip()
                        
                        # Add section title
                        story.append(Paragraph(section_title, self.subheading_style))
                        story.append(Spacer(1, 10))
                        
                        # Process content paragraphs
                        content_paragraphs = section_content.split('\n\n')
                        for para in content_paragraphs:
                            para = para.strip()
                            if not para:
                                continue
                                
                            # Handle bold subsections (**Bold Text:**)
                            if para.startswith('**') and ':**' in para:
                                bold_match = re.match(r'\*\*([^*]+)\*\*:', para)
                                if bold_match:
                                    subsection_title = bold_match.group(1)
                                    remaining_text = para[bold_match.end():].strip()
                                    
                                    story.append(Paragraph(f"<b>{subsection_title}:</b>", self.body_style))
                                    if remaining_text:
                                        story.append(Paragraph(remaining_text, self.body_style))
                                    continue
                            
                            # Handle bullet points
                            if para.startswith('-') or para.startswith('•'):
                                bullet_lines = para.split('\n')
                                for line in bullet_lines:
                                    line = line.strip()
                                    if line and (line.startswith('-') or line.startswith('•')):
                                        # Clean bullet point
                                        clean_line = re.sub(r'^[-•]\s*', '• ', line)
                                        # Handle bold text within bullets
                                        clean_line = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', clean_line)
                                        story.append(Paragraph(clean_line, self.body_style))
                            else:
                                # Regular paragraph - handle bold formatting
                                formatted_para = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', para)
                                story.append(Paragraph(formatted_para, self.body_style))
                        
                        story.append(Spacer(1, 20))
            else:
                # Fallback: process as single block with basic formatting
                lines = analysis_text.split('\n')
                for line in lines:
                    line = line.strip()
                    if not line:
                        story.append(Spacer(1, 6))
                        continue
                        
                    # Handle headers
                    if line.startswith('#'):
                        header_text = re.sub(r'^#+\s*', '', line)
                        if '**' in header_text:
                            header_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', header_text)
                        story.append(Paragraph(header_text, self.subheading_style))
                        story.append(Spacer(1, 10))
                    elif line.startswith('-') or line.startswith('•'):
                        # Bullet point
                        clean_line = re.sub(r'^[-•]\s*', '• ', line)
                        clean_line = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', clean_line)
                        story.append(Paragraph(clean_line, self.body_style))
                    else:
                        # Regular paragraph
                        formatted_line = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', line)
                        story.append(Paragraph(formatted_line, self.body_style))
        
        # Recommendations Section
        story.append(PageBreak())
        story.append(Paragraph("Strategic Recommendations", self.heading_style))
        
        # Generate data-driven recommendations
        recommendations = self.generate_strategic_recommendations(basic_stats, ai_analysis, job_data)
        
        for i, rec in enumerate(recommendations, 1):
            story.append(Paragraph(f"{i}. {rec}", self.body_style))
        
        story.append(Spacer(1, 30))
        
        # Footer
        story.append(Paragraph("Report generated by TrackFutura AI Analytics Engine", 
                              ParagraphStyle('Footer', parent=self.styles['Normal'], 
                                           fontSize=9, alignment=TA_CENTER, 
                                           textColor=colors.gray)))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer

    def generate_report(self, job_id: int) -> Dict[str, Any]:
        """Generate complete AI report for a scraping job"""
        try:
            from .models import ScrapyJob, ScrapyResult
            
            # Get job and results
            job = ScrapyJob.objects.get(id=job_id)
            results = ScrapyResult.objects.filter(job=job, success=True)
            
            if not results.exists():
                return {
                    'success': False,
                    'error': 'No successful results found for this job'
                }
            
            # Extract all scraped data
            all_scraped_data = []
            for result in results:
                if result.scraped_data:
                    if isinstance(result.scraped_data, list):
                        all_scraped_data.extend(result.scraped_data)
                    else:
                        all_scraped_data.append(result.scraped_data)
            
            if not all_scraped_data:
                return {
                    'success': False,
                    'error': 'No scraped data found in results'
                }
            
            # Extract text content for AI analysis
            text_content = self.extract_text_content(all_scraped_data)
            
            if not text_content:
                return {
                    'success': False,
                    'error': 'No text content found for analysis'
                }
            
            # Generate basic statistics
            basic_stats = self.generate_basic_stats(all_scraped_data)
            
            # Perform AI analysis
            platform = job.config.platform
            ai_analysis = self.analyze_with_openai(text_content, platform, basic_stats)
            
            if not ai_analysis.get('success'):
                return {
                    'success': False,
                    'error': f"AI analysis failed: {ai_analysis.get('error', 'Unknown error')}"
                }
            
            # Generate PDF report
            job_data = {
                'name': job.name,
                'platform': platform,
                'created_at': job.created_at
            }
            
            pdf_buffer = self.create_pdf_report(job_data, ai_analysis, basic_stats)
            
            return {
                'success': True,
                'pdf_data': pdf_buffer.getvalue(),
                'filename': f"{job.name.replace(' ', '_')}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                'ai_analysis': ai_analysis,
                'basic_stats': basic_stats
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Report generation failed: {str(e)}"
            }