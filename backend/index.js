require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");
const { PORTKEY_GATEWAY_URL, createHeaders } = require("portkey-ai");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const path = require("path");
const HTMLtoDOCX = require("html-to-docx");
const { chromium } = require('playwright');
const vision = require("@google-cloud/vision");
const { Storage } = require("@google-cloud/storage");
const { spawn } = require("child_process");
const cors = require("cors");
const crypto = require("crypto");
const GoogleDriveService = require('./googleDriveService');
const Portkey = require("portkey-ai").default;

// Initialize Google Drive service and Portkey
const driveService = new GoogleDriveService();
const portkey = new Portkey({ apiKey: process.env.PORTKEY_API_KEY });

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'OPENAI_API_KEY',
    'PORTKEY_API_KEY', 
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

// Initialize on startup
validateEnvironment();

// Context Management System
class ContextManager {
  constructor() {
    this.maxTokens = 120000; // Conservative limit for GPT-4o
    this.chunkSize = 4000; // Size for each context chunk
    this.memoryStore = new Map(); // Session-based memory
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  async manageTokenLimit(content, sessionId) {
    const tokenCount = this.estimateTokens(content);
    
    if (tokenCount <= this.maxTokens) {
      // Store for future sessions if needed
      this.storeInMemory(content, sessionId, { tokenCount, type: 'full_content' });
      return content;
    }

    console.log(`Content exceeds token limit (${tokenCount} > ${this.maxTokens}), applying intelligent chunking`);

    // Store full content for reference
    this.storeInMemory(content, sessionId, { 
      tokenCount, 
      type: 'full_content_stored',
      timestamp: new Date().toISOString() 
    });

    // Apply intelligent content reduction
    const optimizedContent = this.intelligentContentReduction(content);
    
    return optimizedContent;
  }

  intelligentContentReduction(content) {
    // Split content into logical sections
    const sections = this.parseContentSections(content);
    
    // Prioritize sections by importance
    const prioritizedSections = this.prioritizeSections(sections);
    
    // Build optimized content within token limits
    let optimizedContent = '';
    let currentTokens = 0;
    
    for (const section of prioritizedSections) {
      const sectionTokens = this.estimateTokens(section.content);
      
      if (currentTokens + sectionTokens <= this.maxTokens - 1000) { // Leave buffer
        optimizedContent += section.content + '\n\n';
        currentTokens += sectionTokens;
      } else {
        // Summarize remaining important sections
        const summary = this.createSectionSummary(section);
        const summaryTokens = this.estimateTokens(summary);
        
        if (currentTokens + summaryTokens <= this.maxTokens - 500) {
          optimizedContent += `[SUMMARIZED] ${summary}\n\n`;
          currentTokens += summaryTokens;
        }
      }
    }
    
    return optimizedContent;
  }

  parseContentSections(content) {
    const sections = [];
    
    // Split by common delimiters and section headers
    const parts = content.split(/\n\n+|(?=Email:|Current Deal Terms:|Extracted Text|Founder Information)/i);
    
    for (const part of parts) {
      if (part.trim().length > 50) { // Skip very short sections
        const type = this.identifySectionType(part);
        sections.push({
          content: part.trim(),
          type,
          priority: this.getSectionPriority(type),
          length: part.length
        });
      }
    }
    
    return sections;
  }

  identifySectionType(content) {
    const lower = content.toLowerCase();
    
    if (lower.includes('email:')) return 'contact_info';
    if (lower.includes('current deal terms') || lower.includes('funding round')) return 'deal_terms';
    if (lower.includes('founder information') || lower.includes('linkedin')) return 'founder_info';
    if (lower.includes('extracted text') || lower.includes('document')) return 'document_content';
    if (lower.includes('url') || lower.includes('website')) return 'web_content';
    
    return 'general_content';
  }

  getSectionPriority(type) {
    const priorities = {
      'deal_terms': 10,
      'founder_info': 9,
      'document_content': 8,
      'contact_info': 7,
      'web_content': 6,
      'general_content': 5
    };
    
    return priorities[type] || 5;
  }

  prioritizeSections(sections) {
    return sections.sort((a, b) => {
      // Sort by priority first, then by length (longer content often more important)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.length - a.length;
    });
  }

  createSectionSummary(section) {
    const content = section.content;
    
    // Extract key information based on section type
    if (section.type === 'document_content') {
      return this.summarizeDocumentContent(content);
    } else if (section.type === 'founder_info') {
      return this.summarizeFounderInfo(content);
    } else if (section.type === 'web_content') {
      return this.summarizeWebContent(content);
    }
    
    // Generic summary for other types
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPhrases = this.extractKeyPhrases(content);
    
    return `Key points: ${keyPhrases.slice(0, 3).join(', ')}. ${sentences.slice(0, 2).join('. ')}.`;
  }

  summarizeDocumentContent(content) {
    // Extract business-critical information
    const businessTerms = ['revenue', 'growth', 'market', 'customers', 'product', 'technology', 'team', 'funding', 'valuation', 'competitors'];
    const sentences = content.split(/[.!?]+/);
    
    const keyInfoSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return businessTerms.some(term => lower.includes(term));
    }).slice(0, 3);
    
