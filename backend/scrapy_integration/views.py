from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponse
import csv
import io
from datetime import datetime

from .models import ScrapyConfig, ScrapyJob, ScrapyResult
from .services import SocialMediaScrapingService
from .serializers import ScrapyConfigSerializer, ScrapyJobSerializer, ScrapyResultSerializer
from apify_integration.services import ApifyScrapingService


class ScrapyConfigViewSet(viewsets.ModelViewSet):
    """API endpoints for Scrapy configurations"""
    
    queryset = ScrapyConfig.objects.all()
    serializer_class = ScrapyConfigSerializer
    permission_classes = [AllowAny]  # Temporarily disable authentication for testing
    
    def get_queryset(self):
        queryset = ScrapyConfig.objects.all()
        platform = self.request.query_params.get('platform')
        if platform:
            queryset = queryset.filter(platform=platform)
        return queryset


class ScrapyJobViewSet(viewsets.ModelViewSet):
    """API endpoints for Scrapy jobs"""
    
    queryset = ScrapyJob.objects.all()
    serializer_class = ScrapyJobSerializer
    permission_classes = [AllowAny]  # Temporarily disable authentication for testing
    
    def get_queryset(self):
        queryset = ScrapyJob.objects.all()
        project_id = self.request.query_params.get('project_id')
        platform = self.request.query_params.get('platform')
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if platform:
            queryset = queryset.filter(config__platform=platform)
        return queryset
    
    @action(detail=False, methods=['post'])
    def create_job(self, request):
        """Create a new scraping job using Apify"""
        
        try:
            data = request.data
            service = ApifyScrapingService()
            
            # Use async view handling
            import asyncio
            
            async def create_apify_job():
                return await service.create_scraping_job(
                    name=data.get('name'),
                    project_id=data.get('project_id'),
                    platform=data.get('platform'),
                    content_type=data.get('content_type', 'posts'),
                    target_urls=data.get('target_urls', []),
                    source_names=data.get('source_names', []),
                    num_of_posts=data.get('num_of_posts', 10),
                    start_date=data.get('start_date'),
                    end_date=data.get('end_date'),
                    output_folder_id=data.get('output_folder_id'),
                    auto_create_folders=data.get('auto_create_folders', True)
                )
            
            # Run async function
            job = asyncio.run(create_apify_job())
            
            serializer = ScrapyJobSerializer(job)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def start_job(self, request, pk=None):
        """Start a scraping job using Apify"""
        
        try:
            job = self.get_object()
            service = ApifyScrapingService()
            
            import asyncio
            
            async def start_apify_job():
                return await service.start_scraping_job(job.id)
            
            success = asyncio.run(start_apify_job())
            
            if success:
                return Response({'message': 'Job started successfully'})
            else:
                return Response(
                    {'error': 'Failed to start job'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cancel_job(self, request, pk=None):
        """Cancel a scraping job using Apify"""
        
        try:
            job = self.get_object()
            service = ApifyScrapingService()
            
            import asyncio
            
            async def cancel_apify_job():
                return await service.cancel_job(job.id)
            
            success = asyncio.run(cancel_apify_job())
            
            if success:
                return Response({'message': 'Job cancelled successfully'})
            else:
                return Response(
                    {'error': 'Failed to cancel job'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get job status and progress using Apify"""
        
        try:
            service = ApifyScrapingService()
            
            import asyncio
            
            async def get_apify_status():
                return await service.get_job_status(pk)
            
            status_data = asyncio.run(get_apify_status())
            
            return Response(status_data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get job results"""
        
        try:
            job = self.get_object()
            results = ScrapyResult.objects.filter(job=job)
            serializer = ScrapyResultSerializer(results, many=True)
            
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        """Export job results as CSV"""
        
        try:
            job = self.get_object()
            results = ScrapyResult.objects.filter(job=job, success=True)
            
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{job.name.replace(" ", "_")}_results_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            
            # Create CSV writer
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Determine platform and write appropriate headers
            platform = job.config.platform if job.config else 'unknown'
            
            if platform == 'instagram':
                # Write Instagram-specific headers
                headers = [
                    'Post URL', 'Caption', 'Likes', 'Comments Count', 'Shares', 'Views',
                    'Media Type', 'Username', 'User Full Name', 'Timestamp',
                    'Hashtags', 'Mentions', 'Image URLs', 'Video URLs',
                    'Comment 1 User', 'Comment 1 Text', 'Comment 1 Likes',
                    'Comment 2 User', 'Comment 2 Text', 'Comment 2 Likes',
                    'Comment 3 User', 'Comment 3 Text', 'Comment 3 Likes',
                    'Comment 4 User', 'Comment 4 Text', 'Comment 4 Likes',
                    'Comment 5 User', 'Comment 5 Text', 'Comment 5 Likes',
                    'All Comments (JSON)'
                ]
                writer.writerow(headers)
                
                # Write Instagram data rows
                for result in results:
                    data = result.scraped_data
                    comments = data.get('comments', [])
                    
                    row = [
                        data.get('post_url', ''),
                        data.get('caption', '').replace('\n', ' ').replace('\r', ''),
                        data.get('likes', 0),
                        data.get('comments_count', len(comments)),
                        data.get('shares', 0),
                        data.get('views', 0),
                        data.get('media_type', ''),
                        data.get('username', ''),
                        data.get('user_full_name', ''),
                        data.get('timestamp', ''),
                        ', '.join(data.get('hashtags', [])),
                        ', '.join(data.get('mentions', [])),
                        ', '.join(data.get('images', [])),
                        ', '.join(data.get('videos', [])),
                    ]
                    
                    # Add first 5 comments as separate columns
                    for i in range(5):
                        if i < len(comments):
                            comment = comments[i]
                            row.extend([
                                comment.get('username', ''),
                                comment.get('text', '').replace('\n', ' ').replace('\r', ''),
                                comment.get('likes', 0)
                            ])
                        else:
                            row.extend(['', '', ''])
                    
                    # Add all comments as JSON for reference
                    import json
                    row.append(json.dumps(comments) if comments else '[]')
                    
                    writer.writerow(row)
            
            else:
                # Generic CSV format for other platforms
                headers = [
                    'Source URL', 'Source Name', 'Scraped Data (JSON)', 
                    'Success', 'Timestamp', 'Error Message'
                ]
                writer.writerow(headers)
                
                for result in results:
                    import json
                    row = [
                        result.source_url,
                        result.source_name,
                        json.dumps(result.scraped_data),
                        result.success,
                        result.scrape_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                        result.error_message or ''
                    ]
                    writer.writerow(row)
            
            # Get CSV content and return
            response.write(output.getvalue())
            output.close()
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def generate_ai_report(self, request, pk=None):
        """Generate AI-powered report for job results"""
        
        try:
            job = self.get_object()
            
            # Import the AI report service
            from .ai_report_service import AIReportGenerator
            
            # Generate the report
            report_generator = AIReportGenerator()
            result = report_generator.generate_report(job.id)
            
            if result.get('success'):
                # Return PDF as downloadable file
                response = HttpResponse(result['pdf_data'], content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{result["filename"]}"'
                return response
            else:
                return Response(
                    {'error': result.get('error', 'Failed to generate report')}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Report generation failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def ai_analysis_view(request):
    """Generate AI analysis for text content"""
    
    if request.method == 'POST':
        try:
            import json
            data = json.loads(request.body)
            prompt = data.get('prompt', '')
            platform = data.get('platform', 'unknown')
            analyzed_posts = data.get('analyzed_posts', 0)
            
            if not prompt:
                return JsonResponse({
                    'success': False,
                    'error': 'Prompt is required'
                }, status=400)
            
            # Import the AI report service
            from .ai_report_service import AIReportGenerator
            
            # Generate AI analysis using OpenAI
            report_generator = AIReportGenerator()
            
            try:
                response = report_generator.client.chat.completions.create(
                    model="gpt-4o-mini",
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
                
                return JsonResponse({
                    'success': True,
                    'analysis': response.choices[0].message.content,
                    'platform': platform,
                    'analyzed_posts': analyzed_posts,
                    'total_characters': len(prompt)
                })
                
            except Exception as e:
                return JsonResponse({
                    'success': False,
                    'error': str(e),
                    'platform': platform,
                    'analyzed_posts': analyzed_posts
                })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Analysis failed: {str(e)}'
            }, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


def enhanced_sentiment_analysis_view(request):
    """Enhanced sentiment analysis using OpenAI for job results"""
    
    if request.method == 'POST':
        try:
            import json
            data = json.loads(request.body)
            job_id = data.get('job_id')
            
            if not job_id:
                return JsonResponse({
                    'success': False,
                    'error': 'Job ID is required'
                }, status=400)
            
            # Get job results
            from .models import ScrapyJob, ScrapyResult
            try:
                job = ScrapyJob.objects.get(id=job_id)
                results = ScrapyResult.objects.filter(job=job, success=True)
                
                if not results.exists():
                    return JsonResponse({
                        'success': False,
                        'error': 'No results found for this job'
                    })
                
                # Extract posts and comments from results
                all_content = []
                posts_with_sentiment = []
                
                for result in results:
                    if result.scraped_data:
                        scraped_data = result.scraped_data
                        if isinstance(scraped_data, list):
                            posts = scraped_data
                        else:
                            posts = [scraped_data]
                        
                        for post in posts:
                            if isinstance(post, dict):
                                # Extract main content (caption/text)
                                main_text = ""
                                text_fields = ['caption', 'text', 'content', 'description', 'post_text']
                                for field in text_fields:
                                    if field in post and post[field]:
                                        main_text = str(post[field])
                                        break
                                
                                # Extract comments
                                comments_text = []
                                if 'comments' in post and isinstance(post['comments'], list):
                                    for comment in post['comments']:
                                        if isinstance(comment, dict) and 'text' in comment:
                                            comments_text.append(str(comment['text']))
                                        elif isinstance(comment, str):
                                            comments_text.append(comment)
                                
                                # Combine text for analysis
                                combined_text = main_text
                                if comments_text:
                                    # Limit comments to prevent token overflow
                                    top_comments = comments_text[:10]  # Top 10 comments
                                    combined_text += " COMMENTS: " + " ".join(top_comments)
                                
                                if combined_text.strip():
                                    all_content.append({
                                        'text': combined_text,
                                        'post_data': post,
                                        'main_text': main_text,
                                        'comments_count': len(comments_text)
                                    })
                
                if not all_content:
                    return JsonResponse({
                        'success': False,
                        'error': 'No text content found for analysis'
                    })
                
                # Batch sentiment analysis with OpenAI
                from .ai_report_service import AIReportGenerator
                report_generator = AIReportGenerator()
                
                # Process in batches to avoid token limits
                batch_size = 10
                sentiment_results = []
                
                for i in range(0, len(all_content), batch_size):
                    batch = all_content[i:i + batch_size]
                    batch_texts = [item['text'][:1000] for item in batch]  # Limit text length
                    
                    prompt = f"""
                    Analyze the sentiment of the following social media posts and their comments. 
                    For each post, classify the overall sentiment as either "positive", "negative", or "neutral".
                    Consider both the main post content and the comments when determining sentiment.
                    
                    Respond with only a JSON array in this exact format:
                    [
                        {{"sentiment": "positive"}},
                        {{"sentiment": "neutral"}},
                        {{"sentiment": "negative"}}
                    ]
                    
                    Posts to analyze:
                    {chr(10).join([f"{idx+1}. {text}" for idx, text in enumerate(batch_texts)])}
                    """
                    
                    try:
                        response = report_generator.client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[
                                {
                                    "role": "system",
                                    "content": "You are a sentiment analysis expert. Respond only with valid JSON arrays containing sentiment classifications."
                                },
                                {
                                    "role": "user",
                                    "content": prompt
                                }
                            ],
                            max_tokens=500,
                            temperature=0.3
                        )
                        
                        # Parse OpenAI response
                        ai_response = response.choices[0].message.content.strip()
                        
                        # Clean up response to extract JSON
                        if ai_response.startswith('```json'):
                            ai_response = ai_response[7:-3]
                        elif ai_response.startswith('```'):
                            ai_response = ai_response[3:-3]
                        
                        batch_sentiments = json.loads(ai_response)
                        
                        # Combine with post data
                        for j, item in enumerate(batch):
                            if j < len(batch_sentiments):
                                sentiment_results.append({
                                    **item['post_data'],
                                    'sentiment': batch_sentiments[j]['sentiment'],
                                    'main_text': item['main_text'],
                                    'comments_count': item['comments_count']
                                })
                    
                    except Exception as batch_error:
                        # Fallback to simple sentiment analysis for this batch
                        for item in batch:
                            simple_sentiment = simple_sentiment_analysis(item['text'])
                            sentiment_results.append({
                                **item['post_data'],
                                'sentiment': simple_sentiment,
                                'main_text': item['main_text'],
                                'comments_count': item['comments_count']
                            })
                
                # Calculate sentiment statistics
                sentiment_stats = {
                    'positive': len([p for p in sentiment_results if p['sentiment'] == 'positive']),
                    'negative': len([p for p in sentiment_results if p['sentiment'] == 'negative']),
                    'neutral': len([p for p in sentiment_results if p['sentiment'] == 'neutral'])
                }
                
                return JsonResponse({
                    'success': True,
                    'posts': sentiment_results,
                    'sentiment_stats': sentiment_stats,
                    'total_posts': len(sentiment_results)
                })
                
            except ScrapyJob.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'error': 'Job not found'
                }, status=404)
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Analysis failed: {str(e)}'
            }, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


def simple_sentiment_analysis(text: str) -> str:
    """Fallback simple sentiment analysis"""
    positive_words = ['good', 'great', 'amazing', 'awesome', 'excellent', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'beautiful', 'nice', 'happy', 'excited', '❤️', '😍', '🥰', '😊', '👏', '🔥', '✨']
    negative_words = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disgusting', 'angry', 'disappointed', 'sad', '😢', '😡', '👎', '😞', '💔']
    
    if not text:
        return 'neutral'
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        return 'positive'
    elif negative_count > positive_count:
        return 'negative'
    else:
        return 'neutral'


class ScrapyResultViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for Scrapy results (read-only)"""
    
    queryset = ScrapyResult.objects.all()
    serializer_class = ScrapyResultSerializer
    permission_classes = [AllowAny]  # Temporarily disable authentication for testing
    
    def get_queryset(self):
        queryset = ScrapyResult.objects.all()
        job_id = self.request.query_params.get('job_id')
        platform = self.request.query_params.get('platform')
        
        if job_id:
            queryset = queryset.filter(job_id=job_id)
        if platform:
            queryset = queryset.filter(job__config__platform=platform)
        return queryset


def scraping_dashboard(request):
    """Dashboard view for scraping jobs"""
    
    if request.method == 'GET':
        jobs = ScrapyJob.objects.filter(project__users=request.user).order_by('-created_at')[:10]
        
        dashboard_data = {
            'total_jobs': jobs.count(),
            'running_jobs': jobs.filter(status='running').count(),
            'completed_jobs': jobs.filter(status='completed').count(),
            'failed_jobs': jobs.filter(status='failed').count(),
            'recent_jobs': []
        }
        
        for job in jobs:
            dashboard_data['recent_jobs'].append({
                'id': job.id,
                'name': job.name,
                'platform': job.config.platform,
                'status': job.status,
                'progress': (job.processed_urls / job.total_urls * 100) if job.total_urls > 0 else 0,
                'created_at': job.created_at,
                'completed_at': job.completed_at
            })
        
        return JsonResponse(dashboard_data)


def platform_stats(request):
    """Get scraping statistics by platform"""
    
    from django.db.models import Count, Q
    
    stats = ScrapyJob.objects.values('config__platform').annotate(
        total_jobs=Count('id'),
        completed_jobs=Count('id', filter=Q(status='completed')),
        running_jobs=Count('id', filter=Q(status='running')),
        failed_jobs=Count('id', filter=Q(status='failed'))
    )
    
    return JsonResponse({'stats': list(stats)})
