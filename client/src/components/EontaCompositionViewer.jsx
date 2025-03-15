import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Layers, Volume2, Settings, User, Menu, X, Trash2, Download, Share2, Plus, AlertCircle } from 'lucide-react';

// Sample composition data for demonstration
const sampleComposition = {
  title: "Washington Square Park Soundscape",
  description: "An immersive audio experience of Washington Square Park",
  creator: "John Doe",
  isPublic: true,
  location: {
    name: "Washington Square Park, NYC"
  },
  audioRegions: [
    { id: "1", name: "Fountain Area", volume: 80 },
    { id: "2", name: "Eastern Pathways", volume: 65 },
    { id: "3", name: "Western Garden", volume: 72 },
    { id: "4", name: "Northern Plaza", volume: 55 }
  ]
};

const EontaCompositionViewer = () => {
  const [composition, setComposition] = useState(sampleComposition);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('regions');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or system preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const mapRef = useRef(null);

  // Toggle dark mode
  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  // Format region list items with volume sliders
  const renderRegionList = useCallback(() => {
    if (!composition.audioRegions || !Array.isArray(composition.audioRegions)) {
      return <p>No audio regions available</p>;
    }
    
    return composition.audioRegions.map(region => (
      <div key={region.id} className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {region.name || `Region ${region.id}`}
          </h3>
          <button 
            className="text-gray-500 hover:text-red-500"
            onClick={() => handleDeleteRegion(region.id)}
            aria-label={`Delete ${region.name || 'region'}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
        
        <div className="flex items-center">
          <Volume2 size={18} className="mr-2 text-gray-500" />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={region.volume || 0} 
            onChange={(e) => handleVolumeChange(region.id, parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            aria-label={`Volume for ${region.name || 'region'}`}
          />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-300 w-8">
            {region.volume || 0}%
          </span>
        </div>
      </div>
    ));
  }, [composition.audioRegions]);

  // Handle volume change for an audio region
  const handleVolumeChange = useCallback((regionId, newVolume) => {
    if (newVolume < 0 || newVolume > 100) {
      console.warn(`Invalid volume value: ${newVolume}`);
      return;
    }
    
    setComposition(prev => ({
      ...prev,
      audioRegions: prev.audioRegions.map(region => 
        region.id === regionId ? { ...region, volume: newVolume } : region
      )
    }));
  }, []);

  // Handle region deletion
  const handleDeleteRegion = useCallback((regionId) => {
    if (!regionId) return;
    
    if (window.confirm("Are you sure you want to delete this region?")) {
      setComposition(prev => ({
        ...prev,
        audioRegions: prev.audioRegions.filter(region => region.id !== regionId)
      }));
    }
  }, []);

  // Add new region
  const handleAddRegion = useCallback(() => {
    const newId = Date.now().toString();
    const newRegion = {
      id: newId,
      name: `New Region ${composition.audioRegions.length + 1}`,
      volume: 75
    };
    
    setComposition(prev => ({
      ...prev,
      audioRegions: [...prev.audioRegions, newRegion]
    }));
  }, [composition.audioRegions]);

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);
  
  // Handle settings changes
  const handleSettingsChange = useCallback((setting, value) => {
    setComposition(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }));
  }, []);
  
  // Display a notification that auto-dismisses
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);
  
  // Export composition
  const handleExportComposition = useCallback(async () => {
    try {
      setIsSaving(true);
      // In a real implementation, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      showNotification('Composition exported successfully!', 'success');
      setIsSaving(false);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export composition. Please try again.');
      setIsSaving(false);
    }
  }, [showNotification]);
  
  // Share composition
  const handleShareComposition = useCallback(() => {
    // In a real implementation, this would generate a sharing link
    navigator.clipboard.writeText(`https://eonta.app/composition/${composition.id || 'demo'}`)
      .then(() => {
        showNotification('Share link copied to clipboard!', 'success');
      })
      .catch(err => {
        console.error('Clipboard error:', err);
        setError('Failed to copy share link. Please try again.');
      });
  }, [composition.id, showNotification]);
  
  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">EONTA</h1>
          <div className="hidden md:flex ml-6 space-x-1">
            <button 
              onClick={() => setActiveTab('regions')}
              className={`px-3 py-1 rounded-md ${activeTab === 'regions' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              Regions
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1 rounded-md ${activeTab === 'settings' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              Settings
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '🌞' : '🌙'}
          </button>
          
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="User profile">
            <User size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          
          <button 
            onClick={toggleMobileMenu} 
            className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 px-4 py-2 shadow-sm">
          <button 
            onClick={() => {setActiveTab('regions'); setIsMobileMenuOpen(false);}}
            className="block w-full text-left py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Regions
          </button>
          <button 
            onClick={() => {setActiveTab('settings'); setIsMobileMenuOpen(false);}}
            className="block w-full text-left py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Settings
          </button>
        </div>
      )}
      
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-md ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          notification.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          {notification.message}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 flex items-start">
          <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map Area */}
        {isMapVisible && (
          <div className="flex-1 bg-gray-300 dark:bg-gray-700 relative" ref={mapRef}>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Interactive Map Area<br/>
                (Google Maps API Integration)
              </p>
            </div>
            
            {/* Map Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
              <button 
                className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Center map"
              >
                <MapPin size={20} className="text-blue-500" />
              </button>
              <button 
                onClick={() => setIsMapVisible(false)}
                className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Toggle map"
              >
                <Layers size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
        
        {/* Side Panel */}
        <div className={`${isMapVisible ? 'w-1/3 min-w-64 border-l' : 'w-full'} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-y-auto`}>
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold">{composition.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">By {composition.creator}</p>
              <p className="mt-2 text-sm">{composition.description}</p>
              
              <div className="flex items-center mt-3 space-x-2">
                <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <MapPin size={14} className="mr-1" /> {composition.location?.name || 'Unknown location'}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${composition.isPublic ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                  {composition.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button 
                onClick={() => setActiveTab('regions')}
                className={`py-2 px-4 font-medium text-sm ${activeTab === 'regions' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Audio Regions
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-4 font-medium text-sm ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Settings
              </button>
            </div>
            
            {/* Tab Content */}
            {activeTab === 'regions' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Audio Regions</h3>
                  <button 
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    onClick={handleAddRegion}
                  >
                    <Plus size={16} className="mr-1" /> Add Region
                  </button>
                </div>
                
                {renderRegionList()}
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div>
                <h3 className="font-medium mb-4">Composition Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Master Volume</span>
                    <div className="flex items-center w-32">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        defaultValue={composition.settings?.masterVolume || 80}
                        onChange={(e) => handleSettingsChange('masterVolume', parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        aria-label="Master volume"
                      />
                      <span className="ml-2 text-sm w-8">{composition.settings?.masterVolume || 80}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Audition Mode</span>
                    <label className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="sr-only"
                        checked={composition.settings?.auditionMode || false}
                        onChange={(e) => handleSettingsChange('auditionMode', e.target.checked)}
                        aria-label="Audition mode"
                      />
                      <span className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        composition.settings?.auditionMode ? 'transform translate-x-6' : ''
                      }`} />
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Show Transition Zones</span>
                    <label className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        className="sr-only"
                        checked={composition.settings?.showTransitionZones || false}
                        onChange={(e) => handleSettingsChange('showTransitionZones', e.target.checked)}
                        aria-label="Show transition zones"
                      />
                      <span className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        composition.settings?.showTransitionZones ? 'transform translate-x-6' : ''
                      }`} />
                    </label>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      className={`w-full py-2 px-4 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center ${
                        isSaving ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                      onClick={handleExportComposition}
                      disabled={isSaving}
                    >
                      <Download size={16} className="mr-2" /> 
                      {isSaving ? 'Exporting...' : 'Export Composition'}
                    </button>
                    
                    <button 
                      className="mt-2 w-full py-2 px-4 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
                      onClick={handleShareComposition}
                    >
                      <Share2 size={16} className="mr-2" /> Share Composition
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Floating Action Button (mobile) */}
      <div className="md:hidden fixed right-4 bottom-4">
        <button 
          onClick={() => setIsMapVisible(!isMapVisible)}
          className="p-4 bg-blue-600 rounded-full shadow-lg text-white"
          aria-label={isMapVisible ? 'Hide map' : 'Show map'}
        >
          {isMapVisible ? <Layers size={24} /> : <MapPin size={24} />}
        </button>
      </div>
    </div>
  );
};