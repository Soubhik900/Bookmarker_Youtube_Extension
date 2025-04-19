// Background script for YouTube Timestamp Bookmarker

// Listen for install event to set up initial storage
chrome.runtime.onInstalled.addListener(() => {
    // Initialize the storage for bookmarks if it doesn't exist
    chrome.storage.local.get('youtubeBookmarks', (result) => {
      if (!result.youtubeBookmarks) {
        chrome.storage.local.set({ youtubeBookmarks: {} });
      }
    });
  });
  
  // Listen for messages from content scripts or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentTab') {
      // Get the current active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          sendResponse({ tab: tabs[0] });
        } else {
          sendResponse({ tab: null });
        }
      });
      return true; // Required for async sendResponse
    }
    
    if (request.action === 'jumpToTimestamp') {
      // Send message to content script of the specified tab
      chrome.tabs.sendMessage(request.tabId, {
        action: 'jumpToTimestamp',
        timestamp: request.timestamp
      });
    }
  });
  