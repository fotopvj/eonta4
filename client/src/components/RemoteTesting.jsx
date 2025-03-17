import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Rewind, Share2, ChevronUp, ChevronDown, Users, Headphones, Mic, Video, Settings, RotateCw } from 'lucide-react';

/**
 * Remote Testing Component for EONTA
 * Allows collaborators to experience installations virtually
 */
const RemoteTesting = ({
  compositionId,
  mapRef,
  userId = "user-123",
  userName = "Current User"
}) => {
  // Session state
  const [isHosting, setIsHosting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [sessionCode, setSessionCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  // Testing state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [pathProgress, setPathProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showDetails, setShowDetails] = useState(true);
  
  // Media state
  const [micEnabled, setMicEnabled] = useState(false);
  const [headphonesEnabled, setHeadphonesEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  
  // Refs
  const pathIntervalRef = useRef(null);
  const pathRef = useRef([]);
  const pathMarkerRef = useRef(null);
  const pathLineRef = useRef(null);
  
  // Generate a session code
  const generateSessionCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };
  
  // Host a new session
  const hostSession = () => {
    const code = generateSessionCode();
    setSessionCode(code);
    setIsHosting(true);
    
    // In a real implementation, you would create a session on your server
    // and initialize WebRTC connections
    
    // Mock session creation
    setActiveSession({
      id: `session-${Date.now()}`,
      code: code,
      hostId: userId,
      hostName: userName,
      compositionId: compositionId,
      createdAt: new Date(),
      status: 'active'
    });
    
    // Mock participants (just the host initially)
    setParticipants([
      {
        id: userId,
        name: userName,
        isHost: true,
        micEnabled: false,
        videoEnabled: false,
        headphonesEnabled: true
      }
    ]);
    
    // Load test path
    loadTestPath();
  };
  
  // Join an existing session
  const joinSession = () => {
    if (!joinCode) {
      alert('Please enter a session code');
      return;
    }
    
    // In a real implementation, you would connect to an existing session
    
    // Mock join session
    setActiveSession({
      id: `session-${Date.now()}`,
      code: joinCode,
      hostId: 'user-456',
      hostName: 'Alice Cooper',
      compositionId: compositionId,
      createdAt: new Date(),
      status: 'active'
    });
    
    // Mock participants
    setParticipants([
      {
        id: 'user-456', // Host
        name: 'Alice Cooper',
        isHost: true,
        micEnabled: true,
        videoEnabled: false,
        headphonesEnabled: true
      },
      {
        id: userId, // Current user
        name: userName,
        isHost: false,
        micEnabled: false,
        videoEnabled: false,
        headphonesEnabled: true
      },
      {
        id: 'user-789', // Another participant
        name: 'Bob Johnson',
        isHost: false,
        micEnabled: true,
        videoEnabled: false,
        headphonesEnabled: true
      }
    ]);
    
    setIsJoining(false);
    
    // Load test path
    loadTestPath();
  };
  
  // Leave the session
  const leaveSession = () => {
    // In a real implementation, you would disconnect from the session
    
    // Clean up
    setActiveSession(null);
    setParticipants([]);
    setIsHosting(false);
    setIsJoining(false);
    setIsPlaying(false);
    
    if (pathIntervalRef.current) {
      clearInterval(pathIntervalRef.current);
      pathIntervalRef.current = null;
    }
    
    clearPathVisualization();
  };
  
  // Load a test path
  const loadTestPath = () => {
    // In a real implementation, you would load a predefined or recorded path
    // for this composition
    
    // Mock path around Washington Square Park
    const centerLat = 40.7308;
    const centerLng = -73.9973;
    
    // Create a circular path
    const path = [];
    const steps = 100;
    const radiusLat = 0.001; // roughly 100 meters
    const radiusLng = 0.0015;
    
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      path.push({
        lat: centerLat + Math.sin(angle) * radiusLat,
        lng: centerLng + Math.cos(angle) * radiusLng,
        timestamp: new Date(Date.now() + (i * 1000)) // 1 second per step
      });
    }
    
    pathRef.current = path;
    
    // Initialize visualization
    initPathVisualization();
  };
  
  // Initialize path visualization
  const initPathVisualization = () => {
    if (!mapRef?.current || !google || !google.maps || pathRef.current.length === 0) return;
    
    // Clear existing visualization
    clearPathVisualization();
    
    // Create path line
    const pathCoordinates = pathRef.current.map(point => ({
      lat: point.lat,
      lng: point.lng
    }));
    
    pathLineRef.current = new google.maps.Polyline({
      path: pathCoordinates,
      geodesic: true,
      strokeColor: '#4A90E2',
      strokeOpacity: 0.5,
      strokeWeight: 3,
      map: mapRef.current
    });
    
    // Create path marker at first position
    const initialPosition = pathRef.current[0];
    setCurrentPosition(initialPosition);
    
    pathMarkerRef.current = new google.maps.Marker({
      position: initialPosition,
      map: mapRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#FF0000',
        fillOpacity: 0.8,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      },
      title: 'Current Position'
    });
    
    // Fit map to path
    const bounds = new google.maps.LatLngBounds();
    pathCoordinates.forEach(coord => bounds.extend(coord));
    mapRef.current.fitBounds(bounds);
  };
  
  // Clear path visualization
  const clearPathVisualization = () => {
    if (pathLineRef.current) {
      pathLineRef.current.setMap(null);
      pathLineRef.current = null;
    }
    
    if (pathMarkerRef.current) {
      pathMarkerRef.current.setMap(null);
      pathMarkerRef.current = null;
    }
  };
  
  // Start playback
  const startPlayback = () => {
    if (pathRef.current.length === 0) return;
    
    setIsPlaying(true);
    
    // Reset progress if we're at the end
    if (pathProgress >= 100) {
      setPathProgress(0);
    }
    
    // Calculate current index based on progress
    const index = Math.floor((pathProgress / 100) * (pathRef.current.length - 1));
    
    // Start from current point
    let currentIndex = index;
    
    // Create interval to update position
    pathIntervalRef.current = setInterval(() => {
      currentIndex += playbackSpeed;
      
      // Check if we've reached the end
      if (currentIndex >= pathRef.current.length) {
        stopPlayback();
        setPathProgress(100);
        return;
      }
      
      // Get current path point
      const point = pathRef.current[Math.floor(currentIndex)];
      setCurrentPosition(point);
      
      // Update map marker
      if (pathMarkerRef.current) {
        pathMarkerRef.current.setPosition(point);
      }
      
      // Center map on marker if following
      if (mapRef.current) {
        mapRef.current.panTo(point);
      }
      
      // Update progress
      const newProgress = (currentIndex / (pathRef.current.length - 1)) * 100;
      setPathProgress(newProgress);
      
    }, 1000 / playbackSpeed); // Adjust interval based on playback speed
  };
  
  // Stop playback
  const stopPlayback = () => {
    setIsPlaying(false);
    
    if (pathIntervalRef.current) {
      clearInterval(pathIntervalRef.current);
      pathIntervalRef.current = null;
    }
  };
  
  // Skip forward in playback
  const skipForward = () => {
    // Skip forward by 10%
    let newProgress = pathProgress + 10;
    
    // Cap at 100%
    if (newProgress > 100) {
      newProgress = 100;
    }
    
    // Update progress
    setPathProgress(newProgress);
    
    // Update marker position
    const index = Math.floor((newProgress / 100) * (pathRef.current.length - 1));
    const point = pathRef.current[index];
    setCurrentPosition(point);
    
    if (pathMarkerRef.current) {
      pathMarkerRef.current.setPosition(point);
    }
    
    // Center map on marker
    if (mapRef.current) {
      mapRef.current.panTo(point);
    }
  };
  
  // Rewind in playback
  const rewind = () => {
    // Rewind by 10%
    let newProgress = pathProgress - 10;
    
    // Cap at 0%
    if (newProgress < 0) {
      newProgress = 0;
    }
    
    // Update progress
    setPathProgress(newProgress);
    
    // Update marker position
    const index = Math.floor((newProgress / 100) * (pathRef.current.length - 1));
    const point = pathRef.current[index];
    setCurrentPosition(point);
    
    if (pathMarkerRef.current) {
      pathMarkerRef.current.setPosition(point);
    }
    
    // Center map on marker
    if (mapRef.current) {
      mapRef.current.panTo(point);
    }
  };
  
  // Handle speed change
  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    
    // If currently playing, restart with new speed
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  };
  
  // Toggle microphone
  const toggleMic = () => {
    setMicEnabled(!micEnabled);
    
    // In a real implementation, you would enable/disable the microphone
    // and update the WebRTC connection
    
    // Update participants list for this user
    setParticipants(prev => prev.map(p => 
      p.id === userId ? { ...p, micEnabled: !micEnabled } : p
    ));
  };
  
  // Toggle headphones
  const toggleHeadphones = () => {
    setHeadphonesEnabled(!headphonesEnabled);
    
    // In a real implementation, you would mute/unmute audio
    
    // Update participants list for this user
    setParticipants(prev => prev.map(p => 
      p.id === userId ? { ...p, headphonesEnabled: !headphonesEnabled } : p
    ));
  };
  
  // Toggle video
  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
    
    // In a real implementation, you would enable/disable the camera
    // and update the WebRTC connection
    
    // Update participants list for this user
    setParticipants(prev => prev.map(p => 
      p.id === userId ? { ...p, videoEnabled: !videoEnabled } : p
    ));
  };
  
  // Share session
  const shareSession = () => {
    if (!activeSession) return;
    
    // Copy session code to clipboard
    navigator.clipboard.writeText(activeSession.code);
    alert(`Session code ${activeSession.code} copied to clipboard. Share this with others to invite them.`);
  };
  
  // Reset the test
  const resetTest = () => {
    stopPlayback();
    setPathProgress(0);
    
    // Reset marker position
    const point = pathRef.current[0];
    setCurrentPosition(point);
    
    if (pathMarkerRef.current) {
      pathMarkerRef.current.setPosition(point);
    }
    
    // Center map on marker
    if (mapRef.current) {
      mapRef.current.panTo(point);
    }
  };
  
  // Format time
  const formatTime = (progress) => {
    // Mock time calculation (assuming 1 second per point)
    const totalSeconds = Math.floor((progress / 100) * (pathRef.current.length - 1));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="bg-purple-600 dark:bg-purple-800 p-3 text-white flex items-center justify-between">
        <h3 className="font-semibold">Remote Testing</h3>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 rounded-full hover:bg-purple-500 transition-colors"
        >
          {showDetails ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
      
      {/* Initial selection if no active session */}
      {!activeSession && !isHosting && !isJoining && (
        <div className="p-4 flex flex-col space-y-3">
          <div className="text-center mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Start or join a remote testing session to virtually experience this composition with others
            </p>
          </div>
          
          <button
            onClick={() => setIsHosting(true)}
            className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Host a Session
          </button>
          
          <button
            onClick={() => setIsJoining(true)}
            className="w-full py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Join a Session
          </button>
        </div>
      )}
      
      {/* Host setup */}
      {isHosting && !activeSession && (
        <div className="p-4 flex flex-col space-y-3">
          <h4 className="font-medium">Host a Remote Testing Session</h4>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You're about to host a virtual walkthrough of this composition. Others will be able to join using your session code.
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setIsHosting(false)}
              className="flex-1 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={hostSession}
              className="flex-1 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Start Session
            </button>
          </div>
        </div>
      )}
      
      {/* Join setup */}
      {isJoining && !activeSession && (
        <div className="p-4 flex flex-col space-y-3">
          <h4 className="font-medium">Join a Remote Testing Session</h4>
          
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Enter Session Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700"
              maxLength={6}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setIsJoining(false)}
              className="flex-1 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={joinSession}
              className="flex-1 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              disabled={!joinCode || joinCode.length !== 6}
            >
              Join Session
            </button>
          </div>
        </div>
      )}
      
      {/* Active session */}
      {activeSession && showDetails && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-medium text-sm">Session: {activeSession.code}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Host: {activeSession.hostName}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={shareSession}
                className="p-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Share Session"
              >
                <Share2 size={16} />
              </button>
              
              <button
                onClick={leaveSession}
                className="p-1.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800"
                title="Leave Session"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Playback progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{formatTime(pathProgress)}</span>
              <span>{formatTime(100)}</span>
            </div>
            
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div 
                className="absolute left-0 top-0 h-full bg-purple-600 dark:bg-purple-500 rounded-full"
                style={{ width: `${pathProgress}%` }}
              ></div>
            </div>
          </div>
          
          {/* Playback controls */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <button
                onClick={rewind}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Rewind"
              >
                <Rewind size={16} />
              </button>
              
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className={`p-2 ${isPlaying ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'} rounded-md`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              
              <button
                onClick={skipForward}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Skip Forward"
              >
                <SkipForward size={16} />
              </button>
              
              <button
                onClick={resetTest}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Reset"
              >
                <RotateCw size={16} />
              </button>
            </div>
            
            <div className="flex items-center space-x-1">
              <select
                value={playbackSpeed}
                onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                className="text-xs p-1 bg-gray-200 dark:bg-gray-700 rounded-md"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>
          </div>
          
          {/* Participant Controls */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={toggleMic}
                className={`p-2 rounded-md ${micEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                <Mic size={16} />
              </button>
              
              <button
                onClick={toggleHeadphones}
                className={`p-2 rounded-md ${headphonesEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                title={headphonesEnabled ? 'Disable Audio' : 'Enable Audio'}
              >
                <Headphones size={16} />
              </button>
              
              <button
                onClick={toggleVideo}
                className={`p-2 rounded-md ${videoEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                title={videoEnabled ? 'Disable Video' : 'Enable Video'}
              >
                <Video size={16} />
              </button>
            </div>
            
            <button
              onClick={() => alert('Settings would open here')}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
          
          {/* Participants */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <h5 className="text-sm font-medium">Participants ({participants.length})</h5>
            </div>
            
            <div className="max-h-32 overflow-y-auto bg-white dark:bg-gray-800 rounded-md p-1">
              {participants.map(participant => (
                <div key={participant.id} className="flex items-center p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="ml-2 flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="text-sm truncate">
                        {participant.name}
                        {participant.id === userId && " (You)"}
                      </span>
                      {participant.isHost && (
                        <span className="ml-1 px-1 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded">
                          Host
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    {participant.micEnabled && (
                      <Mic size={12} className="text-green-500" />
                    )}
                    {participant.videoEnabled && (
                      <Video size={12} className="text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Minimized active session */}
      {activeSession && !showDetails && (
        <div className="p-3 flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex items-center mr-2">
              <Users size={16} className="mr-1 text-gray-500" />
              <span className="text-sm">{participants.length}</span>
            </div>
            
            {isPlaying ? (
              <button
                onClick={stopPlayback}
                className="p-1.5 bg-red-500 text-white rounded-md"
                title="Pause"
              >
                <Pause size={14} />
              </button>
            ) : (
              <button
                onClick={startPlayback}
                className="p-1.5 bg-green-500 text-white rounded-md"
                title="Play"
              >
                <Play size={14} />
              </button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={toggleMic}
              className={`p-1.5 rounded-md ${micEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
              title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              <Mic size={14} />
            </button>
            
            <button
              onClick={toggleHeadphones}
              className={`p-1.5 rounded-md ${headphonesEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
              title={headphonesEnabled ? 'Disable Audio' : 'Enable Audio'}
            >
              <Headphones size={14} />
            </button>
            
            <button
              onClick={leaveSession}
              className="p-1.5 bg-red-100 text-red-700 rounded-md"
              title="Leave Session"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RemoteTesting;
    