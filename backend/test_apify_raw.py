#!/usr/bin/env python3
"""
Test script to run a simple Apify scraper and see raw output structure
"""
import os
import sys
from apify_client import ApifyClient
import json

# Test the actual Apify actors to see raw output
def test_apify_raw_output():
    """Test Apify actors directly to see their raw output structure"""
    
    client = ApifyClient(os.getenv('APIFY_TOKEN', 'your-apify-api-token'))
    
    print("Testing Apify Actors Raw Output")
    print("=" * 50)
    
    # Test TikTok scraper
    print("\n=== TESTING TIKTOK SCRAPER ===")
    try:
        # Test with a small run
        run_input = {
            "profiles": ["https://www.tiktok.com/@freefiremax"],
            "resultsPerPage": 2,  # Just 2 videos for testing
            "shouldDownloadCovers": False,
            "shouldDownloadSlideshowImages": False,
            "shouldDownloadSubtitles": False,
            "shouldDownloadVideos": False,
            # Enable comment extraction for sentiment analysis
            "shouldDownloadComments": True,
            "maxComments": 10,  # Just 10 comments for testing
            "proxy": {"useApifyProxy": True, "apifyProxyGroups": ["RESIDENTIAL"]},
            "extendOutputFunction": ""
        }
        
        print("Starting TikTok test run with comment extraction enabled...")
        run = client.actor('clockworks/free-tiktok-scraper').start(run_input=run_input)
        print(f"TikTok run started: {run['id']}")
        print("This will take a few minutes. Check Apify console for results.")
        print(f"Run URL: https://console.apify.com/actors/runs/{run['id']}")
        
    except Exception as e:
        print(f"TikTok test failed: {e}")
    
    # Test Facebook scraper
    print("\n=== TESTING FACEBOOK SCRAPER ===")
    try:
        # Test with a small run
        run_input = {
            "startUrls": [{"url": "https://www.facebook.com/FutureObjectsSolution"}],
            "maxPosts": 2,
            "extendOutputFunction": "",
            "customMapFunction": "",
            "language": "en-US",
            "proxy": {"useApifyProxy": True, "apifyProxyGroups": ["RESIDENTIAL"]},
            "onlyPostsNewerThan": "",
            "onlyPostsOlderThan": "",
            "scrollWaitSecs": 2,
            "commentsMode": "RANKED_UNFILTERED",  # Always enable comments
            "maxComments": 10,  # Just 10 comments for testing
            "maxCommentDepth": 1,
            "scrapeNestedComments": True
        }
        
        print("Starting Facebook test run with comment extraction enabled...")
        run = client.actor('apify/facebook-posts-scraper').start(run_input=run_input)
        print(f"Facebook run started: {run['id']}")
        print("This will take a few minutes. Check Apify console for results.")
        print(f"Run URL: https://console.apify.com/actors/runs/{run['id']}")
        
    except Exception as e:
        print(f"Facebook test failed: {e}")
    
    print("\nInstructions:")
    print("1. Wait for the runs to complete (5-10 minutes)")
    print("2. Check the Apify console URLs above")
    print("3. Look at the dataset output to see if comments are included")
    print("4. If comments are missing, the Apify actors might not support comment extraction")
    
    return True

if __name__ == "__main__":
    success = test_apify_raw_output()
    if success:
        print("\nTest runs initiated successfully!")
    else:
        print("\nTest failed!")