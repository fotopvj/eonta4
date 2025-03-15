# EONTA Installation and Setup Guide

This guide will help you set up and run your modernized EONTA application with all security enhancements.

## Prerequisites

Before starting, ensure you have the following installed:

- Node.js 14 or higher
- MongoDB 4.4 or higher
- Git
- npm (comes with Node.js)
- Bower (`npm install -g bower`)
- Gulp (`npm install -g gulp-cli`)

You'll also need:
- Google Maps API key
- AWS account with S3 access
- MongoDB database (local or cloud)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/fotopvj/eonta2.git
cd eonta2
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Open the `.env` file and fill in your specific configuration values including:
- MongoDB connection string
- Google Maps API key
- AWS credentials
- Email settings (if needed)

### 3. Install Dependencies with Security Fixes

```bash
# Install server dependencies with security overrides
npm install

# This will also automatically run the postinstall script to install bower components
```

### 4. Build the Client-Side Assets

```bash
npm run build
```

### 5. Start MongoDB (if using locally)

```bash
# Open a new terminal and run:
mongod
```

### 6. Start the Development Server

```bash
npm run dev
```

The application should now be running at http://localhost:3000 (or whatever port you specified in your .env file).

## Verifying the Installation

1. Navigate to http://localhost:3000 in your browser
2. Allow location access when prompted
3. You should see the EONTA map interface load
4. Try creating a simple audio boundary with a test audio file

## Troubleshooting

### MongoDB Connection Issues

If you encounter MongoDB connection issues:

```bash
# Check MongoDB is running
mongo --eval "db.version()"

# Verify your connection string in .env file
# For local installs, use: mongodb://localhost:27017/eonta
```

### Google Maps API Issues

If the map doesn't load:

1. Check your API key in the .env file
2. Ensure your Google Maps API key has the following APIs enabled:
   - Maps JavaScript API
   - Geocoding API
   - Places API

### AWS S3 Issues

If audio upload fails:

1. Verify your AWS credentials in the .env file
2. Ensure your S3 bucket exists and has proper permissions
3. Check CORS configuration on your S3 bucket

## Deploying to Production

For production deployment:

1. Set `NODE_ENV=production` in your .env file
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server/app.js --name eonta
   ```

3. Set up proper SSL with a service like Let's Encrypt
4. Configure your web server (Nginx/Apache) as a reverse proxy

## Security Considerations

The modernized EONTA application includes several security enhancements:

1. **Package Security**:
   - Vulnerable dependencies have been updated
   - Security overrides have been applied
   - Minimal external dependencies are used

2. **API Security**:
   - Rate limiting is implemented for sensitive endpoints
   - Input validation is applied to all user inputs
   - Secure authentication with JWT

3. **Data Security**:
   - MongoDB schema validation
   - Secure AWS credential handling
   - HTTPS enforcement in production

## Maintaining Your Installation

To keep your EONTA installation secure:

1. Run regular security audits:
   ```bash
   npm audit
   ```

2. Apply security fixes when available:
   ```bash
   npm audit fix
   ```

3. Update dependencies regularly:
   ```bash
   npm update
   ```

4. Monitor logs for suspicious activity
5. Back up your MongoDB database regularly

## Getting Help

If you encounter any issues with your EONTA installation, please:

1. Check the troubleshooting section above
2. Review the error logs in the console
3. Refer to the thesis documentation for conceptual understanding
4. Open an issue on the GitHub repository with detailed error information

---

This modernized EONTA platform preserves the original vision of your thesis while adding enhanced security, improved performance, and better compatibility with modern browsers and devices. Enjoy creating immersive audio environments!
