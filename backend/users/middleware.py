from django.http import HttpResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class CustomCsrfMiddleware:
    """
    🚨 COMPLETE CSRF BYPASS MIDDLEWARE 🚨

    This middleware completely replaces Django's CSRF middleware
    and allows ALL requests without any CSRF validation.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        logger.info("🚨 CSRF COMPLETELY DISABLED - NO VALIDATION ANYWHERE")

    def __call__(self, request):
        # Process the request normally
        response = self.get_response(request)
        return response

    def process_view(self, request, callback, callback_args, callback_kwargs):
        """
        🚨 COMPLETE BYPASS - ALLOW ALL REQUESTS 🚨

        This completely replaces Django's CSRF checking.
        Always returns None to allow the request to proceed.
        """
        # Add dummy CSRF attributes to prevent any issues
        request.csrf_processing_done = True
        request.csrf_cookie_needs_reset = False

        # Add dummy CSRF token to request META (using only allowed characters)
        request.META['CSRF_COOKIE'] = 'bypasstoken'
        request.META['HTTP_X_CSRFTOKEN'] = 'bypasstoken'

        # Always allow the request to proceed
        return None

    def process_request(self, request):
        """
        Prepare request to bypass all CSRF checks
        """
        # Mark CSRF as processed to prevent Django from checking it
        request.csrf_processing_done = True
        request.csrf_cookie_needs_reset = False

        # Add dummy CSRF token (using only allowed characters)
        request.META['CSRF_COOKIE'] = 'bypasstoken'
        request.META['HTTP_X_CSRFTOKEN'] = 'bypasstoken'

        return None

    def process_response(self, request, response):
        """
        Process response without any CSRF modifications
        """
        return response
