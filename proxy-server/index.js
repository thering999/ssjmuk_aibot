const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const fetch = require('node-fetch');

const app = express();

// --- Middleware ---
app.use(express.json({ limit: '15mb' })); // Increased limit for large images/videos
app.use(cors()); // Allow requests from your frontend

// --- Gemini AI Client Initialization ---
// @google/genai-fix: Per guidelines, the API key must be obtained from `process.env.API_KEY`.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("FATAL ERROR: API_KEY environment variable is not set!");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Error Handling ---
const handleApiError = (res, error) => {
  console.error("API Error:", error);
  res.status(500).json({ error: error.message || 'An internal server error occurred.' });
};

// --- API Routes ---

// Generic endpoint for various generateContent calls (chat, analysis, etc.)
app.post('/api/generate-content', async (req, res) => {
  try {
    const { model, contents, config, toolConfig } = req.body;
    const response = await ai.models.generateContent({ model, contents, config, toolConfig });
    res.json(response);
  } catch (error) {
    handleApiError(res, error);
  }
});

// Endpoint for streaming chat responses
app.post('/api/generate-content-stream', async (req, res) => {
  try {
    const { model, contents, config, toolConfig } = req.body;
    const stream = await ai.models.generateContentStream({ model, contents, config, toolConfig });
    
    res.setHeader('Content-Type', 'application/octet-stream');
    
    for await (const chunk of stream) {
        // Each chunk is a JSON object. We stringify it and send it with a newline delimiter.
        res.write(JSON.stringify(chunk) + '\n');
    }
    res.end();
  } catch (error) {
    // Cannot send error headers if stream has started
    console.error("Stream API Error:", error);
    if (!res.headersSent) {
      handleApiError(res, error);
    } else {
      res.end();
    }
  }
});

// Endpoint for Imagen
app.post('/api/generate-images', async (req, res) => {
  try {
    const { model, prompt, config } = req.body;
    const response = await ai.models.generateImages({ model, prompt, config });
    res.json(response);
  } catch (error) {
    handleApiError(res, error);
  }
});

// Endpoint for starting a Veo video generation job
app.post('/api/generate-videos', async (req, res) => {
  try {
    const { model, prompt, image, config } = req.body;
    const operation = await ai.models.generateVideos({ model, prompt, image, config });
    res.json(operation);
  } catch (error) {
    handleApiError(res, error);
  }
});

// Endpoint for polling the status of a video generation job
app.post('/api/get-videos-operation', async (req, res) => {
  try {
    const { operation: opFromClient } = req.body;
    const operation = await ai.operations.getVideosOperation({ operation: opFromClient });
    res.json(operation);
  } catch (error) {
    handleApiError(res, error);
  }
});

// Secure endpoint for downloading the generated video file
app.get('/api/get-video', async (req, res) => {
    try {
        const uri = req.query.uri;
        if (!uri) {
            return res.status(400).json({ error: 'Missing video URI' });
        }
        // @google/genai-fix: Per guidelines, the API key must be obtained from `process.env.API_KEY`.
        const videoUrl = `${uri}&key=${API_KEY}`;
        const videoResponse = await fetch(videoUrl);

        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        }
        // Pipe the video stream directly to the client
        res.setHeader('Content-Type', videoResponse.headers.get('Content-Type'));
        videoResponse.body.pipe(res);

    } catch (error) {
        handleApiError(res, error);
    }
});


// --- Server Start ---
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
