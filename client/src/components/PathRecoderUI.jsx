import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Map, Timer, Mail, Download, Info, AlertCircle, Activity, Share2 } from 'lucide-react';

/**
 * Path Recorder UI Component
 * Handles recording user paths through audio installations
 */
const PathRecorderUI = ({ pathRecorderService }) => {
  // Component state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [pointsRecorded, setPointsRecorded] = useState(0);
  const [recordingId, setRecordingId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [compositionData, setCompositionData] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Refs for timers
  const timerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const pollingRef = useRef(null);
  
  /**
   * Start recording the user's path
   */
  const startRecording = useCallback(async () => {
    try {
      if (isRecording) {
        console.warn('Recording already in progress');
        return;
      }
      
      setError(null);
      
      // Check if geolocation is available
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser. Please try a different browser.');
        return;
      }
      
      // Check if the pathRecorderService is available
      if (!pathRecorderService) {
        setError('Path recorder service is not available');
        return;
      }
      
      // Get the composition ID from URL or props
      const compositionId = new URLSearchParams(window.location.search).get('compositionId') || 'demo';
      
      // Start recording via service
      const started = await pathRecorderService.startRecording(compositionId);
      
      if (!started) {
        setError('Failed to start recording');
        return;
      }
      
      setIsRecording(true);
      setRecordingDuration(0);
      setPointsRecorded(0);
      
      // Start timer
      const startTime = Date.now();
      
      const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        setRecordingDuration(elapsed);
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateTimer);
      
      // Poll for recording status
      timerRef.current = setInterval(() => {
        const status = pathRecorderService.getStatus();
        if (status && status.isRecording) {
          setPointsRecorded(status.pointsRecorded || 0);
        }
      }, 2000);
      
      // Notify the user that recording has started
      setSuccess('Recording started! Walk through the installation to capture your journey.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err.message || 'Unknown error'}`);
    }
  }, [isRecording, pathRecorderService]);
  
  /**
   * Stop recording the path
   */
  const stopRecording = useCallback(async () => {
    try {
      if (!isRecording) {
        console.warn('No recording in progress');
        return;
      }
      
      // Clear timers
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
      setProcessingStatus('processing');
      setProcessingProgress(0);
      
      // In a real implementation, this would call the path recorder service
      let composition;
      
      if (pathRecorderService) {
        try {
          composition = await pathRecorderService.stopRecording();
          
          if (composition) {
            setRecordingId(composition.recordingId);
            setCompositionData(composition);
            setDownloadUrl(composition.downloadUrl);
          } else {
            setError('No composition was generated. Try recording a longer path.');
            setProcessingStatus(null);
            return;
          }
        } catch (err) {
          console.error('Error stopping recording:', err);
          setError(`Failed to generate composition: ${err.message || 'Unknown error'}`);
          setProcessingStatus(null);
          return;
        }
      } else {
        // Demo mode - simulate response
        const newRecordingId = 'rec_' + Math.random().toString(36).substr(2, 9);
        setRecordingId(newRecordingId);
        
        // Simulate processing completion after a delay
        setTimeout(() => {
          setProcessingStatus('completed');
          setDownloadUrl(`/demo/compositions/${newRecordingId}.mp3`);
        }, 5000);
        
        // Simulate processing progress
        let progress = 0;
        pollingRef.current = setInterval(() => {
          progress += 10;
          setProcessingProgress(Math.min(progress, 100));
          
          if (progress >= 100) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }, 500);
      }
      
      // Show email form to send download link
      setShowEmailForm(true);
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError(`Failed to stop recording: ${err.message || 'Unknown error'}`);
    }
  }, [isRecording, pathRecorderService]);
  
  /**
   * Send download link to email
   */
  const sendDownloadEmail = useCallback(async () => {
    try {
      // Validate email
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
      
      setSuccess('Sending email...');
      
      // In a real implementation, this would call the API
      if (pathRecorderService && recordingId) {
        try {
          const response = await fetch('/api/compositions/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              recordingId,
              email,
              compositionId: compositionData?.compositionId
            })
          });
          
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          
          setError(null);
          setSuccess(`Download link sent to ${email}! Please check your inbox.`);
          setShowEmailForm(false);
          
          // Clear success message after a delay
          setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
          console.error('Error sending email:', err);
          setError(`Failed to send email: ${err.message || 'Server error'}`);
        }
      } else {
        // Demo mode
        setTimeout(() => {
          setError(null);
          setSuccess(`Download link sent to ${email}! Please check your inbox.`);
          setShowEmailForm(false);
          
          // Clear success message after a delay
          setTimeout(() => setSuccess(null), 5000);
        }, 1000);
      }
    } catch (err) {
      console.error('Error sending email:', err);
      setError(`Failed to send email: ${err.message || 'Unknown error'}`);
    }
  }, [email, recordingId, compositionData, pathRecorderService]);
  
  /**
   * Download the composition directly
   */
  const downloadComposition = useCallback(() => {
    if (!downloadUrl) {
      setError('Download URL is not available');
      return;
    }
    
    // Create a temporary anchor and trigger download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `eonta-journey-${recordingId || 'recording'}.mp3`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setSuccess('Download started!');
    setTimeout(() => setSuccess(null), 3000);
  }, [downloadUrl, recordingId]);
  
  /**
   * Format duration as MM:SS
   */
  const formatDuration = useCallback((ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, []);
  
  /**
   * Get recording status text
   */
  const getRecordingStatusText = useCallback(() => {
    if (isRecording) {
      return 'Recording in progress...';
    }
    
    if (processingStatus === 'processing') {
      return 'Processing your recording...';
    }
    
    if (processingStatus === 'completed') {
      return 'Your composition is ready!';
    }
    
    return 'Ready to record';
  }, [isRecording, processingStatus]);
  
  /**
   * Share composition
   */
  const shareComposition = useCallback(() => {
    if (!recordingId) {
      setError('No composition available to share');
      return;
    }
    
    const shareUrl = `${window.location.origin}/share/composition/${recordingId}`;
    
    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'My EONTA Journey',
        text: 'Check out my audio journey through this sound installation!',
        url: shareUrl
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setSuccess('Share link copied to clipboard!');
          setTimeout(() => setSuccess(null), 3000);
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          setError('Failed to copy share link. Please try again.');
        });
    }
  }, [recordingId]);
  
  /**
   * Show info/help modal
   */
  const showHelp = useCallback(() => {
    // In a real implementation, this would show a modal
    alert(
      'Path Recorder Help\n\n' +
      '1. Click Start Recording to begin capturing your journey\n' +
      '2. Walk through the installation to experience different audio regions\n' +
      '3. Click Stop when finished to generate your unique composition\n' +
      '4. Enter your email to receive a download link\n\n' +
      'Your composition is a unique souvenir of your journey through the installation!'
    );
  }, []);
  
  // Setup event listeners for path recorder service
  useEffect(() => {
    const handleError = (event) => {
      setError(event.detail.error);
    };
    
    const handleCompletion = (event) => {
      const { recordingData, composition } = event.detail;
      setProcessingStatus('completed');
      setCompositionData(composition);
      setRecordingId(composition.recordingId);
      setDownloadUrl(composition.downloadUrl);
    };
    
    const handlePositionUpdated = (event) => {
      setPointsRecorded(event.detail.pointCount);
    };
    
    // Add event listeners
    window.addEventListener('path-recording-error', handleError);
    window.addEventListener('path-recording-completed', handleCompletion);
    window.addEventListener('path-position-updated', handlePositionUpdated);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('path-recording-error', handleError);
      window.removeEventListener('path-recording-completed', handleCompletion);
      window.removeEventListener('path-position-updated', handlePositionUpdated);
    };
  }, []);
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
          <Map size={20} className="mr-2 text-blue-500" />
          Path Recorder
        </h2>
        
        <button
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          onClick={showHelp}
          aria-label="Show help"
        >
          <Info size={18} />
        </button>
      </div>
      
      {/* Status */}
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {getRecordingStatusText()}
        </p>
        
        {isRecording && (
          <div className="mt-2 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Timer size={14} className="mr-1" />
                Duration
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Map size={14} className="mr-1" />
                GPS Points
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {pointsRecorded}
              </span>
            </div>
          </div>
        )}
        
        {processingStatus === 'processing' && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <Activity size={14} className="mr-1" />
                Processing
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {processingProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full" 
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg flex items-start">
          <AlertCircle size={16} className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-300">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="block text-xs underline mt-1 hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-300">
            {success}
          </p>
        </div>
      )}
      
      {/* Email Form */}
      {showEmailForm && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
            Enter your email to receive a download link for your composition:
          </p>
          
          <div className="flex items-center">
            <input
              type="email"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
            <button
              className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={sendDownloadEmail}
              aria-label="Send email"
            >
              <Mail size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Control Buttons */}
      <div className="flex flex-col space-y-3">
        {!isRecording && processingStatus !== 'processing' && (
          <button
            onClick={startRecording}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
            disabled={isRecording || processingStatus === 'processing'}
          >
            <Play size={18} className="mr-2" /> Start Recording
          </button>
        )}
        
        {isRecording && (
          <button
            onClick={stopRecording}
            className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center"
          >
            <Square size={18} className="mr-2" /> Stop Recording
          </button>
        )}
        
        {processingStatus === 'completed' && downloadUrl && (
          <button
            onClick={downloadComposition}
            className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center"
          >
            <Download size={18} className="mr-2" /> Download Composition
          </button>
        )}
        
        {recordingId && processingStatus === 'completed' && (
          <button
            onClick={shareComposition}
            className="w-full py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center"
          >
            <Share2 size={18} className="mr-2" /> Share Journey
          </button>
        )}
      </div>
      
      {/* Composition Details */}
      {compositionData && processingStatus === 'completed' && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Journey Summary</h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                <p className="font-medium text-gray-800 dark:text-white">
                  {formatDuration(compositionData.duration || recordingDuration)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Points:</span>
                <p className="font-medium text-gray-800 dark:text-white">
                  {compositionData.pointCount || pointsRecorded}
                </p>
              </div>
              {compositionData.distance && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Distance:</span>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {typeof compositionData.distance === 'number' ? 
                      (compositionData.distance < 1000 ? 
                        `${Math.round(compositionData.distance)}m` : 
                        `${(compositionData.distance / 1000).toFixed(2)}km`) : 
                      compositionData.distance}
                  </p>
                </div>
              )}
              {compositionData.regions && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Regions:</span>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {compositionData.regions}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Component with error boundary
 */
const PathRecorderUIWithErrorBoundary = (props) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Reset error state when props change
  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
  }, [props.pathRecorderService]);
  
  // Handle error
  if (hasError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 max-w-md w-full">
        <div className="flex items-center mb-4 text-red-500">
          <AlertCircle size={20} className="mr-2" />
          <h2 className="text-lg font-bold">Something went wrong</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {errorMessage || "The path recorder encountered an error."}
        </p>
        <button
          onClick={() => {
            setHasError(false);
            setErrorMessage('');
          }}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // Try to render component, catch errors
  try {
    return <PathRecorderUI {...props} />;
  } catch (error) {
    console.error('Error rendering PathRecorderUI:', error);
    setHasError(true);
    setErrorMessage(error.message);
    return null;
  }
};

export default PathRecorderUIWithErrorBoundary;