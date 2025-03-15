# EONTA System Architecture

This document outlines the modernized EONTA application architecture, ensuring alignment with the original thesis vision while incorporating security enhancements and performance optimizations.

## Core Architecture

EONTA maintains its original architecture as described in the thesis, with these key components:

### Server-Side Components

1. **Node.js Server**
   - Serves the web application assets
   - Handles API requests to MongoDB
   - Manages authentication and security
   - Processes audio files and boundary data

2. **MongoDB Database**
   - Stores audio boundary coordinates
   - Saves composition metadata
   - Maintains user accounts and preferences
   - Uses secure schemas with validation

3. **Amazon S3 Storage**
   - Securely hosts audio files
   - Generates pre-signed URLs for access control
   - Provides reliable cloud storage for compositions

4. **Path Map Generator**
   - Generates visual maps of user paths
   - Creates shareable journey visualizations
   - Integrates with Google Maps API

### Client-Side Components

1. **Core Services**
   - **EnhancedAudioService**: Handles audio playback with Web Audio API
   - **PathRecorderService**: Manages GPS position tracking
   - **BoundaryTransitionManager**: Controls audio transitions between regions
   - **MapUtils**: Provides geospatial calculations and polygon management

2. **User Interface Components**
   - **EontaCompositionViewer**: Main interface for composition management
   - **PathRecorderUI**: Interface for recording and sharing journeys
   - **BoundaryTransitionSettings**: Controls for audio transition behavior

## Audio System

The audio system remains true to the original concept with these key features:

1. **Boundary-Based Triggering**
   - Audio files play when user enters defined boundaries
   - Smooth transitions between regions
   - Support for overlapping regions with crossfades
   - Spatial audio effects based on position

2. **Audio Processing Features**
   - Volume fading for smooth transitions
   - Filter effects (lowpass, highpass)
   - Reverb and delay processing
   - Pitch shifting and spatial audio

3. **Performance Optimizations**
   - Efficient audio buffer management
   - Optimized transition calculations
   - Memory leak prevention
   - Mobile-friendly playback

## Geospatial Features

The mapping and geospatial functionality includes:

1. **Google Maps Integration**
   - Interactive map for composing boundaries
   - Accurate GPS position tracking
   - Polygon drawing tools
   - Boundary visualization

2. **Path Recording**
   - Records user journeys through compositions
   - Creates shareable composition experiences
   - Generates visual path maps
   - Captures audio experiences

## Security Enhancements

The modernized application includes these security improvements:

1. **Input Validation**
   - Coordinate validation for boundaries
   - Audio file validation
   - Secure URL handling
   - Parameter sanitization

2. **Dependency Security**
   - Updated vulnerable libraries
   - Secure package overrides
   - Minimized external dependencies
   - Proper version constraints

3. **Data Security**
   - Secure MongoDB schemas
   - Proper AWS credential handling
   - Sanitized error messages
   - Secure file operations

4. **User Privacy**
   - Optional location tracking
   - Minimal data collection
   - Secure sharing mechanisms
   - Clear user controls

## System Flow

### Composition Creation Process

1. User navigates to a location on the map
2. User creates boundaries using the polygon drawing tool
3. User uploads audio files for each boundary
4. User adjusts transition settings for each boundary
5. Composition is saved to the database with audio files to S3

### Playback Experience Process

1. User navigates to a saved composition
2. EONTA loads the composition boundaries and audio references
3. User's GPS position is tracked in real-time
4. Audio playback is triggered when user enters boundaries
5. Transitions are applied based on position and movement
6. Path recording captures the journey experience

## Modernization Benefits

The modernized EONTA platform preserves the original vision while adding:

1. **Enhanced Security**: Protection against common vulnerabilities
2. **Improved Performance**: Faster loading and smoother playback
3. **Better Mobile Support**: Optimized for modern mobile browsers
4. **Error Resilience**: Graceful handling of network and device issues
5. **Accessibility**: Improved interface for all users

This architecture maintains fidelity to the original thesis vision while ensuring the application is secure, performant, and ready for modern web environments.