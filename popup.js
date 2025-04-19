// Popup script for YouTube Timestamp Bookmarker

// Global variables
let currentVideoId = '';
let currentTabId = '';
let currentVideoTitle = '';
let currentVideoUrl = '';

// DOM elements
const videoTitleElement = document.getElementById('video-title');
const videoLinkElement = document.getElementById('video-link');
const videoUrlElement = document.getElementById('video-url');
const bookmarksList = document.getElementById('bookmarks-list');
const noBookmarksMessage = document.getElementById('no-bookmarks-message');
const addBookmarkButton = document.getElementById('add-bookmark');
const clearAllButton = document.getElementById('clear-all');

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Get current tab information
  getCurrentTab();
  
  // Add event listeners
  addBookmarkButton.addEventListener('click', addCurrentTimeBookmark);
  clearAllButton.addEventListener('click', clearAllBookmarks);
});

// Get the current tab and check if it's a YouTube video
function getCurrentTab() {
  chrome.runtime.sendMessage({ action: 'getCurrentTab' }, (response) => {
    if (response && response.tab) {
      const tab = response.tab;
      currentTabId = tab.id;
      
      // Check if the current tab is a YouTube video
      if (tab.url.includes('youtube.com/watch')) {
        currentVideoUrl = tab.url;
        videoLinkElement.href = currentVideoUrl;
        currentVideoTitle = tab.title.replace(' - YouTube', '');
        videoTitleElement.textContent = currentVideoTitle;
        
        // Extract video ID from URL
        const urlObj = new URL(tab.url);
        currentVideoId = urlObj.searchParams.get('v');
        
        if (currentVideoId) {
          // Load bookmarks for this video
          loadBookmarks();
        } else {
          showNotYouTubeMessage();
        }
      } else {
        showNotYouTubeMessage();
      }
    } else {
      showErrorMessage();
    }
  });
}

// Show message when not on a YouTube video
function showNotYouTubeMessage() {
  videoTitleElement.textContent = 'Not a YouTube Video';
  videoUrlElement.classList.add('hidden');
  bookmarksList.innerHTML = '';
  noBookmarksMessage.textContent = 'Please navigate to a YouTube video to use this extension.';
  noBookmarksMessage.classList.remove('hidden');
  addBookmarkButton.disabled = true;
  clearAllButton.disabled = true;
}

// Show error message when tab info cannot be retrieved
function showErrorMessage() {
  videoTitleElement.textContent = 'Error';
  videoUrlElement.classList.add('hidden');
  bookmarksList.innerHTML = '';
  noBookmarksMessage.textContent = 'Could not access tab information.';
  noBookmarksMessage.classList.remove('hidden');
  addBookmarkButton.disabled = true;
  clearAllButton.disabled = true;
}

// Load bookmarks for the current video
function loadBookmarks() {
  chrome.storage.local.get('youtubeBookmarks', (result) => {
    const bookmarks = result.youtubeBookmarks || {};
    const videoBookmarks = bookmarks[currentVideoId] || [];
    
    if (videoBookmarks.length === 0) {
      // Show no bookmarks message
      noBookmarksMessage.classList.remove('hidden');
      bookmarksList.innerHTML = '';
    } else {
      // Hide no bookmarks message and show the list
      noBookmarksMessage.classList.add('hidden');
      renderBookmarksList(videoBookmarks);
    }
  });
}

