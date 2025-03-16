# Deploying EONTA to Render

This guide will walk you through deploying your EONTA application to Render.

## Prerequisites

1. A [Render account](https://render.com) (you can sign up using GitHub)
2. Your EONTA application code in a GitHub repository
3. AWS S3 bucket already set up
4. MongoDB database already set up (or you can create one through Render)

## Deployment Steps

### 1. Push Your Code to GitHub

Make sure your local changes are pushed to your GitHub repository:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push
```

### 2. Create a New Web Service on Render

1. Log into your Render dashboard: https://dashboard.render.com/
2. Click on "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure your service:
   - **Name**: eonta
   - **Environment**: Node
   - **Build Command**: `chmod +x build.sh && ./build.sh`
   - **Start Command**: `npm start`

### 3. Configure Environment Variables

You'll need to set up the following environment variables in the Render dashboard:

- `NODE_ENV`: production
- `PORT`: 3000
- `MONGODB_URI`: Your MongoDB connection string
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: Your AWS region (e.g., us-east-1)
- `S3_BUCKET_NAME`: Your S3 bucket name
- `JWT_SECRET`: Auto-generated secure string
- `JWT_EXPIRATION`: 7d
- `CORS_ALLOWED_ORIGINS`: https://eonta.onrender.com
- `SESSION_SECRET`: Auto-generated secure string
- `MAX_AUDIO_FILE_SIZE_MB`: 30
- `ALLOWED_AUDIO_FORMATS`: wav,mp3,m4a,ogg,aac,flac

### 4. Deploy

Click on "Create Web Service" to start the deployment process. Render will build and deploy your application automatically.

## Setting Up a MongoDB Database on Render (Optional)

If you don't have a MongoDB database yet, you can create one through Render:

1. In your Render dashboard, click "New" and select "PostgreSQL"
2. Configure your database settings
3. After creation, copy the internal connection string
4. Update your application's `MONGODB_URI` environment variable with this connection string

## Continuous Deployment

Render automatically deploys your application whenever you push changes to your GitHub repository. No additional configuration is needed.

## Monitoring

You can monitor your application logs and metrics through the Render dashboard:

1. Go to your Web Service in the Render dashboard
2. Click on "Logs" to view application logs
3. Click on "Metrics" to view performance metrics

## Troubleshooting

If you encounter any issues during deployment:

1. Check your application logs in the Render dashboard
2. Verify that all environment variables are set correctly
3. Make sure your `build.sh` script is executable (`chmod +x build.sh`)
4. Check if FFmpeg was installed correctly by examining the build logs

## Custom Domain (Optional)

To use a custom domain with your Render deployment:

1. Go to your Web Service in the Render dashboard
2. Click on "Settings" and scroll to "Custom Domain"
3. Follow the instructions to add and verify your domain
