import React, { useState, useEffect } from 'react';
import { Battery, Wifi, Map, Activity, Zap, XCircle, CheckCircle } from 'lucide-react';

const MobileOptimizationDemo = () => {
  // State for battery information
  const [batteryInfo, setBatteryInfo] = useState({
    level: null,
    charging: false,
    chargingTime: null,
    dischargingTime: null
  });
  
  // State for network information
  const [networkInfo, setNetworkInfo] = useState({
    type: 'unknown',
    downlink: null,
    rtt: null,
    effectiveType: 'unknown'
  });
  
  // State for device information
  const [deviceInfo, setDeviceInfo] = useState({
    memory: null,
    cpuCores: null,
    isLowEnd: false
  });
  
  // State for optimization status
  const [optimizationStatus, setOptimizationStatus] = useState({
    powerSaving: false,
    audioQuality: 'high',
    mapQuality: 'high',
    refreshRate: 1000,
    gpsAccuracy: 'high'
  });
  
  // State for current app state
  const [appState, setAppState] = useState({
    isBackgrounded: false,
    isRecording: false
  });
  
  // Function to update battery info in state
  const updateBatteryInfo = (battery) => {
    setBatteryInfo({
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime
    });
    
    // Update optimization status based on battery level
    updateOptimizationStatus(battery.level, battery.charging);
  };
  
  // Update optimization settings based on battery
  const updateOptimizationStatus = (batteryLevel, isCharging) => {
    if (isCharging) {
      // When charging, use high quality
      setOptimizationStatus({
        powerSaving: false,
        audioQuality: 'high',
        mapQuality: 'high',
        refreshRate: 1000,
        gpsAccuracy: 'high'
      });
    } else if (batteryLevel <= 0.15) {
      // Critical battery - aggressive power saving
      setOptimizationStatus({
        powerSaving: true,
        audioQuality: 'low',
        mapQuality: 'low',
        refreshRate: 3000,
        gpsAccuracy: 'low'
      });
    } else if (batteryLevel <= 0.3) {
      // Low battery - moderate power saving
      setOptimizationStatus({
        powerSaving: true,
        audioQuality: 'medium',
        mapQuality: 'medium',
        refreshRate: 2000,
        gpsAccuracy: 'medium'
      });
    } else {
      // Normal battery level
      setOptimizationStatus({
        powerSaving: false,
        audioQuality: 'high',
        mapQuality: 'high',
        refreshRate: 1000,
        gpsAccuracy: 'high'
      });
    }
  };
  
  // Simulate getting battery information
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        // Initial update
        updateBatteryInfo(battery);
        
        // Listen for changes
        battery.addEventListener('levelchange', () => updateBatteryInfo(battery));
        battery.addEventListener('chargingchange', () => updateBatteryInfo(battery));
      }).catch(err => {
        console.error('Error accessing battery info:', err);
      });
    } else {
      // Fallback for browsers without Battery API
      console.log('Battery API not supported');
      // Simulate a battery level
      setBatteryInfo({
        level: 0.75, 
        charging: false,
        chargingTime: null,
        dischargingTime: null
      });
      updateOptimizationStatus(0.75, false);
    }
    
    // Network information
    if ('connection' in navigator) {
      const conn = navigator.connection;
      setNetworkInfo({
        type: conn.type || 'unknown',
        downlink: conn.downlink,
        rtt: conn.rtt,
        effectiveType: conn.effectiveType
      });
      
      conn.addEventListener('change', () => {
        setNetworkInfo({
          type: conn.type || 'unknown',
          downlink: conn.downlink,
          rtt: conn.rtt,
          effectiveType: conn.effectiveType
        });
      });
    }
    
    // Device info
    setDeviceInfo({
      memory: navigator.deviceMemory || null,
      cpuCores: navigator.hardwareConcurrency || null,
      isLowEnd: (navigator.deviceMemory && navigator.deviceMemory < 4) ||
                (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)
    });
    
    // Document visibility for background state
    document.addEventListener('visibilitychange', () => {
      setAppState(prev => ({
        ...prev,
        isBackgrounded: document.hidden
      }));
    });
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', () => {});
    };
  }, []);
  
  // Toggle recording simulation
  const toggleRecording = () => {
    setAppState(prev => ({
      ...prev,
      isRecording: !prev.isRecording
    }));
  };
  
  // Render battery level indicator
  const renderBatteryLevel = () => {
    const level = batteryInfo.level !== null ? batteryInfo.level : 0.5;
    const percentage = Math.round(level * 100);
    let color = 'text-green-500';
    
    if (percentage <= 15) {
      color = 'text-red-500';
    } else if (percentage <= 30) {
      color = 'text-yellow-500';
    }
    
    return (
      <div className="flex items-center">
        <Battery className={`${color} mr-2`} size={24} />
        <div>
          <div className="flex items-center">
            <span className={`font-bold ${color}`}>{percentage}%</span>
            {batteryInfo.charging && (
              <Zap size={16} className="ml-1 text-yellow-500" />
            )}
          </div>
          <div className="text-xs text-gray-500">
            {batteryInfo.charging ? 'Charging' : 'Not charging'}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 w-full max-w-lg">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
        Mobile Optimization Status
      </h2>
      
      {/* Device Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
          {renderBatteryLevel()}
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md flex items-center">
          <Wifi className="mr-2 text-blue-500" size={24} />
          <div>
            <div className="font-medium">{networkInfo.effectiveType}</div>
            <div className="text-xs text-gray-500">
              {networkInfo.downlink ? `${networkInfo.downlink} Mbps` : 'Unknown speed'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Device Capabilities */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Device Capabilities
        </h3>
        
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Memory:</span>
            <div>{deviceInfo.memory ? `${deviceInfo.memory}GB RAM` : 'Unknown'}</div>
          </div>
          
          <div>
            <span className="text-gray-500 dark:text-gray-400">CPU:</span>
            <div>{deviceInfo.cpuCores ? `${deviceInfo.cpuCores} cores` : 'Unknown'}</div>
          </div>
          
          <div>
            <span className="text-gray-500 dark:text-gray-400">Device Class:</span>
            <div className={deviceInfo.isLowEnd ? 'text-orange-500' : 'text-green-500'}>
              {deviceInfo.isLowEnd ? 'Low-end' : 'Standard/High-end'}
            </div>
          </div>
          
          <div>
            <span className="text-gray-500 dark:text-gray-400">App State:</span>
            <div>{appState.isBackgrounded ? 'Background' : 'Foreground'}</div>
          </div>
        </div>
      </div>
      
      {/* Current Optimizations */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Current Optimizations
        </h3>
        
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
          <div className="flex justify-between items-center mb-3">
            <span>Power Saving Mode:</span>
            <div className="flex items-center">
              {optimizationStatus.powerSaving ? (
                <>
                  <span className="text-yellow-500 font-medium">Enabled</span>
                  <CheckCircle size={16} className="ml-1 text-yellow-500" />
                </>
              ) : (
                <>
                  <span className="text-green-500 font-medium">Disabled</span>
                  <XCircle size={16} className="ml-1 text-green-500" />
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Audio Quality:</span>
              <span className={
                optimizationStatus.audioQuality === 'low' ? 'text-orange-500' :
                optimizationStatus.audioQuality === 'medium' ? 'text-yellow-500' :
                'text-green-500'
              }>
                {optimizationStatus.audioQuality}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Map Quality:</span>
              <span className={
                optimizationStatus.mapQuality === 'low' ? 'text-orange-500' :
                optimizationStatus.mapQuality === 'medium' ? 'text-yellow-500' :
                'text-green-500'
              }>
                {optimizationStatus.mapQuality}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">GPS Accuracy:</span>
              <span className={
                optimizationStatus.gpsAccuracy === 'low' ? 'text-orange-500' :
                optimizationStatus.gpsAccuracy === 'medium' ? 'text-yellow-500' :
                'text-green-500'
              }>
                {optimizationStatus.gpsAccuracy}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Refresh Rate:</span>
              <span>{optimizationStatus.refreshRate}ms</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex flex-col space-y-2">
        <button 
          onClick={toggleRecording}
          className={`py-3 rounded-md flex items-center justify-center ${
            appState.isRecording 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Activity size={18} className="mr-2" />
          {appState.isRecording ? 'Stop Recording' : 'Simulate Recording'}
        </button>
        
        <div className="text-xs text-center text-gray-500 mt-1">
          Recording state affects power optimization settings
        </div>
      </div>
    </div>
  );
};

export default MobileOptimizationDemo;