// Render the list of bookmarks
function renderBookmarksList(bookmarks) {
  bookmarksList.innerHTML = '';
  
  bookmarks.forEach((bookmark, index) => {
    const bookmarkItem = document.createElement('li');
    bookmarkItem.className = 'bookmark-item';
    
    // Create bookmark timestamp button
    const timeButton = document.createElement('button');
    timeButton.className = 'bookmark-time';
    timeButton.textContent = bookmark.formattedTime;
    timeButton.addEventListener('click', () => {
      jumpToTimestamp(bookmark.formattedTime);
    });
    
    // Create note input
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'bookmark-note';
    noteInput.placeholder = 'Add a note (optional)';
    noteInput.value = bookmark.note || '';
    noteInput.addEventListener('change', () => {
      updateBookmarkNote(index, noteInput.value);
    });
    
    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'bookmark-delete';
    deleteButton.innerHTML = '&times;';
    deleteButton.title = 'Delete bookmark';
    deleteButton.addEventListener('click', () => {
      deleteBookmark(index);
    });
    
    // Append elements to bookmark item
    bookmarkItem.appendChild(timeButton);
    bookmarkItem.appendChild(noteInput);
    bookmarkItem.appendChild(deleteButton);
    
    // Append bookmark item to the list
    bookmarksList.appendChild(bookmarkItem);
  });
}

// Add a bookmark at the current video time
function addCurrentTimeBookmark() {
  // Request current time from the content script
  chrome.tabs.sendMessage(currentTabId, { action: 'getCurrentTime' }, (response) => {
    if (response) {
      const { time, formattedTime } = response;
      
      // Get existing bookmarks
      chrome.storage.local.get('youtubeBookmarks', (result) => {
        const bookmarks = result.youtubeBookmarks || {};
        const videoBookmarks = bookmarks[currentVideoId] || [];
        
        // Check if this timestamp is already bookmarked
        const existingIndex = videoBookmarks.findIndex(b => Math.abs(b.time - time) < 1); // Within 1 second
        
        if (existingIndex >= 0) {
          alert('This timestamp is already bookmarked');
        } else {
          // Create new bookmark
          const newBookmark = {
            time: time,
            formattedTime: formattedTime,
            note: '',
            createdAt: Date.now()
          };
          
          // Add to list and sort by time
          videoBookmarks.push(newBookmark);
          videoBookmarks.sort((a, b) => a.time - b.time);
          
          // Update storage
          bookmarks[currentVideoId] = videoBookmarks;
          chrome.storage.local.set({ youtubeBookmarks: bookmarks }, () => {
            // Refresh the list
            loadBookmarks();
          });
        }
      });
    }
  });
}

// Jump to a specific timestamp in the video
function jumpToTimestamp(timestamp) {
  chrome.runtime.sendMessage({
    action: 'jumpToTimestamp',
    tabId: currentTabId,
    timestamp: timestamp
  });
}

// Update a bookmark's note
function updateBookmarkNote(index, note) {
  chrome.storage.local.get('youtubeBookmarks', (result) => {
    const bookmarks = result.youtubeBookmarks || {};
    const videoBookmarks = bookmarks[currentVideoId] || [];
    
    if (index >= 0 && index < videoBookmarks.length) {
      videoBookmarks[index].note = note;
      bookmarks[currentVideoId] = videoBookmarks;
      
      chrome.storage.local.set({ youtubeBookmarks: bookmarks });
    }
  });
}

// Delete a specific bookmark
function deleteBookmark(index) {
  if (confirm('Are you sure you want to delete this bookmark?')) {
    chrome.storage.local.get('youtubeBookmarks', (result) => {
      const bookmarks = result.youtubeBookmarks || {};
      const videoBookmarks = bookmarks[currentVideoId] || [];
      
      if (index >= 0 && index < videoBookmarks.length) {
        videoBookmarks.splice(index, 1);
        bookmarks[currentVideoId] = videoBookmarks;
        
        chrome.storage.local.set({ youtubeBookmarks: bookmarks }, () => {
          loadBookmarks();
        });
      }
    });
  }
}

// Clear all bookmarks for the current video
function clearAllBookmarks() {
  if (confirm('Are you sure you want to delete all bookmarks for this video?')) {
    chrome.storage.local.get('youtubeBookmarks', (result) => {
      const bookmarks = result.youtubeBookmarks || {};
      
      // Remove bookmarks for this video
      delete bookmarks[currentVideoId];
      
      chrome.storage.local.set({ youtubeBookmarks: bookmarks }, () => {
        loadBookmarks();
      });
    });
  }
}
