import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Pin, Flag, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

/**
 * Annotation Tools Component for EONTA
 * Allows users to add comments and annotations to specific points in a composition
 */
const AnnotationTools = ({ 
  compositionId, 
  mapRef,
  userId = "user-123",
  userName = "Current User" 
}) => {
  // State for annotations
  const [annotations, setAnnotations] = useState([]);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // New annotation form state
  const [newAnnotation, setNewAnnotation] = useState({
    text: '',
    position: null,
    type: 'comment' // 'comment', 'issue', 'suggestion'
  });
  
  // Refs for markers
  const markersRef = useRef(new Map());
  const infoWindowRef = useRef(null);
  
  // Load existing annotations on mount
  useEffect(() => {
    fetchAnnotations();
  }, [compositionId]);
  
  // Update markers when annotations change
  useEffect(() => {
    if (mapRef?.current && showAnnotations) {
      updateMapMarkers();
    }
    return () => {
      // Clean up markers when component unmounts
      clearMapMarkers();
    };
  }, [annotations, showAnnotations, mapRef]);
  
  // Fetch annotations from server (mock implementation)
  const fetchAnnotations = async () => {
    // In a real implementation, you would fetch from your API
    // Mock data for demonstration
    const mockAnnotations = [
      {
        id: 'anno-1',
        compositionId: compositionId,
        userId: 'user-456',
        userName: 'Alice Cooper',
        position: { lat: 40.7313, lng: -73.9976 }, // Washington Square Park area
        text: 'The transition between ambient sounds needs smoothing here',
        type: 'suggestion',
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 3600000),
        resolved: false
      },
      {
        id: 'anno-2',
        compositionId: compositionId,
        userId: 'user-789',
        userName: 'Bob Johnson',
        position: { lat: 40.7308, lng: -73.9973 }, // Nearby position
        text: 'Love the fountain sounds here!',
        type: 'comment',
        createdAt: new Date(Date.now() - 7200000),
        updatedAt: new Date(Date.now() - 7200000),
        resolved: false
      },
      {
        id: 'anno-3',
        compositionId: compositionId,
        userId: 'user-456',
        userName: 'Alice Cooper',
        position: { lat: 40.7305, lng: -73.9981 }, // Another nearby position
        text: 'Volume is too low in this region during playback',
        type: 'issue',
        createdAt: new Date(Date.now() - 10800000),
        updatedAt: new Date(Date.now() - 10800000),
        resolved: true
      }
    ];
    
    setAnnotations(mockAnnotations);
  };
  
  // Clear existing map markers
  const clearMapMarkers = () => {
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current.clear();
    
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };
  
  // Update map markers from annotations
  const updateMapMarkers = () => {
    if (!google || !google.maps || !mapRef.current) return;
    
    // Clear existing markers
    clearMapMarkers();
    
    // Create info window if doesn't exist
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }
    
    // Add markers for each annotation
    annotations.forEach(annotation => {
      if (!annotation.position) return;
      
      // Skip resolved annotations
      if (annotation.resolved && annotation.type === 'issue') return;
      
      // Create marker with type-specific icon
      const marker = new google.maps.Marker({
        position: annotation.position,
        map: mapRef.current,
        title: `${annotation.userName}: ${annotation.text.substring(0, 20)}...`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: getAnnotationColor(annotation.type),
          fillOpacity: 0.8,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        },
        animation: google.maps.Animation.DROP
      });
      
      // Add click listener to show annotation details
      marker.addListener('click', () => {
        showAnnotationDetails(annotation, marker);
      });
      
      // Store marker reference
      markersRef.current.set(annotation.id, marker);
    });
  };
  
  // Show annotation details in info window
  const showAnnotationDetails = (annotation, marker) => {
    if (!infoWindowRef.current || !mapRef.current) return;
    
    setActiveAnnotation(annotation);
    
    // Create content for info window
    const content = `
      <div class="annotation-info">
        <div class="annotation-header">
          <strong>${annotation.userName}</strong>
          <span style="color: #888; font-size: 0.8em;">
            ${new Date(annotation.createdAt).toLocaleString()}
          </span>
        </div>
        <div class="annotation-type" style="color: ${getAnnotationColor(annotation.type)};">
          ${annotation.type.toUpperCase()}
        </div>
        <p>${annotation.text}</p>
      </div>
    `;
    
    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(mapRef.current, marker);
  };
  
  // Get color based on annotation type
  const getAnnotationColor = (type) => {
    switch (type) {
      case 'issue':
        return '#E74C3C'; // Red
      case 'suggestion':
        return '#F39C12'; // Orange
      case 'comment':
      default:
        return '#3498DB'; // Blue
    }
  };
  
  // Start creating a new annotation
  const startCreatingAnnotation = () => {
    if (!mapRef.current) return;
    
    setIsCreating(true);
    setNewAnnotation({
      text: '',
      position: null,
      type: 'comment'
    });
    
    // Set up click listener on map
    if (google && google.maps) {
      // Remove existing click listener first
      google.maps.event.clearListeners(mapRef.current, 'click');
      
      // Add new click listener
      mapRef.current.addListener('click', (event) => {
        const position = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        setNewAnnotation(prev => ({ ...prev, position }));
        
        // Show temporary marker
        if (markersRef.current.has('new-annotation')) {
          markersRef.current.get('new-annotation').setMap(null);
        }
        
        const marker = new google.maps.Marker({
          position: position,
          map: mapRef.current,
          title: 'New Annotation',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: getAnnotationColor(newAnnotation.type),
            fillOpacity: 0.5,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          },
          animation: google.maps.Animation.BOUNCE
        });
        
        markersRef.current.set('new-annotation', marker);
      });
    }
  };
  
  // Cancel creating a new annotation
  const cancelCreatingAnnotation = () => {
    setIsCreating(false);
    
    // Remove temporary marker
    if (markersRef.current.has('new-annotation')) {
      markersRef.current.get('new-annotation').setMap(null);
      markersRef.current.delete('new-annotation');
    }
    
    // Remove click listener
    if (google && google.maps && mapRef.current) {
      google.maps.event.clearListeners(mapRef.current, 'click');
    }
  };
  
  // Save a new annotation
  const saveAnnotation = () => {
    if (!newAnnotation.text || !newAnnotation.position) {
      alert('Please add text and select a position on the map');
      return;
    }
    
    // Create annotation object
    const annotation = {
      id: `anno-${Date.now()}`,
      compositionId: compositionId,
      userId: userId,
      userName: userName,
      position: newAnnotation.position,
      text: newAnnotation.text,
      type: newAnnotation.type,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolved: false
    };
    
    // In a real implementation, you would save to your API
    // For demo, just add to local state
    setAnnotations(prev => [...prev, annotation]);
    
    // Remove temporary marker
    if (markersRef.current.has('new-annotation')) {
      markersRef.current.get('new-annotation').setMap(null);
      markersRef.current.delete('new-annotation');
    }
    
    // Reset state
    setIsCreating(false);
    setNewAnnotation({
      text: '',
      position: null,
      type: 'comment'
    });
    
    // Remove click listener
    if (google && google.maps && mapRef.current) {
      google.maps.event.clearListeners(mapRef.current, 'click');
    }
  };
  
  // Toggle annotation visibility
  const toggleAnnotations = () => {
    setShowAnnotations(!showAnnotations);
  };
  
  // Edit an annotation
  const startEditingAnnotation = (annotation) => {
    setIsEditing(true);
    setActiveAnnotation(annotation);
    setNewAnnotation({
      text: annotation.text,
      position: annotation.position,
      type: annotation.type
    });
    
    // Close info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };
  
  // Update an annotation
  const updateAnnotation = () => {
    if (!activeAnnotation || !newAnnotation.text) return;
    
    // Update the annotation
    const updatedAnnotations = annotations.map(a => 
      a.id === activeAnnotation.id ? 
        {
          ...a,
          text: newAnnotation.text,
          type: newAnnotation.type,
          updatedAt: new Date()
        } : a
    );
    
    setAnnotations(updatedAnnotations);
    setIsEditing(false);
    setActiveAnnotation(null);
  };
  
  // Delete an annotation
  const deleteAnnotation = (annotationId) => {
    if (!annotationId) return;
    
    if (window.confirm('Are you sure you want to delete this annotation?')) {
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      
      // Close info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      
      setActiveAnnotation(null);
    }
  };
  
  // Toggle resolved status
  const toggleResolved = (annotationId) => {
    if (!annotationId) return;
    
    setAnnotations(prev => prev.map(a => 
      a.id === annotationId ? { ...a, resolved: !a.resolved } : a
    ));
    
    // Update markers
    updateMapMarkers();
    
    // Close info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg w-80 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 dark:bg-indigo-800 p-3 text-white flex items-center justify-between">
        <h3 className="font-semibold">Annotations</h3>
        <div className="flex space-x-2">
          <button
            onClick={toggleAnnotations}
            className="p-1 rounded hover:bg-indigo-700"
            title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
          >
            {showAnnotations ? <MessageCircle size={18} /> : <MessageCircle size={18} />}
          </button>
          <button
            onClick={isCreating ? cancelCreatingAnnotation : startCreatingAnnotation}
            className={`p-1 rounded ${isCreating ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-indigo-700'}`}
            title={isCreating ? 'Cancel' : 'Add annotation'}
          >
            {isCreating ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>
      </div>
      
      {/* Creating/Editing Form */}
      {(isCreating || isEditing) && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-2">
            {isCreating ? 'New Annotation' : 'Edit Annotation'}
          </h4>
          
          {isCreating && !newAnnotation.position && (
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">
              Click on the map to place your annotation
            </div>
          )}
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <div className="flex space-x-2">
                <button
                  className={`px-2 py-1 text-xs rounded ${
                    newAnnotation.type === 'comment' 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => setNewAnnotation(prev => ({ ...prev, type: 'comment' }))}
                >
                  <MessageCircle size={12} className="inline mr-1" />
                  Comment
                </button>
                <button
                  className={`px-2 py-1 text-xs rounded ${
                    newAnnotation.type === 'suggestion' 
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => setNewAnnotation(prev => ({ ...prev, type: 'suggestion' }))}
                >
                  <Pin size={12} className="inline mr-1" />
                  Suggestion
                </button>
                <button
                  className={`px-2 py-1 text-xs rounded ${
                    newAnnotation.type === 'issue' 
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => setNewAnnotation(prev => ({ ...prev, type: 'issue' }))}
                >
                  <Flag size={12} className="inline mr-1" />
                  Issue
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1">Text</label>
              <textarea
                value={newAnnotation.text}
                onChange={(e) => setNewAnnotation(prev => ({ ...prev, text: e.target.value }))}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800"
                rows={3}
                placeholder="Enter your annotation here..."
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={isCreating ? cancelCreatingAnnotation : () => {
                  setIsEditing(false);
                  setActiveAnnotation(null);
                }}
                className="px-3 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={isCreating ? saveAnnotation : updateAnnotation}
                className="px-3 py-1 text-xs text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                disabled={!newAnnotation.text || (isCreating && !newAnnotation.position)}
              >
                {isCreating ? 'Save' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto max-h-60">
        {annotations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No annotations yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {annotations.map(annotation => (
              <div 
                key={annotation.id} 
                className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  annotation.resolved ? 'opacity-60' : 'opacity-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div 
                      className="w-3 h-3 mt-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getAnnotationColor(annotation.type) }}
                    ></div>
                    <div className="ml-2">
                      <div className="flex items-baseline">
                        <span className="font-medium text-sm">{annotation.userName}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(annotation.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{annotation.text}</p>
                      
                      {annotation.userId === userId && (
                        <div className="flex mt-2 space-x-2">
                          <button
                            onClick={() => startEditingAnnotation(annotation)}
                            className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            <Edit2 size={12} className="inline mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => deleteAnnotation(annotation.id)}
                            className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 size={12} className="inline mr-1" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {annotation.type === 'issue' && (
                    <button
                      onClick={() => toggleResolved(annotation.id)}
                      className={`text-xs px-2 py-1 rounded ${
                        annotation.resolved
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {annotation.resolved ? 'Resolved' : 'Open'}
                    </button>
                  )}
                </div>
                
                {annotation.position && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => {
                        // Center map on annotation
                        if (mapRef.current) {
                          mapRef.current.panTo(annotation.position);
                          mapRef.current.setZoom(18);
                          
                          // Show info window
                          if (markersRef.current.has(annotation.id)) {
                            const marker = markersRef.current.get(annotation.id);
                            showAnnotationDetails(annotation, marker);
                          }
                        }
                      }}
                      className="underline hover:no-underline"
                    >
                      View on map
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnotationTools;
