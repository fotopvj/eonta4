#!/bin/bash

# Install dependencies
npm install

# Install FFmpeg
apt-get update
apt-get install -y ffmpeg

# Verify FFmpeg installation
ffmpeg -version

# Build your application (if needed)
# npm run build