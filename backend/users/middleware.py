from django.http import HttpResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class EmptyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response