    return `Business Summary: ${keyInfoSentences.join('. ')}.`;
  }

  summarizeFounderInfo(content) {
    // Extract founder details
    const lines = content.split('\n').filter(line => line.trim());
    const keyInfo = [];
    
    for (const line of lines) {
      if (line.includes('Name:') || line.includes('Position:') || line.includes('Experience:') || line.includes('Education:')) {
        keyInfo.push(line.trim());
      }
    }
    
    return `Founder Details: ${keyInfo.slice(0, 4).join(', ')}.`;
  }

  summarizeWebContent(content) {
    // Extract web content summary
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 30);
    return `Web Content Summary: ${sentences.slice(0, 2).join('. ')}.`;
  }

  extractKeyPhrases(content) {
    // Simple keyword extraction
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const frequency = {};
    
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.keys(frequency)
      .sort((a, b) => frequency[b] - frequency[a])
      .slice(0, 10);
  }

  storeInMemory(content, sessionId, metadata) {
    if (!this.memoryStore.has(sessionId)) {
      this.memoryStore.set(sessionId, []);
    }
    
    this.memoryStore.get(sessionId).push({
      content,
      metadata,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    });
    
    // Keep only last 5 entries per session to manage memory
    const sessions = this.memoryStore.get(sessionId);
    if (sessions.length > 5) {
      this.memoryStore.set(sessionId, sessions.slice(-5));
    }
    
    return { success: true, storage: 'memory' };
  }

  retrieveFromMemory(sessionId, type = null) {
    if (!this.memoryStore.has(sessionId)) {
      return [];
    }
    
    const memories = this.memoryStore.get(sessionId);
    
    if (type) {
      return memories.filter(memory => memory.metadata.type === type);
    }
    
    return memories;
  }
}

const contextManager = new ContextManager();
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

const app = express();

// CORS configuration for separated frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite default port
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files for favicon and icons
app.use(express.static(path.join(__dirname, 'public')));

// Handle missing favicon and touch icons
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

app.get('/apple-touch-icon.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

app.get('/apple-touch-icon-precomposed.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

// Handle external health check probes
app.get('/clientIP', (req, res) => {
  res.status(200).json({ 
    clientIP: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });
});

const upload = multer({
  dest: "/tmp/uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 5, // More files
    fieldSize: 10 * 1024 * 1024, // 10MB field size
    fieldNameSize: 100,
    fields: 20
  }
});

// No static file serving needed - frontend deployed separately

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, "temp");
fs.mkdir(tempDir, { recursive: true })
  .then(() => console.log("Temporary directory ensured"))
  .catch(console.error);

// Set up Google Cloud credentials path
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
  console.log(
    "Google Cloud credentials path:",
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
} else {
  console.warn(
    "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. OCR functionality may not work.",
  );
}

// Configure Google Cloud Vision
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

app.use(express.json());
// Add new helper function for content moderation
async function moderateContent(text, traceId) {
  try {
    const openai = new OpenAI({
      baseURL: PORTKEY_GATEWAY_URL,
      defaultHeaders: createHeaders({
        provider: "openai",
        apiKey: process.env.PORTKEY_API_KEY,
        traceId: traceId,
      }),
      apiKey: process.env.OPENAI_API_KEY,
    });

    const moderation = await openai.moderations.create({ input: text });
    return moderation.results[0];
  } catch (error) {
    console.error("Error in content moderation:", error);
    throw error;
  }
}

// Helper function to summarize market opportunity
async function summarizeMarketOpportunity(text, traceId, spanId) {
  try {
    // Add moderation check before processing
    const moderationResult = await moderateContent(text, traceId);
    if (moderationResult.flagged) {
      throw new Error("Content flagged by moderation system");
    }

    const openai = new OpenAI({
      baseURL: PORTKEY_GATEWAY_URL,
      defaultHeaders: createHeaders({
        provider: "openai",
        apiKey: process.env.PORTKEY_API_KEY,
        traceId: traceId,
      }),
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a market research expert. Your task is to extract a concise and specific description of a company's market opportunity based on its description.",
        },
        {
          role: "user",
          content: `Based on the following company description, provide a one-line summary of the market opportunity the company is focusing on. The output should:
1. Be a single, concise phrase, no longer than 20 words.
2. Be specific by clearly describing the solution and the target market or product space. Avoid general terms like 'AI market' or 'technology sector'.
3. Avoid introductory phrases like "The company is addressing..." or "The market is related to.
4. Include relevant target market details (e.g., "healthcare providers" or "SME e-commerce businesses") only if they are crucial to the market focus. If the description suggests a broader focus, exclude unnecessary specifics.

**Examples**:
- For a company offering AI observability evaluation and logging solutions, the summary should be: 'AI observability evaluation and logging solutions'.
- For a company providing synthetic data generation, the summary should be: 'AI synthetic data generation'.
- For a company offering data labeling services for the healthcare industry, the summary should be: 'AI data labeling for healthcare industry'.
- For a company offering authentication for agents to use and connect tools, the summary should be: 'AI tooling and authentication'.
- For a company offering agentic framework to build AI agents: 'AI agentic frameworks'.
- For a company offering AI powered platform for CFOs for budgeting: 'AI budgeting platform for CFOS'.
- For a company offering AI powered platform for CFOs for budgeting: 'AI budgeting platform for CFOS'.
- For a RAG provider that enables other to embedd rag applications: 'RAG as a service solution'.
- For a a company that offers a horizontal platform of agents for SMBs: 'AI Agentic solutions for SMBs'.

Company description: ${text}

Output format:
- [Specific market opportunity as one sentence]`,
        },
      ],
    }, {
      headers: {
        'x-portkey-trace-id': traceId,
        'x-portkey-span-id': spanId,
        'x-portkey-span-name': 'Summarize Market Opportunity'
      }
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in summarizeMarketOpportunity:", error);
    throw error;
  }
}

