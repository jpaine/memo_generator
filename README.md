# Investment Memorandum Generator

A full-stack application that generates investment memoranda using AI analysis. The application is split into separate frontend and backend deployments for scalability.

## Architecture

- **Frontend**: React/Vite app deployed on Vercel
- **Backend**: Node.js/Express API deployed on Render

## Repositories Structure

```
memo_generator/
├── frontend/          # React frontend (deploy to Vercel)
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vercel.json
│   └── .env.example
├── backend/           # Express API (deploy to Render)
│   ├── index.js
│   ├── agents.py
│   ├── main.py
│   ├── package.json
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
└── README.md
```

## Deployment Instructions

### Backend Deployment (Render)

1. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Select the `backend` folder as the root directory
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Starter or higher (recommended for 50MB file uploads)

2. **Environment Variables** (Add in Render dashboard):
   ```bash
   NODE_ENV=production
   OPENAI_API_KEY=your-openai-api-key
   EXA_API_KEY=your-exa-api-key
   PROXYCURL_API_KEY=your-proxycurl-api-key
   PORTKEY_API_KEY=your-portkey-api-key
   GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   GOOGLE_DRIVE_FOLDER_ID=your-folder-id-optional
   FRONTEND_URL=https://your-frontend-app.vercel.app
   ```

3. **Python Dependencies**: Render will automatically install Python requirements from `requirements.txt`

### Frontend Deployment (Vercel)

1. **Create a new Project on Vercel**
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

2. **Environment Variables** (Add in Vercel dashboard):
   ```bash
   VITE_API_URL=https://your-backend-app.onrender.com
   ```

## Local Development

### Backend
```bash
cd backend
npm install
pip install -r requirements.txt
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Create `.env` files in both directories based on the `.env.example` files.

## Key Features

- **File Upload**: Support for PDF, DOCX, and image files (up to 50MB on Render)
- **OCR Processing**: Automatic text extraction from images and PDFs
- **AI Analysis**: Multi-agent AI system for comprehensive investment analysis
- **Document Generation**: Export to DOCX format
- **Google Drive Integration**: Automatic backup to Google Drive

## API Endpoints

- `POST /api/upload` - Main analysis endpoint
- `POST /api/feedback` - Feedback submission
- `GET /api/health` - Health check

## Error Resolution

### 413 Request Entity Too Large
The split architecture resolves the 413 error by:
- Moving to Render's larger instance types (50MB+ support)
- Separating frontend/backend eliminates Vercel's 4.5MB serverless limit
- Dedicated backend resources for file processing

### CORS Issues
Update `FRONTEND_URL` environment variable in backend with your actual Vercel domain.

## Monitoring

- **Backend**: Monitor via Render dashboard
- **Frontend**: Monitor via Vercel dashboard
- **Logs**: Check respective platform dashboards for debugging

## Scaling

- **Backend**: Upgrade Render plan for more resources
- **Frontend**: Vercel auto-scales static assets
- **Database**: Add PostgreSQL service on Render if needed

## Support

For deployment issues:
- Render: [Render Docs](https://render.com/docs)
- Vercel: [Vercel Docs](https://vercel.com/docs)
