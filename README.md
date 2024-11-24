# WebRTC Signaling Server

WebRTC signaling server for real-time peer-to-peer communication, configured for AWS Elastic Beanstalk deployment.

## Prerequisites

- Node.js 18 or higher
- AWS CLI configured with appropriate credentials
- EB CLI installed (`pip install awsebcli`)

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run in production mode
npm start
```

## Deployment to Elastic Beanstalk

1. Initialize EB CLI (first time only):

```bash
eb init -p node.js webrtc-signaling
```

2. Create environment (first time only):

```bash
eb create webrtc-signaling-prod
```

3. Deploy updates:

```bash
eb deploy
```

4. Set environment variables:

```bash
eb setenv ALLOWED_ORIGINS=https://your-frontend-domain.com NODE_ENV=production
```

## Environment Variables

- `PORT`: Server port (default: 8081)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `NODE_ENV`: Environment mode (development/production)

## Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Start production server
- `npm run dev`: Start development server with hot reload