// Function to run the Python script for market analysis
async function runMarketAnalysis(marketOpportunity, traceId) {
  return new Promise((resolve, reject) => {
    // Use python3 explicitly and add timeout
    const pythonProcess = spawn("python3", ["main.py", marketOpportunity, traceId], {
      cwd: __dirname,
      env: {
        ...process.env,
        PYTHONPATH: __dirname,
        PYTHONUNBUFFERED: '1'
      },
      timeout: 120000 // 2 minute timeout
    });
    
    let result = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log("Python script output:", output);
      result += output;
    });

    pythonProcess.stderr.on("data", (data) => {
      const error = data.toString();
      console.error("Python script error:", error);
      errorOutput += error;
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error("Error output:", errorOutput);
        
        // Provide more specific error messages
        if (errorOutput.includes("ModuleNotFoundError: No module named 'crewai'")) {
          reject("CrewAI module not installed. Please check Python environment setup.");
        } else if (errorOutput.includes("ImportError")) {
          reject("Missing Python dependencies. Please check requirements.txt installation.");
        } else {
          reject(`Python script exited with code ${code}: ${errorOutput}`);
        }
      } else {
        try {
          const jsonStart = result.lastIndexOf("{");
          const jsonEnd = result.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonResult = JSON.parse(
              result.substring(jsonStart, jsonEnd + 1),
            );
            resolve(jsonResult);
          } else {
            console.warn("No valid JSON found in Python output, returning partial result");
            resolve({ 
              industry_analysis: "Analysis incomplete - Python script output parsing failed",
              market_analysis: "Market analysis unavailable", 
              error: "Failed to parse Python script output",
              raw_output: result 
            });
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
          resolve({ 
            industry_analysis: "Analysis incomplete - JSON parsing failed",
            market_analysis: "Market analysis unavailable",
            error: "Failed to parse Python script output",
            raw_output: result 
          });
        }
      }
    });

    pythonProcess.on("error", (error) => {
      console.error("Failed to start Python process:", error);
      reject(`Failed to start Python process: ${error.message}`);
    });
  });
}

// Helper function to fetch LinkedIn profile data
async function getLinkedInProfile(url) {
  if (!url) return null;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://www.linkedin.com/in/${url.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/(in\/)?/, "")}`;
  }

  console.log("Fetching LinkedIn profile for URL:", url);

  try {
    // Try multiple approaches for LinkedIn data
    const approaches = [
      // Approach 1: Enrichlayer (current)
      async () => {
        const response = await axios.get(
          "https://enrichlayer.com/api/v2/profile",
          {
            params: {
              url: url,
              use_cache: "if-present",
            },
            headers: {
              Authorization: "Bearer " + process.env.PROXYCURL_API_KEY,
            },
            timeout: 10000
          },
        );
        return response.data;
      },
      // Approach 2: Basic web scraping (fallback)
      async () => {
        const response = await axios.get(url, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MemoGenerator/1.0)'
          }
        });
        const $ = cheerio.load(response.data);
        
        // Extract basic info from public LinkedIn page
        const name = $('h1').first().text().trim() || 'Name not available';
        const headline = $('.text-body-medium.break-words').first().text().trim() || 'Headline not available';
        
        return {
          full_name: name,
          occupation: headline,
          summary: 'Summary not available - extracted from public LinkedIn page',
          experiences: [],
          education: [],
          skills: [],
          linkedin_url: url
        };
      }
    ];

    // Try each approach
    for (const approach of approaches) {
      try {
        const result = await approach();
        if (result && !result.error) {
          return result;
        }
      } catch (error) {
        console.log(`LinkedIn fetch approach failed:`, error.message);
        continue;
      }
    }

    // If all approaches fail, return basic structure
    return {
      error: "Unable to fetch LinkedIn profile data. Please ensure the URL is accessible and try again.",
      linkedin_url: url
    };

  } catch (error) {
    console.error(
      "Error fetching LinkedIn profile:",
      error.response ? error.response.data : error.message,
    );
    
    if (error.response && error.response.status === 404) {
      return {
        error:
          "LinkedIn profile not found. Please check the URL and try again.",
      };
    } else if (error.response && error.response.status === 400) {
      return {
        error:
          "Invalid LinkedIn URL. Please provide a complete LinkedIn profile URL.",
      };
    }
    return {
      error: `Unable to fetch LinkedIn profile data: ${error.message}`,
      linkedin_url: url
    };
  }
}

