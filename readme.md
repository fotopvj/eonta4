# EONTA: Enhanced GPS Audio Installation Platform

EONTA is a web-based compositional utility for creating immersive audio environments using GPS-based audio authoring. The platform allows artists, composers, and novice technologists to build multi-track sound installations using interactive maps.

## Features

### GPS-Based Audio Composition
- Create audio boundaries on maps using polygon drawing tools
- Upload audio files to play within defined geographical areas
- Experience compositions by physically moving through spaces
- Test compositions in Audition Mode without physical movement

### Advanced Audio Boundary Transitions
- Multiple transition types (volume fade, filters, reverb, doppler, etc.)
- Customizable transition radii and fade durations
- Crossfades between overlapping regions
- Real-time audio processing using Web Audio API

### Path Recording
- Record your journey through audio installations
- Generate downloadable compositions of your unique audio experience
- Create visual maps of your path alongside your audio
- Share your journey via email

## Technical Implementation

### Client-side Features
- React components for user interface
- Interactive map integration with Google Maps API
- Enhanced audio playback with advanced transition effects
- Path recording and visualization

### Server-side Features
- Path map generation from GPS coordinates
- Audio composition processing
- Enhanced email service with path maps and statistics
- Secure file storage with Amazon S3

## Setup and Installation

See the [Installation Guide](docs/Installation_Guide.md) for detailed setup instructions.

### Prerequisites
- Node.js 14+
- MongoDB
- AWS account for S3 storage
- Google Maps API key

### Quick Start
```bash
# Clone the repository
git clone https://github.com/fotopvj/eonta3.git
cd eonta3

# Create your environment file
cp .env.example .env

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Architecture

EONTA follows a client-server architecture with React components on the frontend and Node.js services on the backend. See the [System Architecture](docs/EONTA_System_Architecture.md) document for a detailed overview.

## File Structure

```
eonta3/
├── client/                # Client-side code
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # Audio and map services
│   │   └── app.js         # Main client application
│   └── assets/            # Static assets
├── server/                # Server-side code
│   ├── models/            # Database models
│   ├── services/          # Server services
│   └── app.js             # Express server
└── docs/                  # Documentation
```

## Usage

### Creating a Sound Installation
1. Navigate to the map
2. Create boundaries using the polygon tool
3. Upload audio files for each boundary
4. Configure transition settings for each boundary
5. Save your composition

### Experiencing a Sound Installation
1. Open the composition on your mobile device
2. Walk through the installation to hear the audio
3. Use the Path Recorder to capture your journey
4. Receive a downloadable composition and path map

## About

EONTA was originally developed as part of a Master's thesis in Music Technology at New York University's Steinhardt School. This modernized version includes security enhancements, performance improvements, and compatibility with modern web technologies.

## License

This project is licensed under the MIT License - see the LICENSE file for details.