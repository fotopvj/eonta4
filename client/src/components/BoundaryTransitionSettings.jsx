import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sliders, ChevronDown, ChevronUp, Check, Play, Volume2, Music, Filter, AlertCircle } from 'lucide-react';

/**
 * Boundary Transition Settings Component
 * Manages audio transition settings for region boundaries
 */
const BoundaryTransitionSettings = ({ boundary, onChange, onPreview }) => {
  // If no boundary provided, use sample data for demonstration
  const defaultBoundary = {
    id: "region1",
    name: "Fountain Area",
    transitionSettings: {
      fadeInLength: 1.5,
      fadeOutLength: 2.0,
      fadeInType: "volume_fade",
      fadeOutType: "lowpass_filter",
      transitionRadius: 10,
      blendingEnabled: true,
      crossfadeOverlap: true,
      advancedSettings: {
        lowpassFrequency: {
          start: 20000,
          end: 500
        },
        highpassFrequency: {
          start: 20,
          end: 2000
        },
        reverbMix: {
          start: 0.1,
          end: 0.7
        }
      }
    }
  };
  
  const [boundaryData, setBoundaryData] = useState(boundary || defaultBoundary);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('entry');
  const [settings, setSettings] = useState(boundaryData.transitionSettings);
  const [error, setError] = useState(null);
  const prevBoundaryRef = useRef();
  
  // Update settings when boundary changes
  useEffect(() => {
    if (boundary && boundary.id !== prevBoundaryRef.current?.id) {
      setBoundaryData(boundary);
      setSettings(boundary.transitionSettings);
      prevBoundaryRef.current = boundary;
    }
  }, [boundary]);
  
  // Handle settings change
  const handleChange = useCallback((property, value) => {
    try {
      // Validate input
      if (property === 'transitionRadius') {
        // Ensure transition radius is within reasonable limits
        value = Math.max(1, Math.min(50, value));
      } else if (property === 'fadeInLength' || property === 'fadeOutLength') {
        // Ensure fade lengths are within reasonable limits
        value = Math.max(0.1, Math.min(10, value));
      }
      
      const newSettings = { ...settings, [property]: value };
      setSettings(newSettings);
      
      // Notify parent component
      if (onChange) {
        onChange(newSettings);
      }
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('Error updating setting:', err);
      setError(`Failed to update ${property}: ${err.message}`);
    }
  }, [settings, onChange]);
  
  // Handle advanced settings change
  const handleAdvancedChange = useCallback((category, property, value) => {
    try {
      const advancedSettings = { ...settings.advancedSettings };
      
      if (!advancedSettings[category]) {
        advancedSettings[category] = {};
      }
      
      // Validate values based on category
      if (category === 'lowpassFrequency' || category === 'highpassFrequency') {
        // Frequency values should be within audible range
        value = Math.max(20, Math.min(20000, value));
      } else if (category === 'reverbMix') {
        // Mix values should be between 0 and 1
        value = Math.max(0, Math.min(1, value));
      }
      
      advancedSettings[category][property] = value;
      
      const newSettings = { ...settings, advancedSettings };
      setSettings(newSettings);
      
      // Notify parent component
      if (onChange) {
        onChange(newSettings);
      }
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('Error updating advanced setting:', err);
      setError(`Failed to update ${category}.${property}: ${err.message}`);
    }
  }, [settings, onChange]);
  
  // Preview transition effect
  const handlePreview = useCallback((transitionType) => {
    if (!onPreview) return;
    
    try {
      onPreview(transitionType, settings);
    } catch (err) {
      console.error('Error previewing transition:', err);
      setError(`Failed to preview transition: ${err.message}`);
    }
  }, [settings, onPreview]);
  
  // Available transition types
  const transitionTypes = [
    { id: 'volume_fade', name: 'Volume Fade', icon: <Volume2 size={16} /> },
    { id: 'lowpass_filter', name: 'Low Pass Filter', icon: <Filter size={16} /> },
    { id: 'highpass_filter', name: 'High Pass Filter', icon: <Filter size={16} /> },
    { id: 'reverb_tail', name: 'Reverb Tail', icon: <Music size={16} /> },
    { id: 'pitch_shift', name: 'Pitch Shift', icon: <Music size={16} /> },
    { id: 'delay_feedback', name: 'Delay Feedback', icon: <Music size={16} /> },
    { id: 'doppler', name: 'Doppler Effect', icon: <Music size={16} /> },
    { id: 'spatial_blend', name: 'Spatial Blend', icon: <Music size={16} /> }
  ];
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
            <Sliders size={20} className="mr-2 text-blue-500" />
            Audio Boundary Transitions
          </h2>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={expanded ? "Collapse advanced settings" : "Expand advanced settings"}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure how audio fades in and out as users move through boundaries
        </p>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded flex items-start">
          <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}
      
      {/* Basic Controls (always visible) */}
      <div className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Transition Radius (meters)
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={settings.transitionRadius}
            onChange={(e) => handleChange('transitionRadius', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            aria-label={`Transition radius: ${settings.transitionRadius} meters`}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>1m</span>
            <span>{settings.transitionRadius}m</span>
            <span>50m</span>
          </div>
        </div>
        
        {/* Tabs for Entry/Exit */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            className={`py-2 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'entry'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('entry')}
            aria-pressed={activeTab === 'entry'}
          >
            Entry Transition
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm border-b-2 ${
              activeTab === 'exit'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
            onClick={() => setActiveTab('exit')}
            aria-pressed={activeTab === 'exit'}
          >
            Exit Transition
          </button>
        </div>
        
        {/* Entry/Exit Settings */}
        {activeTab === 'entry' ? (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fade In Length (seconds)
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={settings.fadeInLength}
                  onChange={(e) => handleChange('fadeInLength', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  aria-label={`Fade in length: ${settings.fadeInLength.toFixed(1)} seconds`}
                />
                <span className="ml-2 text-sm min-w-12 text-gray-600 dark:text-gray-300">
                  {settings.fadeInLength.toFixed(1)}s
                </span>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fade In Type
                </label>
                <button 
                  onClick={() => handlePreview(settings.fadeInType)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 py-1 px-2 rounded flex items-center"
                  aria-label="Preview fade in effect"
                >
                  <Play size={12} className="mr-1" /> Preview
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {transitionTypes.map(type => (
                  <button
                    key={`entry-${type.id}`}
                    className={`flex items-center px-3 py-2 rounded-md text-sm ${
                      settings.fadeInType === type.id
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => handleChange('fadeInType', type.id)}
                    aria-pressed={settings.fadeInType === type.id}
                  >
                    <span className="mr-2">{type.icon}</span>
                    <span className="truncate">{type.name}</span>
                    {settings.fadeInType === type.id && (
                      <Check size={16} className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fade Out Length (seconds)
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={settings.fadeOutLength}
                  onChange={(e) => handleChange('fadeOutLength', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  aria-label={`Fade out length: ${settings.fadeOutLength.toFixed(1)} seconds`}
                />
                <span className="ml-2 text-sm min-w-12 text-gray-600 dark:text-gray-300">
                  {settings.fadeOutLength.toFixed(1)}s
                </span>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fade Out Type
                </label>
                <button 
                  onClick={() => handlePreview(settings.fadeOutType)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 py-1 px-2 rounded flex items-center"
                  aria-label="Preview fade out effect"
                >
                  <Play size={12} className="mr-1" /> Preview
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {transitionTypes.map(type => (
                  <button
                    key={`exit-${type.id}`}
                    className={`flex items-center px-3 py-2 rounded-md text-sm ${
                      settings.fadeOutType === type.id
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => handleChange('fadeOutType', type.id)}
                    aria-pressed={settings.fadeOutType === type.id}
                  >
                    <span className="mr-2">{type.icon}</span>
                    <span className="truncate">{type.name}</span>
                    {settings.fadeOutType === type.id && (
                      <Check size={16} className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Toggle options */}
        <div className="space-y-2 mb-4 mt-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="blendingEnabled"
              checked={settings.blendingEnabled}
              onChange={(e) => handleChange('blendingEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              aria-label="Enable transition blending"
            />
            <label htmlFor="blendingEnabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable transition blending
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="crossfadeOverlap"
              checked={settings.crossfadeOverlap}
              onChange={(e) => handleChange('crossfadeOverlap', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              aria-label="Enable crossfade between overlapping regions"
            />
            <label htmlFor="crossfadeOverlap" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable crossfade between overlapping regions
            </label>
          </div>
        </div>
      </div>
      
      {/* Advanced Settings (expandable) */}
      {expanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            Advanced Settings
          </h3>
          
          {/* Show specific settings based on selected transition types */}
          {(settings.fadeInType === 'lowpass_filter' || settings.fadeOutType === 'lowpass_filter') && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Low Pass Filter Settings
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Start Frequency (Hz)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="20"
                      max="20000"
                      step="10"
                      value={settings.advancedSettings.lowpassFrequency.start}
                      onChange={(e) => handleAdvancedChange(
                        'lowpassFrequency',
                        'start',
                        Number(e.target.value)
                      )}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      aria-label={`Low pass filter start frequency: ${settings.advancedSettings.lowpassFrequency.start} Hz`}
                    />
                    <span className="ml-2 text-xs min-w-16 text-gray-600 dark:text-gray-300">
                      {settings.advancedSettings.lowpassFrequency.start} Hz
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    End Frequency (Hz)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="20"
                      max="20000"
                      step="10"
                      value={settings.advancedSettings.lowpassFrequency.end}
                      onChange={(e) => handleAdvancedChange(
                        'lowpassFrequency',
                        'end',
                        Number(e.target.value)
                      )}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      aria-label={`Low pass filter end frequency: ${settings.advancedSettings.lowpassFrequency.end} Hz`}
                    />
                    <span className="ml-2 text-xs min-w-16 text-gray-600 dark:text-gray-300">
                      {settings.advancedSettings.lowpassFrequency.end} Hz
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {(settings.fadeInType === 'reverb_tail' || settings.fadeOutType === 'reverb_tail') && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Reverb Settings
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Start Mix (Dry/Wet)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.advancedSettings.reverbMix.start}
                      onChange={(e) => handleAdvancedChange(
                        'reverbMix',
                        'start',
                        Number(e.target.value)
                      )}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      aria-label={`Reverb start mix: ${(settings.advancedSettings.reverbMix.start * 100).toFixed(0)}%`}
                    />
                    <span className="ml-2 text-xs min-w-12 text-gray-600 dark:text-gray-300">
                      {(settings.advancedSettings.reverbMix.start * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    End Mix (Dry/Wet)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.advancedSettings.reverbMix.end}
                      onChange={(e) => handleAdvancedChange(
                        'reverbMix',
                        'end',
                        Number(e.target.value)
                      )}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      aria-label={`Reverb end mix: ${(settings.advancedSettings.reverbMix.end * 100).toFixed(0)}%`}
                    />
                    <span className="ml-2 text-xs min-w-12 text-gray-600 dark:text-gray-300">
                      {(settings.advancedSettings.reverbMix.end * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Add settings for other effect types as needed */}
        </div>
      )}
    </div>
  );
};

export default BoundaryTransitionSettings;