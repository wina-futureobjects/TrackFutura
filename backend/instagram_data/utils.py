"""
Utility functions for Instagram data processing
"""

import sys
import logging

def safe_print(message, use_logging=False):
    """
    Safely print messages to console, handling Unicode encoding issues on Windows
    
    Args:
        message: The message to print
        use_logging: If True, use logging instead of print (recommended for production)
    """
    try:
        if use_logging:
            logging.info(message)
        else:
            print(message)
    except UnicodeEncodeError:
        # Fall back to ASCII-safe output
        try:
            safe_message = str(message).encode('ascii', errors='replace').decode('ascii')
            if use_logging:
                logging.info(safe_message)
            else:
                print(safe_message)
        except Exception:
            # Last resort: basic message
            fallback_message = f"[Message contains Unicode characters - length: {len(str(message))}]"
            if use_logging:
                logging.info(fallback_message)
            else:
                print(fallback_message)

def configure_console_encoding():
    """
    Configure console encoding for better Unicode support on Windows
    Call this at the start of management commands or scripts
    """
    try:
        if sys.platform.startswith('win'):
            # Try to set UTF-8 encoding on Windows
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')
    except Exception:
        # If encoding setup fails, just continue - safe_print will handle it
        pass 