// Helper function to process OCR documents with Google Drive upload
async function processOCRDocuments(files) {
  let extractedText = "";
  const uploadedFiles = [];
  const MAX_OCR_TIME = 90000; // 1.5 minutes max for OCR

  for (const file of files) {
    if (file.mimetype === "application/pdf") {
      try {
        console.log(`Processing OCR for file: ${file.originalname}`);

        // Read file and upload to Google Drive
        const fileBuffer = await fs.readFile(file.path);
        const driveFile = await driveService.uploadFile(
          fileBuffer, 
          file.originalname, 
          file.mimetype
        );
        uploadedFiles.push(driveFile);

        // Use Google Drive file for OCR
        const ocrPromise = processSinglePDFOCRFromDrive(driveFile.id);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OCR timeout')), MAX_OCR_TIME)
        );

        const result = await Promise.race([ocrPromise, timeoutPromise]);
        extractedText += result;

        console.log(`Successfully processed file: ${file.originalname}`);
      } catch (error) {
        console.error("Error processing PDF with OCR:", error);
        extractedText += `[OCR Error for ${file.originalname}: ${error.message}]\n\n`;
      } finally {
        // Clean up local file
        await fs.unlink(file.path).catch(console.error);
      }
    } else {
      console.warn(`Unsupported file type for OCR: ${file.mimetype}`);
      await fs.unlink(file.path).catch(console.error);
    }
  }

  // Clean up uploaded files from Google Drive after processing
  for (const driveFile of uploadedFiles) {
    await driveService.deleteFile(driveFile.id);
  }

  return extractedText;
}

// Process single PDF OCR using Google Drive file
async function processSinglePDFOCRFromDrive(driveFileId) {
  try {
    // Download file from Google Drive
    const fileBuffer = await driveService.downloadFile(driveFileId);
    
    // Use Vision API directly with buffer
    const request = {
      requests: [{
        inputConfig: {
          content: fileBuffer.toString('base64'),
          mimeType: "application/pdf"
        },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
      }]
    };

    const [result] = await visionClient.batchAnnotateFiles(request);
    let extractedText = "";

    if (result.responses) {
      for (const response of result.responses) {
        if (response.fullTextAnnotation) {
          extractedText += response.fullTextAnnotation.text + "\n\n";
        }
      }
    }

    return extractedText;
  } catch (error) {
    console.error("Error in OCR processing:", error);
    throw error;
  }
}

