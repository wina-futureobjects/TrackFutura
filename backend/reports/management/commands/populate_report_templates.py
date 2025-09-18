from django.core.management.base import BaseCommand
from reports.models import ReportTemplate

class Command(BaseCommand):
    help = 'Populate the database with sample report templates for the marketplace'

    def handle(self, *args, **options):
        templates = [
            {
                'name': 'Sentiment Analysis',
                'description': 'Analyze the sentiment of comments and feedback to understand public opinion about your brand, products, or campaigns. Get insights into positive, negative, and neutral responses.',
                'template_type': 'sentiment_analysis',
                'icon': 'psychology',
                'color': '#4caf50',
                'estimated_time': '2-5 minutes',
                'required_data_types': ['comments', 'reviews'],
                'features': [
                    'Positive/Negative/Neutral classification',
                    'Confidence scores for each sentiment',
                    'Trending keywords analysis',
                    'Actionable insights and recommendations',
                    'Export to CSV for further analysis'
                ]
            },
            {
                'name': 'Engagement Metrics',
                'description': 'Track and analyze engagement rates across your social media posts. Understand what content resonates most with your audience.',
                'template_type': 'engagement_metrics',
                'icon': 'trending_up',
                'color': '#2196f3',
                'estimated_time': '1-3 minutes',
                'required_data_types': ['posts', 'likes', 'comments', 'shares'],
                'features': [
                    'Engagement rate calculation',
                    'Top performing posts identification',
                    'Post type performance comparison',
                    'Optimal posting time analysis',
                    'Audience interaction patterns'
                ]
            },
            {
                'name': 'Content Analysis',
                'description': 'Deep dive into your content performance and discover what types of posts drive the most engagement and reach.',
                'template_type': 'content_analysis',
                'icon': 'article',
                'color': '#ff9800',
                'estimated_time': '3-7 minutes',
                'required_data_types': ['posts', 'images', 'videos'],
                'features': [
                    'Content type performance breakdown',
                    'Hashtag effectiveness analysis',
                    'Visual content impact assessment',
                    'Caption length optimization',
                    'Content themes identification'
                ]
            },
            {
                'name': 'User Behavior Analysis',
                'description': 'Understand how users interact with your content and identify patterns in user engagement and demographics.',
                'template_type': 'user_behavior',
                'icon': 'people',
                'color': '#9c27b0',
                'estimated_time': '4-8 minutes',
                'required_data_types': ['users', 'interactions', 'demographics'],
                'features': [
                    'User engagement patterns',
                    'Demographic breakdowns',
                    'Peak activity times',
                    'User journey mapping',
                    'Loyalty and retention metrics'
                ]
            },
            {
                'name': 'Trend Analysis',
                'description': 'Identify emerging trends in your industry and track how your content aligns with current market interests.',
                'template_type': 'trend_analysis',
                'icon': 'show_chart',
                'color': '#607d8b',
                'estimated_time': '5-10 minutes',
                'required_data_types': ['hashtags', 'keywords', 'mentions'],
                'features': [
                    'Trending topics identification',
                    'Hashtag performance tracking',
                    'Industry benchmark comparison',
                    'Seasonal trend analysis',
                    'Viral content characteristics'
                ]
            },
            {
                'name': 'Competitive Analysis',
                'description': 'Compare your performance against competitors and identify opportunities for improvement in your social media strategy.',
                'template_type': 'competitive_analysis',
                'icon': 'compare_arrows',
                'color': '#f44336',
                'estimated_time': '6-12 minutes',
                'required_data_types': ['competitor_data', 'benchmarks'],
                'features': [
                    'Competitor performance comparison',
                    'Market share analysis',
                    'Content strategy gaps',
                    'Engagement rate benchmarking',
                    'Growth opportunity identification'
                ]
            }
        ]

        created_count = 0
        updated_count = 0

        for template_data in templates:
            template, created = ReportTemplate.objects.get_or_create(
                name=template_data['name'],
                template_type=template_data['template_type'],
                defaults=template_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Created template: {template.name}')
                )
            else:
                # Update existing template with new data
                for key, value in template_data.items():
                    setattr(template, key, value)
                template.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'🔄 Updated template: {template.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Successfully processed {len(templates)} templates:'
                f'\n   📦 {created_count} created'
                f'\n   🔄 {updated_count} updated'
            )
        ) 