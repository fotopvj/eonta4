# FFmpeg Installation for EONTA

FFmpeg is required for the audio conversion functionality in EONTA. This guide explains how to install it on different platforms.

## Ubuntu/Debian

```bash
sudo apt update
sudo apt install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

## macOS

Using Homebrew:
```bash
brew install ffmpeg
```

## Windows

1. Download the latest FFmpeg build from https://ffmpeg.org/download.html#build-windows
2. Extract the downloaded zip file
3. Add the `bin` folder to your system PATH environment variable
4. Verify installation by opening a new command prompt and typing:
   ```
   ffmpeg -version
   ```

## Heroku Deployment

For Heroku deployment, you'll need to add the FFmpeg buildpack:

```bash
heroku buildpacks:add https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
```

## After Installing FFmpeg

After installing FFmpeg, you'll need to install the Node.js packages that interface with it:

```bash
npm install fluent-ffmpeg tmp --save
```

These packages are already included in the updated package.json, so if you've run `npm install` after updating that file, you should be good to go.

## Troubleshooting

If you encounter issues with FFmpeg:

1. Ensure FFmpeg is installed and available in your PATH
2. Try running `ffmpeg -version` to confirm it's properly installed
3. Make sure you have the necessary permissions to execute FFmpeg
4. Check that the temporary directories used by the application are writable

## For Development

When testing audio conversion locally:
1. Use smaller audio files initially
2. Check the console logs for conversion progress and errors
3. Verify that converted files are being properly uploaded to S3