// Helper function to extract content from a URL with timeout
async function extractContentFromUrl(url, timeout = 8000) {
  try {
    const response = await axios.get(url, { 
      timeout,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MemoGenerator/1.0)'
      }
    });
    const $ = cheerio.load(response.data);

    $('script, style, nav, footer, header').remove();

    let content = $('body').text();
    content = content.replace(/\s+/g, ' ').trim();

    // Limit content length to prevent token overflow
    return content.substring(0, 5000);
  } catch (error) {
    console.error("Error extracting content from URL:", error);
    return `[Error fetching ${url}: ${error.message}]`;
  }
}
// File upload and processing endpoint
app.post("/api/upload", upload.fields([
  { name: "documents" },
  { name: "ocrDocuments" }
]), (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: "File too large. Maximum size is 10MB per file."
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: "Too many files. Maximum is 3 files."
      });
    }
    if (error.code === 'LIMIT_FIELD_VALUE') {
      return res.status(413).json({
        error: "Request too large. Try uploading fewer or smaller files."
      });
    }
  }
  if (error.code === 'LIMIT_FILE_SIZE' || error.status === 413) {
    return res.status(413).json({
      error: "Request payload too large. Try smaller files or fewer URLs."
    });
  }
  next(error);
}, async (req, res) => {
  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  console.log(`Starting memo generation process with trace ID: ${traceId}`);

  // Set up timeout monitoring
  const timeoutWarning = setTimeout(() => {
    console.warn(`Request ${traceId} approaching timeout limit (${Date.now() - startTime}ms)`);
  }, 270000); // Warn at 4.5 minutes

  try {
    const files = req.files["documents"] || [];
    const ocrFiles = req.files["ocrDocuments"] || [];

    // Validate that we have at least some content to process
    const hasFiles = files.length > 0 || ocrFiles.length > 0;
    const hasUrls = req.body['urls[]'] && Array.isArray(req.body['urls[]']) ? req.body['urls[]'].length > 0 : false;
    const hasLinkedIn = req.body.linkedInUrls && req.body.linkedInUrls.length > 0;

    if (!hasFiles && !hasUrls && !hasLinkedIn) {
      clearTimeout(timeoutWarning);
      return res.status(400).json({
        error: "No content provided",
        details: "Please upload at least one document, provide a URL, or include LinkedIn profiles to analyze."
      });
    }

    // Extract fields from req.body
    const {
      email,
      currentRound,
      proposedValuation,
      valuationDate,
    } = req.body;

    // Handle 'linkedInUrls' as an array
    const linkedInUrls = Array.isArray(req.body.linkedInUrls)
      ? req.body.linkedInUrls
      : req.body.linkedInUrls
        ? [req.body.linkedInUrls]
        : [];

    // Handle multiple URLs
    const urls = req.body['urls[]'] 
      ? (Array.isArray(req.body['urls[]']) ? req.body['urls[]'] : [req.body['urls[]']])
        .map(urlStr => {
          try {
            return typeof urlStr === 'string' ? JSON.parse(urlStr) : urlStr;
          } catch {
            return { url: urlStr, type: 'other' };
          }
        })
      : [];

    console.log("Received data:", {
      email,
      currentRound,
      proposedValuation,
      valuationDate,
      urls,
      linkedInUrls,
    });

    // Process OCR documents first
    let extractedText = "";
    const uploadedBlobs = [];

    if (ocrFiles.length > 0) {
      console.log(`Processing ${ocrFiles.length} OCR documents`);
      extractedText = await processOCRDocuments(ocrFiles);
    }

    // Process regular documents
    for (const file of files) {
      try {
        // Validate file exists and has content
        if (!file.path || !file.size || file.size === 0) {
          console.warn(`Skipping empty or invalid file: ${file.originalname || 'unknown'}`);
          continue;
        }

        const fileBuffer = await fs.readFile(file.path);
        
        // Additional validation for empty buffers
        if (!fileBuffer || fileBuffer.length === 0) {
          console.warn(`Skipping file with empty buffer: ${file.originalname || 'unknown'}`);
          continue;
        }

        if (file.mimetype === "application/pdf") {
          try {
            // Check if buffer starts with PDF header
            const pdfHeader = fileBuffer.slice(0, 4).toString();
            if (pdfHeader !== '%PDF') {
              console.warn(`File ${file.originalname || 'unknown'} is not a valid PDF (missing header)`);
              continue;
            }
            
            // Suppress glyf table warnings by capturing stderr temporarily
            const originalConsoleWarn = console.warn;
            const originalConsoleError = console.error;
            
            // Filter out glyf table warnings
            console.warn = (message) => {
              if (typeof message === 'string' && message.includes('glyf')) {
                return; // Suppress glyf warnings
              }
              originalConsoleWarn(message);
            };
            
            console.error = (message) => {
              if (typeof message === 'string' && message.includes('glyf')) {
                return; // Suppress glyf errors
              }
              originalConsoleError(message);
            };
            
            try {
              const pdfData = await pdf(fileBuffer, {
                // Add options to handle malformed PDFs better
                max: 0, // No page limit
                version: 'default'
              });
              
              if (pdfData && pdfData.text && pdfData.text.trim().length > 0) {
                extractedText += pdfData.text + "\n\n";
              } else {
                console.warn(`PDF parsing returned no text: ${file.originalname || 'unknown'}`);
              }
            } finally {
              // Restore original console methods
              console.warn = originalConsoleWarn;
              console.error = originalConsoleError;
            }
          } catch (pdfError) {
            console.error(`PDF parsing failed for ${file.originalname || 'unknown'}:`, pdfError.message);
            if (pdfError.message.includes('stream must have data')) {
              console.warn(`PDF file ${file.originalname || 'unknown'} appears to be corrupted or empty`);
            } else if (pdfError.message.includes('glyf')) {
              console.warn(`PDF file ${file.originalname || 'unknown'} has font table issues but may still be processable`);
            }
            // Continue processing other files instead of failing completely
          }
        } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          try {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            if (result && result.value) {
              extractedText += result.value + "\n\n";
            } else {
              console.warn(`DOCX parsing returned no text: ${file.originalname || 'unknown'}`);
            }
          } catch (docxError) {
            console.error(`DOCX parsing failed for ${file.originalname || 'unknown'}:`, docxError.message);
            // Continue processing other files instead of failing completely
          }
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname || 'unknown'}:`, fileError.message);
        // Continue processing other files
      } finally {
        // Always cleanup file regardless of processing success/failure
        try {
          if (file.path) {
            await fs.unlink(file.path);
          }
        } catch (unlinkError) {
          console.warn(`Failed to cleanup file ${file.path}:`, unlinkError.message);
        }
      }
    }

    // No need to cleanup uploaded blobs since we're not using them anymore

    // Early moderation check after initial document processing
    if (extractedText) {
      const initialModerationResult = await moderateContent(extractedText, traceId);
      if (initialModerationResult.flagged) {
        return res.status(400).json({
          error: "Content moderation check failed",
          details: "The provided content contains inappropriate material that violates our content policy.",
          categories: initialModerationResult.categories
        });
      }
    }

    // Extract content from URLs if provided (with parallel processing and timeout)
    if (urls && urls.length > 0) {
      console.log("Extracting content from multiple URLs:", urls);
      const urlPromises = urls.map(async (urlObj) => {
        try {
          const urlContent = await extractContentFromUrl(urlObj.url);
          return `\n\nContent from ${urlObj.type} URL (${urlObj.url}):\n${urlContent}`;
        } catch (error) {
          return `\n\n[Failed to fetch ${urlObj.url}: ${error.message}]`;
        }
      });
      
      // Process URLs in parallel with timeout
      const urlResults = await Promise.allSettled(urlPromises);
      urlResults.forEach(result => {
        if (result.status === 'fulfilled') {
          extractedText += result.value;
        } else {
          extractedText += `\n\n[URL processing error: ${result.reason}]`;
        }
      });
    }

    // Final moderation check after all content is combined
    const finalModerationResult = await moderateContent(extractedText, traceId);
    if (finalModerationResult.flagged) {
      return res.status(400).json({
        error: "Content moderation check failed",
        details: "The provided content contains inappropriate material that violates our content policy.",
        categories: finalModerationResult.categories
      });
    }

    console.log("Extracted text length:", extractedText.length);

    // Enhanced validation for extracted content
    if (extractedText.length === 0 && !hasUrls && !hasLinkedIn) {
      clearTimeout(timeoutWarning);
      return res.status(400).json({
        error: "No readable content found",
        details: "The uploaded files appear to be empty or corrupted. Please check your files and try again. Supported formats: PDF and DOCX.",
      });
    }

    // If we only have minimal content from files but have other sources, continue
    if (extractedText.length < 50 && (hasUrls || hasLinkedIn)) {
      console.warn("Minimal text extracted from files, but continuing with URL/LinkedIn content");
    }

    // Fetch and process LinkedIn data (with parallel processing and timeout)
    const founderData = await Promise.allSettled(
      linkedInUrls.map(async (url) => {
        if (url) {
          console.log("Processing LinkedIn URL:", url);
          try {
            const profileData = await Promise.race([
              getLinkedInProfile(url),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('LinkedIn fetch timeout')), 12000)
              )
            ]);
            
            if (profileData.error) {
              return `Error fetching founder background: ${profileData.error}`;
            } else {
              return `
          Name: ${profileData.full_name}
          Current Position: ${profileData.occupation}
          Summary: ${profileData.summary}
          Experience: ${profileData.experiences ? profileData.experiences.map((exp) => `${exp.title} at ${exp.company}`).join(", ") : "Not available"}
          Education: ${profileData.education ? profileData.education.map((edu) => `${edu.degree_name} from ${edu.school}`).join(", ") : "Not available"}
          Skills: ${profileData.skills ? profileData.skills.join(", ") : "Not available"}
          LinkedIn URL: ${url}
        `;
            }
          } catch (error) {
            return `Error fetching founder background: ${error.message}`;
          }
        }
        return null;
      }),
    );

    // Process founder data results
    const processedFounderData = founderData
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    // Combine extracted text
    let combinedText = `
      Email: ${email || "Not provided"}
      Current Deal Terms:
      Current Funding Round: ${currentRound || "Not provided"}
      Proposed Valuation: ${proposedValuation || "Not provided"}
      Analysis Date: ${valuationDate || "Not provided"}
      Extracted Text from Documents:
      ${extractedText}
      Founder Information from LinkedIn:
      ${processedFounderData.join("\n\n")}
    `;

    // Apply context management using our new system
    combinedText = await contextManager.manageTokenLimit(combinedText, traceId);

    // Run market analysis and memo generation in parallel
    const marketOpportunitySpanId = crypto.randomUUID();
    const [marketAnalysisResult, marketOpportunity] = await Promise.all([
      Promise.race([
        runMarketAnalysis(await summarizeMarketOpportunity(extractedText, traceId, marketOpportunitySpanId), traceId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Market analysis timeout')), 45000)
        )
      ]).catch(error => {
        console.error("Market analysis failed:", error);
        return null; // Return null instead of mock data
      }),
      summarizeMarketOpportunity(extractedText, traceId, marketOpportunitySpanId)
    ]);

    console.log("Market opportunity:", marketOpportunity);
    console.log("Market analysis result:", marketAnalysisResult);

    // Generate the full memorandum
    const openai = new OpenAI({
      baseURL: PORTKEY_GATEWAY_URL,
      defaultHeaders: createHeaders({
        provider: "openai",
        apiKey: process.env.PORTKEY_API_KEY,
        traceId: traceId,
      }),
      apiKey: process.env.OPENAI_API_KEY,
    });

    const fullMemoSpanId = crypto.randomUUID();
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a top-tier senior venture capitalist with experience in evaluating early-stage startups. Generate comprehensive investment memorandums using HTML formatting. Be detailed but efficient."
          },
          {
            role: "user",
            content: `
    You are a top-tier senior venture capitalist with experience in evaluating early-stage startups. Your role is to generate comprehensive investment memorandums based on provided information. Format the output using HTML tags for better readability. Limit yourself to the data given in context and do not make up things or people will get fired. Each section should be detailed and comprehensive, with a particular focus on providing extensive information in the product description section. Generating all required sections of the memo is a must. You should approach this with a critical lens, balancing skepticism and insight while recognizing that venture capital focuses on the potential if things go well. For instance, in the diligence section, you could explain the company's go-to-market strategy or product roadmap, but it's perfectly fine to highlight anything unusual or potentially risky.

    Generate a detailed and comprehensive investment memorandum based on the following information:

    Market Opportunity: ${marketOpportunity}

    Current Deal Terms:
    Current Funding Round: ${currentRound || "Not provided"}
    Proposed Valuation: ${proposedValuation || "Not provided"}
    Analysis Date: ${valuationDate || "Not provided"}

    Market Analysis Result:
    Industry Information: ${marketAnalysisResult?.industry_analysis || "Analysis unavailable"}
    Market Sizing Information: ${marketAnalysisResult?.market_analysis || "Analysis unavailable"}
    Competitor Analysis: ${marketAnalysisResult?.competitor_analysis || "Analysis unavailable"}
    Timing Analysis: ${marketAnalysisResult?.timing_analysis || "Analysis unavailable"}
    Regional Analysis: ${marketAnalysisResult?.regional_analysis || "Analysis unavailable"}
    Investment Decision: ${marketAnalysisResult?.decision || "Analysis unavailable"}


    Additional Context: ${combinedText}

    Structure the memo with the following sections, using HTML tags for formatting:

    1. <h2>Executive Summary</h2>
       - Include deal terms and analysis date

    2. <h2>Introduction</h2>
       - Business Summary: Brief overview of how the company aligns with the fund's focus and highlights any unique aspects.
       - Value Proposition: Key value offering and what differentiates it from others.

    3. <h2>Market Overview</h2>
       - Industry Context: Outline the industry's growth potential and relevance to the region.
       - Customer Segments: Define the primary customer segments targeted by the company.
       - Market Size: Present market sizes globally, in Southeast Asia, and in the home market (USD). Include CAGR and discuss tailwinds/headwinds with supporting data.

    4. <h2>Competitive Landscape</h2>
       - Competitors: List key competitors and explain how the company differentiates itself. Include venture capital raised where applicable.
       - Market Positioning: Describe the company's position and competitive advantage.
       - Comparable Companies: Highlight global companies with similar business models for context.
       - Public IPOs and M&A: Note any significant industry IPOs or M&As for benchmarking potential exits.

    5. <h2>Product/Solution</h2>
       - Product Description: Explain the product/service, including technology or innovations. Include screenshots if available.
       - Problem and Solution: Detail the problem addressed and how the solution tackles it.
       - User Flow: Describe the user flow and compare/contrast with competitors if relevant.

    6. <h2>Team</h2>
       - Leadership and Advisors: Introduce key team members and advisors, including links to professional profiles like LinkedIn or GitHub.
       - Organisation Chart: Provide the current org chart and an ideal chart for the next 12 months, detailing planned expansions.

    7. <h2>Traction/Metrics</h2>
       - Current Progress: Highlight milestones, achievements, and growth in users or customers.
       - Key Metrics: Discuss engagement, retention, product performance, and revenue metrics. Provide benchmarks for context.

    8. <h2>Go-to-Market Strategy</h2>
       - Customer Strategy: Define target segments, positioning, messaging, and pricing strategy.
       - Sales Strategy: Detail sales channels, processes, and team structure.
       - Marketing Strategy: Outline advertising, content marketing, and community engagement plans.
       - Partnerships: Highlight strategic and channel partnerships for market entry or expansion.
       - Launch Plan: Present the timeline, milestones, and KPIs for success.

    9. <h2>Financial Overview</h2>
       - Fundraising History: Summarise past funding rounds and current fundraising goals.
       - Financial Projections: Provide revenue and expense projections, including a profitability timeline.
       - Financial Health: Include key financial ratios to assess health and performance.

    10. <h2>Risk Analysis</h2>
       - Potential Risks: Identify market, operational, and regulatory risks.
       - Mitigation Strategies: Discuss strategies for mitigating these risks.

    11. <h2>Exit Analysis</h2>
       - Potential Exit Strategies: Explore M&A and IPO opportunities, identifying potential buyers or partners.
       - Comparable Exits: Provide examples of similar companies' exits for comparison.
       - Timing and Valuation: Discuss expected exit timeline and valuation expectations.

    12. <h2>Use of Funds</h2>
       - Strategic Objectives: Explain how funds will be allocated to achieve strategic goals, with a budget breakdown.

    13. <h2>Conclusion</h2>
       - Investment Thesis: Summarise why the company is a compelling investment, considering strategic alignment and growth potential.
       - Final Recommendations: Offer recommendations for the investment committee, along with any considerations.

    14. <h2>Follow-up- questions</h2>
        - Generate 4-7 specific follow-up questions to ask the founding team. These questions should address areas where we lack sufficient information or highlight critical risks that could impact the company's success or failure. The questions should be tailored to the specific business, avoiding generic queries, and should help elevate the discussion by diving deeper into the key topics we already have insights on. They should be thoughtful, relevant, and designed to lead to meaningful conversations with the founders.

    15. <h2>Appendix</h2>
       - Additional Data: Include supporting charts, graphs, or data for deeper insights.`,

          },
        ],
        temperature: 0.7,
        max_tokens: 6000
      }, {
        headers: {
          'x-portkey-trace-id': traceId,
          'x-portkey-span-id': fullMemoSpanId,
          'x-portkey-span-name': 'Generate Full Memorandum'
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Memo generation timeout')), 90000) // 1.5 min timeout
      )
    ]);

    const memorandum = completion.choices[0].message.content;
    console.log("Generated memorandum length:", memorandum.length);
    console.log(`Total processing time: ${Date.now() - startTime}ms`);
    
    clearTimeout(timeoutWarning);
    res.json({ memorandum: memorandum, traceId: traceId });
  } catch (error) {
    clearTimeout(timeoutWarning);
    console.error("Error in /upload route:", error);
    console.log(`Failed processing time: ${Date.now() - startTime}ms`);
    if (error.message === "Content flagged by moderation system") {
      res.status(400).json({
        error: "Content moderation check failed",
        details: "The provided content contains inappropriate material that violates our content policy."
      });
    } else if (error.message.includes('timeout')) {
      res.status(408).json({
        error: "Request timeout",
        details: "The memo generation took too long. Please try with smaller files or fewer URLs."
      });
    } else {
      res.status(500).json({
        error: "An error occurred while processing your request.",
        details: error.message,
      });
    }
  }
});

// Word document download endpoint
app.post("/api/download/word", express.json(), async (req, res) => {
  console.log("Word download route hit");
  try {
    const { content } = req.body;
    const fileBuffer = await HTMLtoDOCX(content, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=investment_memorandum.docx",
    );
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error generating Word document:", error);
    res
      .status(500)
      .json({ error: "An error occurred while generating the Word document." });
  }
});

// PDF download endpoint
app.post("/api/download/pdf", express.json(), async (req, res) => {
  console.log("PDF download route hit");
  let browser;
  try {
    const { content } = req.body;
    
    // Enhanced HTML with better PDF styling
    const styledContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 40px;
              background: white;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #2c3e50;
              margin-top: 2em;
              margin-bottom: 1em;
              page-break-after: avoid;
            }
            h1 {
              font-size: 2.5em;
              border-bottom: 3px solid #3498db;
              padding-bottom: 0.5em;
            }
            h2 {
              font-size: 2em;
              border-bottom: 2px solid #ecf0f1;
              padding-bottom: 0.3em;
            }
            h3 {
              font-size: 1.5em;
              color: #34495e;
            }
            p {
              margin-bottom: 1em;
              text-align: justify;
            }
            ul, ol {
              margin-bottom: 1em;
              padding-left: 2em;
            }
            li {
              margin-bottom: 0.5em;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
              page-break-inside: avoid;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            .page-break {
              page-break-before: always;
            }
            @media print {
              body {
                padding: 20px;
              }
              h1, h2, h3 {
                page-break-after: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;

    // Launch Playwright browser
    browser = await chromium.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(styledContent);
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=investment_memorandum.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF document:", error);
    res
      .status(500)
      .json({ error: "An error occurred while generating the PDF document." });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Legacy download endpoint (redirect to Word for backward compatibility)
app.post("/api/download", express.json(), async (req, res) => {
  console.log("Legacy download route hit, redirecting to Word download");
  try {
    const { content } = req.body;
    const fileBuffer = await HTMLtoDOCX(content, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=investment_memorandum.docx",
    );
    res.send(fileBuffer);
  } catch (error) {
    console.error("Error generating Word document:", error);
    res
      .status(500)
      .json({ error: "An error occurred while generating the Word document." });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// API endpoints only - no catch-all route needed

// Use the port provided by Render, or fallback to 3000
const PORT = process.env.PORT || 3000;
console.log(`Using port: ${PORT}`);

// Set server timeout to prevent hanging requests
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// Set timeout for requests (10 minutes)
server.timeout = 600000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});