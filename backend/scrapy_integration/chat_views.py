import time
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
import json
import logging

from chat.models import ChatThread, ChatMessage
from .ai_analysis_chat_service import ai_chat_service
from users.models import Project

logger = logging.getLogger(__name__)


class ChatThreadViewSet(viewsets.ModelViewSet):
    """API endpoints for chat threads"""
    
    permission_classes = [AllowAny]  # Temporarily disable authentication for testing
    
    def get_queryset(self):
        project_id = self.request.query_params.get('project_id')
        queryset = ChatThread.objects.all()
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        return queryset.prefetch_related('messages')
    
    def get_serializer_class(self):
        # Return basic serializer structure
        return type('ChatThreadSerializer', (), {
            'Meta': type('Meta', (), {'model': ChatThread, 'fields': '__all__'})
        })
    
    def create(self, request):
        """Create a new chat thread"""
        try:
            project_id = request.data.get('project_id', 9)  # Default to project 9
            
            # Verify project exists
            project = get_object_or_404(Project, id=project_id)
            
            # Create new thread
            thread = ChatThread.objects.create(
                project=project,
                user_id=1,  # Default user for now
                title=None,  # Will be set based on first message
                is_active=True
            )
            
            return Response({
                'id': str(thread.id),
                'title': thread.title,
                'project_id': thread.project.id,
                'created_at': thread.created_at.isoformat(),
                'updated_at': thread.updated_at.isoformat(),
                'is_active': thread.is_active,
                'messages': [],
                'last_message': None
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating chat thread: {str(e)}")
            return Response(
                {'error': f'Failed to create chat thread: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def list(self, request):
        """List all chat threads for a project"""
        try:
            project_id = request.query_params.get('project_id', 9)
            threads = ChatThread.objects.filter(project_id=project_id).prefetch_related('messages')
            
            threads_data = []
            for thread in threads:
                last_message = thread.last_message
                last_message_data = None
                if last_message:
                    last_message_data = {
                        'id': str(last_message.id),
                        'content': last_message.content,
                        'sender': last_message.sender,
                        'timestamp': last_message.timestamp.isoformat(),
                        'is_error': last_message.is_error
                    }
                
                threads_data.append({
                    'id': str(thread.id),
                    'title': thread.title,
                    'project_id': thread.project.id,
                    'created_at': thread.created_at.isoformat(),
                    'updated_at': thread.updated_at.isoformat(),
                    'is_active': thread.is_active,
                    'messages': [],  # Don't load all messages in list view
                    'last_message': last_message_data
                })
            
            return Response(threads_data)
            
        except Exception as e:
            logger.error(f"Error listing chat threads: {str(e)}")
            return Response(
                {'error': f'Failed to list chat threads: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """Get a specific chat thread with all messages"""
        try:
            thread = get_object_or_404(ChatThread, id=pk)
            messages = thread.messages.all()
            
            messages_data = []
            for message in messages:
                messages_data.append({
                    'id': str(message.id),
                    'content': message.content,
                    'sender': message.sender,
                    'timestamp': message.timestamp.isoformat(),
                    'is_error': message.is_error,
                    'tokens_used': message.tokens_used,
                    'response_time': message.response_time,
                    'data_context': message.data_context
                })
            
            last_message = thread.last_message
            last_message_data = None
            if last_message:
                last_message_data = {
                    'id': str(last_message.id),
                    'content': last_message.content,
                    'sender': last_message.sender,
                    'timestamp': last_message.timestamp.isoformat(),
                    'is_error': last_message.is_error
                }
            
            return Response({
                'id': str(thread.id),
                'title': thread.title,
                'project_id': thread.project.id,
                'created_at': thread.created_at.isoformat(),
                'updated_at': thread.updated_at.isoformat(),
                'is_active': thread.is_active,
                'messages': messages_data,
                'last_message': last_message_data
            })
            
        except Exception as e:
            logger.error(f"Error retrieving chat thread: {str(e)}")
            return Response(
                {'error': f'Failed to retrieve chat thread: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        """Add a message to a chat thread and get AI response"""
        try:
            thread = get_object_or_404(ChatThread, id=pk)
            content = request.data.get('content', '').strip()
            sender = request.data.get('sender', 'user')
            
            if not content:
                return Response(
                    {'error': 'Message content is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_time = time.time()
            
            # Add user message
            user_message = ChatMessage.objects.create(
                thread=thread,
                content=content,
                sender=sender,
                is_error=False
            )
            
            # Update thread title if this is the first message
            if not thread.title and sender == 'user':
                # Use first 50 characters as title
                thread.title = content[:50] + ('...' if len(content) > 50 else '')
                thread.save()
            
            # If it's a user message, generate AI response
            if sender == 'user':
                try:
                    # Get AI response using the new service
                    ai_result = ai_chat_service.analyze_with_ai(content, thread.project.id)
                    response_time = time.time() - start_time
                    
                    if ai_result.get('success'):
                        # Create AI response message
                        ai_message = ChatMessage.objects.create(
                            thread=thread,
                            content=ai_result.get('response', 'Sorry, I could not generate a response.'),
                            sender='ai',
                            is_error=False,
                            tokens_used=ai_result.get('tokens_used'),
                            response_time=response_time,
                            data_context=ai_result.get('data_context')
                        )
                        
                        # Update thread timestamp
                        thread.save()
                        
                        return Response({
                            'user_message': {
                                'id': str(user_message.id),
                                'content': user_message.content,
                                'sender': user_message.sender,
                                'timestamp': user_message.timestamp.isoformat(),
                                'is_error': user_message.is_error
                            },
                            'ai_message': {
                                'id': str(ai_message.id),
                                'content': ai_message.content,
                                'sender': ai_message.sender,
                                'timestamp': ai_message.timestamp.isoformat(),
                                'is_error': ai_message.is_error,
                                'tokens_used': ai_message.tokens_used,
                                'response_time': ai_message.response_time,
                                'data_context': ai_message.data_context
                            }
                        })
                    else:
                        # Create error AI response
                        error_message = ai_result.get('error', 'An error occurred while processing your request.')
                        ai_message = ChatMessage.objects.create(
                            thread=thread,
                            content=f"I apologize, but I encountered an error: {error_message}",
                            sender='ai',
                            is_error=True,
                            response_time=response_time
                        )
                        
                        thread.save()
                        
                        return Response({
                            'user_message': {
                                'id': str(user_message.id),
                                'content': user_message.content,
                                'sender': user_message.sender,
                                'timestamp': user_message.timestamp.isoformat(),
                                'is_error': user_message.is_error
                            },
                            'ai_message': {
                                'id': str(ai_message.id),
                                'content': ai_message.content,
                                'sender': ai_message.sender,
                                'timestamp': ai_message.timestamp.isoformat(),
                                'is_error': ai_message.is_error,
                                'response_time': ai_message.response_time
                            }
                        })
                        
                except Exception as ai_error:
                    logger.error(f"AI analysis error: {str(ai_error)}")
                    
                    # Create fallback AI response
                    ai_message = ChatMessage.objects.create(
                        thread=thread,
                        content=f"I'm sorry, I'm having technical difficulties right now. Please try again later. Error: {str(ai_error)}",
                        sender='ai',
                        is_error=True,
                        response_time=time.time() - start_time
                    )
                    
                    thread.save()
                    
                    return Response({
                        'user_message': {
                            'id': str(user_message.id),
                            'content': user_message.content,
                            'sender': user_message.sender,
                            'timestamp': user_message.timestamp.isoformat(),
                            'is_error': user_message.is_error
                        },
                        'ai_message': {
                            'id': str(ai_message.id),
                            'content': ai_message.content,
                            'sender': ai_message.sender,
                            'timestamp': ai_message.timestamp.isoformat(),
                            'is_error': ai_message.is_error,
                            'response_time': ai_message.response_time
                        }
                    })
            
            else:
                # Just return the created message for AI messages
                thread.save()
                return Response({
                    'id': str(user_message.id),
                    'content': user_message.content,
                    'sender': user_message.sender,
                    'timestamp': user_message.timestamp.isoformat(),
                    'is_error': user_message.is_error
                })
            
        except Exception as e:
            logger.error(f"Error adding message: {str(e)}")
            return Response(
                {'error': f'Failed to add message: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a chat thread"""
        try:
            thread = get_object_or_404(ChatThread, id=pk)
            thread.is_active = False
            thread.save()
            
            return Response({'message': 'Thread archived successfully'})
            
        except Exception as e:
            logger.error(f"Error archiving thread: {str(e)}")
            return Response(
                {'error': f'Failed to archive thread: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


def ai_chat_analysis_view(request):
    """Direct AI analysis endpoint for standalone queries"""
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            question = data.get('question', '').strip()
            project_id = data.get('project_id', 9)  # Default to project 9
            
            if not question:
                return JsonResponse({
                    'success': False,
                    'error': 'Question is required'
                }, status=400)
            
            start_time = time.time()
            
            # Get AI analysis
            result = ai_chat_service.analyze_with_ai(question, project_id)
            response_time = time.time() - start_time
            
            if result.get('success'):
                return JsonResponse({
                    'success': True,
                    'response': result.get('response'),
                    'data_context': result.get('data_context'),
                    'tokens_used': result.get('tokens_used'),
                    'response_time': response_time,
                    'project_id': project_id
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': result.get('error', 'Analysis failed'),
                    'response_time': response_time,
                    'project_id': project_id
                })
                
        except Exception as e:
            logger.error(f"Direct AI analysis error: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': f'Analysis failed: {str(e)}'
            }, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


def project_data_summary_view(request):
    """Get comprehensive data summary for a project"""
    
    if request.method == 'GET':
        try:
            project_id = request.GET.get('project_id', 9)
            
            # Get data summary
            data_summary = ai_chat_service.get_project_scraped_data(int(project_id))
            
            if data_summary.get('error'):
                return JsonResponse({
                    'success': False,
                    'error': data_summary['error']
                }, status=400)
            
            return JsonResponse({
                'success': True,
                'data_summary': data_summary,
                'project_id': project_id
            })
            
        except Exception as e:
            logger.error(f"Data summary error: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': f'Failed to get data summary: {str(e)}'
            }, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)