/**
 * Utility functions for clip operations
 */

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format time with milliseconds (MM:SS.MS)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string with milliseconds
 */
export const formatTimeWithMs = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '00:00.000';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

/**
 * Calculate clip duration
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {number} Duration in seconds
 */
export const calculateDuration = (startTime, endTime) => {
  return Math.max(0, endTime - startTime);
};

/**
 * Generate a thumbnail from a video element at a specific time
 * @param {HTMLVideoElement} videoElement - The video element
 * @param {number} timeInSeconds - Time to capture thumbnail at
 * @returns {Promise<string>} Promise resolving to data URL of the thumbnail
 */
export const generateThumbnail = (videoElement, timeInSeconds) => {
  return new Promise((resolve, reject) => {
    try {
      // Save current time
      const currentTime = videoElement.currentTime;
      
      // Set video to desired time
      videoElement.currentTime = timeInSeconds;
      
      // Create canvas and draw video frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Wait for video to seek to the specified time
      videoElement.addEventListener('seeked', function onSeeked() {
        // Remove event listener to prevent multiple calls
        videoElement.removeEventListener('seeked', onSeeked);
        
        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Get data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Restore original time
        videoElement.currentTime = currentTime;
        
        // Resolve with data URL
        resolve(dataUrl);
      }, { once: true });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Extract a segment from a video file (client-side)
 * Note: This is a simplified version for demonstration purposes.
 * In a real application, video processing should be done server-side.
 * 
 * @param {File} videoFile - The video file
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {Promise<Blob>} Promise resolving to a Blob containing the clip
 */
export const extractVideoSegment = async (videoFile, startTime, endTime) => {
  // In a real implementation, this would send the request to a server
  // For now, we'll just return the original file with a simulated delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(videoFile);
    }, 2000);
  });
};

/**
 * Apply text overlay to a video (client-side simulation)
 * Note: This is a simplified version for demonstration purposes.
 * In a real application, video processing should be done server-side.
 * 
 * @param {Blob} videoBlob - The video blob
 * @param {Object} textOptions - Text overlay options
 * @returns {Promise<Blob>} Promise resolving to a Blob with text overlay
 */
export const applyTextOverlay = async (videoBlob, textOptions) => {
  // In a real implementation, this would send the request to a server
  // For now, we'll just return the original blob with a simulated delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(videoBlob);
    }, 1000);
  });
};

/**
 * Apply visual effect to a video (client-side simulation)
 * Note: This is a simplified version for demonstration purposes.
 * In a real application, video processing should be done server-side.
 * 
 * @param {Blob} videoBlob - The video blob
 * @param {string} effectType - Type of effect to apply
 * @returns {Promise<Blob>} Promise resolving to a Blob with effect applied
 */
export const applyVisualEffect = async (videoBlob, effectType) => {
  // In a real implementation, this would send the request to a server
  // For now, we'll just return the original blob with a simulated delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(videoBlob);
    }, 1000);
  });
};

/**
 * Share clip to social media platforms (client-side simulation)
 * Note: This is a simplified version for demonstration purposes.
 * In a real application, sharing would be done through server APIs.
 * 
 * @param {Blob} videoBlob - The video blob
 * @param {Array<string>} platforms - Array of platform IDs to share to
 * @returns {Promise<Object>} Promise resolving to sharing results
 */
export const shareToSocialMedia = async (videoBlob, platforms) => {
  // In a real implementation, this would send the request to a server
  // For now, we'll just return a success response with a simulated delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        platforms: platforms,
        shareUrls: platforms.map(platform => `https://example.com/${platform}/share/123456`)
      });
    }, 2000);
  });
};

/**
 * Calculate optimal clip start and end times based on a target duration
 * @param {number} currentPosition - Current position in the video
 * @param {number} targetDuration - Desired clip duration in seconds
 * @param {number} videoDuration - Total video duration in seconds
 * @returns {Object} Object containing start and end times
 */
export const calculateOptimalClipTimes = (currentPosition, targetDuration, videoDuration) => {
  // Try to center the clip around the current position
  let startTime = Math.max(0, currentPosition - (targetDuration / 2));
  let endTime = startTime + targetDuration;
  
  // If end time exceeds video duration, adjust both start and end
  if (endTime > videoDuration) {
    endTime = videoDuration;
    startTime = Math.max(0, endTime - targetDuration);
  }
  
  return { startTime, endTime };
};

/**
 * Generate a unique clip ID
 * @returns {string} Unique clip ID
 */
export const generateClipId = () => {
  return 'clip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

