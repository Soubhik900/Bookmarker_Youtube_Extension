// Content script for YouTube Timestamp Bookmarker

// Global variables
let youtubePlayer;
let currentVideoId = '';
let bookmarkButton = null;

// Initialize when the page is fully loaded
window.addEventListener('load', () => {
  // Check if we're on a YouTube watch page
  if (window.location.href.includes('youtube.com/watch')) {
    initializeBookmarker();
  }
});

// Re-initialize when URL changes (for single-page app navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (window.location.href.includes('youtube.com/watch')) {
      // Remove existing button if present
      if (bookmarkButton) {
        bookmarkButton.remove();
        bookmarkButton = null;
      }
      // Wait a moment for YouTube's player to initialize
      setTimeout(initializeBookmarker, 1500);
    }
  }
}).observe(document, { subtree: true, childList: true });

// Function to extract video ID from URL
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Function to format seconds into MM:SS format
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Function to parse timestamp string back to seconds
function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}

// Main initialization function
function initializeBookmarker() {
  // Get the current video ID
  currentVideoId = getVideoId();
  if (!currentVideoId) return;

  // Find the YouTube player
  youtubePlayer = document.querySelector('.html5-video-player');
  if (!youtubePlayer) return;

  // Find the right controls section
  const rightControls = document.querySelector('.ytp-right-controls');
  if (!rightControls) return;

  // Create bookmark button if not already present
  if (!bookmarkButton) {
    bookmarkButton = document.createElement('button');
    bookmarkButton.className = 'ytp-button youtube-bookmarker-btn';
    bookmarkButton.title = 'Bookmark this timestamp';
    bookmarkButton.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="white"/>
      </svg>
    `;
    bookmarkButton.style.width = '48px';
    bookmarkButton.style.height = '48px';
    bookmarkButton.style.display = 'flex';
    bookmarkButton.style.alignItems = 'center';
    bookmarkButton.style.justifyContent = 'center';
    
    bookmarkButton.addEventListener('click', handleBookmarkClick);
    
    // Insert the button before the first child of the right controls
    rightControls.insertBefore(bookmarkButton, rightControls.firstChild);
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentTime') {
      const video = document.querySelector('video');
      if (video) {
        sendResponse({ time: video.currentTime, formattedTime: formatTime(video.currentTime) });
      } else {
        sendResponse({ time: 0, formattedTime: '0:00' });
      }
      return true;
    }
    
    if (request.action === 'jumpToTimestamp') {
      const video = document.querySelector('video');
      if (video && request.timestamp) {
        const seconds = parseTimeToSeconds(request.timestamp);
        video.currentTime = seconds;
        video.play();
      }
    }
  });
}

// Handle bookmark button click
function handleBookmarkClick() {
  const video = document.querySelector('video');
  if (!video || !currentVideoId) return;
  
  const currentTime = video.currentTime;
  const formattedTime = formatTime(currentTime);
  
  // Get existing bookmarks for this video
  chrome.storage.local.get('youtubeBookmarks', (result) => {
    const bookmarks = result.youtubeBookmarks || {};
    const videoBookmarks = bookmarks[currentVideoId] || [];
    
    // Check if this exact timestamp is already bookmarked
    const existingIndex = videoBookmarks.findIndex(b => Math.abs(b.time - currentTime) < 1); // Within 1 second
    
    if (existingIndex >= 0) {
      // If already bookmarked, show notification
      showNotification('This timestamp is already bookmarked');//
    } else {
      // Create a new bookmark
      const newBookmark = {
        time: currentTime,
        formattedTime: formattedTime,
        note: '',
        createdAt: Date.now()
      };
      
      // Add the new bookmark and sort by time
      videoBookmarks.push(newBookmark);
      videoBookmarks.sort((a, b) => a.time - b.time);
      
      // Update storage
      bookmarks[currentVideoId] = videoBookmarks;
      chrome.storage.local.set({ youtubeBookmarks: bookmarks }, () => {
        showNotification(`Bookmark added at ${formattedTime}`);
      });
    }
  });
}

// Function to show a temporary notification on the video
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'youtube-bookmarker-notification';
  notification.textContent = message;
  notification.style.position = 'absolute';
  notification.style.bottom = '70px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999';
  notification.style.fontSize = '14px';
  
  document.body.appendChild(notification);
  
  // Remove after 2 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 2000);
}
