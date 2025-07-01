# Golden Gate Investment Memorandum Generator

## Overview

The Golden Gate memo generator is an AI-powered platform that transforms decks, business plans, and call notes into first-draft VC investment memorandums. For founders, it provides insights into how VCs evaluate businesses and streamlines the process of presenting companies to investors. The tool works best when provided with comprehensive context - we recommend recording your pitch and uploading the transcript alongside supporting materials.

## Features

### 🔄 Smart Document Processing
- **Multiple Format Support**: PDF, Word documents, scanned materials
- **Intelligent OCR**: Automatic detection and processing of scanned documents
- **Google Drive Integration**: Bypasses file size limits with cloud-based processing
- **Web Content Integration**: Extract and analyze content from URLs

### 🤖 AI-Powered Analysis
- **Automated Market Research**: Comprehensive competitor and market analysis
- **Market Sizing**: Growth rate calculations and market opportunity assessment
- **Team Analysis**: LinkedIn profile integration for founder background evaluation
- **Content Moderation**: Built-in safety checks for appropriate content

### 📊 Comprehensive Output
- **Full Investment Memorandums**: 15-section detailed analysis including:
  - Executive Summary & Deal Terms
  - Market Overview & Competitive Landscape
  - Product/Solution Analysis
  - Team Assessment & Go-to-Market Strategy
  - Financial Overview & Risk Analysis
  - Exit Strategy & Use of Funds
- **Follow-up Questions**: Tailored questions for deeper founder engagement
- **Word Export**: Professional .docx format for easy sharing

### 📈 Quality & Observability
- **Feedback Integration**: Portkey API integration for quality monitoring
- **Performance Optimization**: Context management for large documents
- **Error Handling**: Robust timeout and error recovery mechanisms

## Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- Python (v3.8 or higher)
- Google Cloud account with Vision API enabled
- Google Drive API access (for file processing)

### Required API Keys
Set up accounts and obtain API keys for:
- **OpenAI API** (GPT-4 access required)
- **Portkey API** (for observability and routing)
- **EXA AI API** (for market research)
- **Proxycurl API** (for LinkedIn data)
- **Google Cloud** (Vision API and Drive API)

## Installation

1. **Clone Repository**
```bash
git clone https://github.com/your-org/memo-generator.git
cd memo-generator
```

2. **Install Dependencies**
```bash
# Node.js dependencies
npm install

# Python dependencies
pip install -r requirements.txt
pip install 'crewai[tools]'
```

3. **Build Project**
```bash
npm run build
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# AI Services
OPENAI_API_KEY=your-openai-api-key
PORTKEY_API_KEY=your-portkey-api-key
EXA_API_KEY=your-exa-api-key
PROXYCURL_API_KEY=your-proxycurl-api-key

# Google Cloud Services
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./cloud-credentials.json
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-optional

# Server Configuration
PORT=3002
```

### Google Cloud Setup

1. **Create Google Cloud Project**
   - Enable Cloud Vision API
   - Enable Google Drive API

2. **Create Service Account**
   - Generate JSON credentials file
   - Assign roles:
     - `Cloud Vision AI Service Agent`
     - `Storage Object Admin`
     - `Drive File Access` (for Drive integration)

3. **Place Credentials**
   - Save JSON file as `cloud-credentials.json` in project root
   - Set `GOOGLE_SERVICE_ACCOUNT_KEY` as JSON string in environment

### Vercel Deployment Setup

Configure these environment variables in Vercel:
- All API keys from `.env`
- `GOOGLE_SERVICE_ACCOUNT_KEY` as the full JSON string
- Set function timeout to 300 seconds (5 minutes)

## Usage

### Development
```bash
npm run dev  # Runs both frontend and backend
```

### Production
```bash
npm run build
npm start
```

### Deployment
```bash
vercel --prod
```

## Architecture

### File Processing Flow
1. **Upload**: Files sent via FormData to `/api/upload`
2. **Storage**: Large files uploaded to Google Drive (bypasses Vercel limits)
3. **Processing**: 
   - Regular docs: Direct text extraction
   - Scanned docs: OCR via Google Vision API
4. **Analysis**: AI-powered market research and memo generation
5. **Cleanup**: Temporary files automatically removed

### Performance Optimizations
- **Context Management**: Intelligent content chunking for large documents
- **Parallel Processing**: Concurrent URL fetching and LinkedIn analysis
- **Timeout Protection**: Graceful handling of long-running operations
- **File Size Limits**: Client-side validation (10MB per file, 15MB total)

### Error Handling
- Content moderation checks
- OCR timeout protection (90 seconds)
- Network request timeouts
- Graceful degradation for failed services

## Project Structure

```
memo-generator/
├── api/
│   ├── index.js              # Main API server
│   ├── googleDriveService.js  # Google Drive integration
│   └── blobStorage.js         # Legacy blob storage
├── src/
│   ├── components/            # React components
│   ├── App.jsx               # Main application
│   └── index.jsx             # Entry point
├── public/                   # Static assets
├── main.py                   # Python market analysis
├── agents.py                 # AI agents configuration
├── vercel.json               # Deployment configuration
└── package.json              # Dependencies and scripts
```

## Limitations

- **Scope**: Provides 50-60% of final memo work; human review required
- **Model Limitations**: Subject to OpenAI model capabilities and biases
- **Market Data**: Estimates require supplemental bottoms-up analysis
- **File Processing**: 10MB per file limit, 15MB total request size
- **Processing Time**: Complex documents may take 3-5 minutes

## Troubleshooting

### Common Issues

**413 Request Too Large**
- Reduce file sizes (< 8MB per file)
- Use fewer files per request
- Check total request size (< 15MB)

**OCR Timeout**
- Try with smaller/clearer scanned documents
- Ensure Google Vision API is properly configured

**LinkedIn Data Missing**
- Verify Proxycurl API key and credits
- Check LinkedIn URL format

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

Released under the MIT License. See [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Create GitHub issue for bugs
- Check [example output memo](https://docsend.com/view/ke4jyy5yr3y3wmsf)
- Review system architecture diagram in `/image/structure.jpg`