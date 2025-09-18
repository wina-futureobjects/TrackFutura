from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import ChatThread, ChatMessage
from .serializers import ChatThreadSerializer, ChatMessageSerializer

class ChatThreadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing chat threads
    """
    serializer_class = ChatThreadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatThread.objects.filter(user=self.request.user, is_active=True)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['POST'])
    def add_message(self, request, pk=None):
        """
        Add a new message to the thread
        """
        thread = self.get_object()
        serializer = ChatMessageSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(thread=thread)
            # Update thread's updated_at timestamp
            thread.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['POST'])
    def archive(self, request, pk=None):
        """
        Archive (soft delete) a thread
        """
        thread = self.get_object()
        thread.is_active = False
        thread.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ChatMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing chat messages
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        thread_id = self.request.query_params.get('thread_id')
        if thread_id:
            thread = get_object_or_404(ChatThread, id=thread_id, user=self.request.user)
            return ChatMessage.objects.filter(thread=thread)
        return ChatMessage.objects.none() 