from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.http import HttpResponse
from django.utils import timezone
import json
import random
import time
from datetime import datetime, timedelta
import csv
from .models import ReportTemplate, GeneratedReport
from rest_framework import serializers

# Serializers
class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = '__all__'

class GeneratedReportSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    template_type = serializers.CharField(source='template.template_type', read_only=True)
    
    class Meta:
        model = GeneratedReport
        fields = '__all__'

# ViewSets
class ReportTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for browsing available report templates
    """
    queryset = ReportTemplate.objects.filter(is_active=True)
    serializer_class = ReportTemplateSerializer
    
    def list(self, request):
        """
        List all available report templates in marketplace format
        """
        templates = self.get_queryset()
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

class GeneratedReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing generated reports
    """
    queryset = GeneratedReport.objects.all()
    serializer_class = GeneratedReportSerializer
    
    def get_queryset(self):
        # Filter by user if authentication is implemented
        return GeneratedReport.objects.all().order_by('-created_at')
    
    @action(detail=False, methods=['POST'])
    def generate_report(self, request):
        """
        Generate a report based on selected template and configuration
        """
        try:
            template_id = request.data.get('template_id')
            title = request.data.get('title', '')
            configuration = request.data.get('configuration', {})
            
            if not template_id:
                return Response(
                    {'error': 'Template ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                template = ReportTemplate.objects.get(id=template_id)
            except ReportTemplate.DoesNotExist:
                return Response(
                    {'error': 'Template not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create the report record
            report = GeneratedReport.objects.create(
                title=title or f"{template.name} Report",
                template=template,
                configuration=configuration,
                status='processing'
            )
            
            # Process the report based on template type
            try:
                if template.template_type == 'sentiment_analysis':
                    self._process_sentiment_analysis(report)
                elif template.template_type == 'engagement_metrics':
                    self._process_engagement_metrics(report)
                else:
                    # Default processing for other types
                    self._process_default_template(report)
                
                report.status = 'completed'
                report.completed_at = timezone.now()
                
            except Exception as e:
                report.status = 'failed'
                report.error_message = str(e)
            
            report.save()
            
            serializer = GeneratedReportSerializer(report)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Error generating report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_sentiment_analysis(self, report):
        """
        Process sentiment analysis using sample comment data
        """
        start_time = time.time()
        
        # Sample comments data for demo (simulating database queries)
        sample_comments = [
            "That's the facelifted Leon. Is that a hint of what's to come in 2025 ? 😀",
            "Bring in the Terramar !",
            "Congratulations for a great launch!",
            "😍",
            "🔥🔥",
            "🔥🔥🔥🎥",
            "Can't wait to get mine! Bought the Cupra Tavascan VZ!",
            "🔥🔥",
            "the effort 🤯",
            "Amazing design and performance! Love it!",
            "Not impressed with the pricing",
            "Beautiful car but too expensive for what it offers",
            "Outstanding quality and features",
            "This is exactly what I was looking for!",
            "Disappointed with the color options",
            "Excellent customer service experience",
            "The wait time was too long",
            "Incredible value for money",
            "Poor build quality noticed",
            "Absolutely love the new features!"
        ]
        
        # Simulate sentiment analysis processing
        time.sleep(1)  # Simulate processing time
        
        positive_words = ['love', 'amazing', 'excellent', 'outstanding', 'incredible', 'congratulations', '😍', '🔥', 'beautiful']
        negative_words = ['disappointed', 'poor', 'expensive', 'not impressed', 'too long']
        
        sentiment_results = []
        sentiment_counts = {'positive': 0, 'negative': 0, 'neutral': 0}
        
        for i, comment in enumerate(sample_comments):
            comment_lower = comment.lower()
            
            # Simple sentiment analysis logic
            positive_score = sum(1 for word in positive_words if word in comment_lower)
            negative_score = sum(1 for word in negative_words if word in comment_lower)
            
            if positive_score > negative_score:
                sentiment = 'positive'
                confidence = min(0.6 + positive_score * 0.2, 0.95)
            elif negative_score > positive_score:
                sentiment = 'negative'
                confidence = min(0.6 + negative_score * 0.2, 0.95)
            else:
                sentiment = 'neutral'
                confidence = random.uniform(0.5, 0.8)
            
            sentiment_counts[sentiment] += 1
            
            sentiment_results.append({
                'id': i + 1,
                'comment': comment,
                'sentiment': sentiment,
                'confidence': round(confidence, 2),
                'timestamp': (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat()
            })
        
        # Calculate metrics
        total_comments = len(sample_comments)
        sentiment_distribution = {
            'positive': round((sentiment_counts['positive'] / total_comments) * 100, 1),
            'negative': round((sentiment_counts['negative'] / total_comments) * 100, 1),
            'neutral': round((sentiment_counts['neutral'] / total_comments) * 100, 1)
        }
        
        # Trending keywords (mock data)
        trending_keywords = [
            {'keyword': 'design', 'count': 8, 'sentiment': 'positive'},
            {'keyword': 'price', 'count': 6, 'sentiment': 'negative'},
            {'keyword': 'quality', 'count': 5, 'sentiment': 'positive'},
            {'keyword': 'features', 'count': 4, 'sentiment': 'positive'},
            {'keyword': 'service', 'count': 3, 'sentiment': 'positive'},
        ]
        
        processing_time = time.time() - start_time
        
        # Store results
        report.results = {
            'summary': {
                'total_comments_analyzed': total_comments,
                'sentiment_distribution': sentiment_distribution,
                'overall_sentiment': max(sentiment_counts, key=sentiment_counts.get),
                'confidence_average': round(sum(r['confidence'] for r in sentiment_results) / total_comments, 2)
            },
            'detailed_analysis': sentiment_results,
            'trending_keywords': trending_keywords,
            'insights': [
                f"📈 {sentiment_distribution['positive']}% of comments show positive sentiment",
                f"📊 Most mentioned topic: design and quality",
                f"⚠️ Price concerns mentioned in {sentiment_distribution['negative']}% of negative comments",
                f"🎯 High engagement with emoji usage indicates strong emotional response"
            ],
            'recommendations': [
                "Focus marketing on design and quality aspects",
                "Address pricing concerns in future communications",
                "Leverage positive feedback for testimonials",
                "Monitor trending keywords for content strategy"
            ]
        }
        
        report.data_source_count = total_comments
        report.processing_time = processing_time
    
    def _process_engagement_metrics(self, report):
        """
        Process engagement metrics using sample data
        """
        start_time = time.time()
        time.sleep(0.8)  # Simulate processing
        
        # Sample engagement data
        engagement_data = {
            'total_posts': 45,
            'total_likes': 2847,
            'total_comments': 156,
            'total_shares': 89,
            'average_engagement_rate': 4.2,
            'top_performing_posts': [
                {'title': 'New Cupra Launch Event', 'likes': 342, 'comments': 28, 'shares': 15},
                {'title': 'Behind the Scenes Video', 'likes': 289, 'comments': 19, 'shares': 12},
                {'title': 'Customer Testimonial', 'likes': 256, 'comments': 34, 'shares': 8}
            ]
        }
        
        processing_time = time.time() - start_time
        
        report.results = engagement_data
        report.data_source_count = engagement_data['total_posts']
        report.processing_time = processing_time
    
    def _process_default_template(self, report):
        """
        Default processing for other template types
        """
        start_time = time.time()
        time.sleep(0.5)  # Simulate processing
        
        processing_time = time.time() - start_time
        
        report.results = {
            'message': f'Report generated successfully for {report.template.name}',
            'placeholder_data': True,
            'note': 'This is a placeholder result for demo purposes'
        }
        report.data_source_count = 100  # Mock data count
        report.processing_time = processing_time
    
    @action(detail=True, methods=['GET'])
    def download_csv(self, request, pk=None):
        """
        Download report results as CSV
        """
        try:
            report = self.get_object()
            
            if report.status != 'completed':
                return Response(
                    {'error': 'Report is not completed yet'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{report.title.replace(" ", "_")}_{report.id}.csv"'
            
            writer = csv.writer(response)
            
            if report.template.template_type == 'sentiment_analysis':
                # Write sentiment analysis CSV
                writer.writerow(['Comment ID', 'Comment Text', 'Sentiment', 'Confidence', 'Timestamp'])
                
                for item in report.results.get('detailed_analysis', []):
                    writer.writerow([
                        item['id'],
                        item['comment'],
                        item['sentiment'],
                        item['confidence'],
                        item['timestamp']
                    ])
            else:
                # Generic CSV export
                writer.writerow(['Key', 'Value'])
                for key, value in report.results.items():
                    writer.writerow([key, str(value)])
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Error downloading CSV: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
