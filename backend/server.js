import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
const PORT = 5000;
// At the top of your server.js file, replace the hardcoded URL
const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No PDF file was uploaded",
        code: "NO_FILE",
      });
    }

    console.log("File uploaded:", req.file.originalname);

    console.log("Creating vector embeddings...");

    const loader = new PDFLoader(req.file.path); // Use full path, not just filename
    const docs = await loader.load();

    console.log("PDF loaded, creating text chunks...");

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);

    console.log(`Created ${splitDocs.length} text chunks`);

    // Vector Embeddings
    const embeddingModel = new OpenAIEmbeddings({
      modelName: "text-embedding-3-large",
      openAIApiKey: process.env.OPENAI_API_KEY, // Make sure to set this in your .env file
    });

    console.log("Creating vector embeddings...");

    const pdf_id = req.file.filename.split(".")[0];

    // Simple connection test
    try {
      const testResponse = await fetch(`${QDRANT_URL}/collections`);
      console.log(`Qdrant connection test: ${testResponse.status}`);
    } catch (err) {
      console.error("Qdrant connection failed!", err);
    }

    const vectorStore = await QdrantVectorStore.fromDocuments(
      splitDocs, // Your split documents array
      embeddingModel,
      {
        url: QDRANT_URL,
        collectionName: pdf_id,
      }
    );

    console.log("Vector embeddings created successfully!");

    // console.log(vectorStore);

    // console.log('Unique name is: ',uniqueName);
    console.log("collection name: ", pdf_id);

    res.status(200).json({
      status: "success",
      message: "PDF uploaded and processed successfully",
      data: {
        originalName: req.file.originalname,
        fileSize: req.file.size,
        chunksCreated: splitDocs.length,
        processedAt: new Date().toISOString(),
        pdfID: pdf_id,
      },
    });
  } catch (error) {
    console.error("PDF Processing Error:", error);

    //Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      status: "error",
      message: "Failed to process PDF",
      code: "PROCESSING_ERROR",
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body;

    console.log(
      "Collection name is chat: ",
      messages[messages.length - 1].collectionName
    );

    // Message validation
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Defining Vector Embeddings Model
    const embeddingModel = new OpenAIEmbeddings({
      modelName: "text-embedding-3-large",
      openAIApiKey: process.env.OPENAI_API_KEY, // Make sure to set this in your .env file
    });

    console.log("Getting the PDF embeddings");

    const vector_db = await QdrantVectorStore.fromExistingCollection(
      embeddingModel,
      {
        url: QDRANT_URL,
        collectionName: messages[messages.length - 1].collectionName,
      }
    );

    console.log(
      "Doing a similarity search based on the input message and its history"
    );

    // Get the last message
    const lastmessage = messages[messages.length - 1];
    const search_results = await vector_db.similaritySearch(
      lastmessage.content
    );

    // console.log(vector_db);

    // Format search results for the prompt
    const contextText = search_results
      .map(
        (result, index) =>
          `Document ${index + 1}:\nContent: ${result.pageContent}\nPage: ${
            result.metadata?.page || "Unknown"
          }\n`
      )
      .join("\n");

    // console.log(contextText);

    const SYSTEM_PROMPT = `You are a specialized PDF Assistant designed to help users navigate and understand technical documents. Your primary function is to answer queries using only the provided context from PDF files, including page contents and page numbers.

## Core Guidelines:

**Scope & Limitations:**
- Answer ONLY based on the provided PDF context - do not use external knowledge
- Focus exclusively on technical, factual, and document-specific information
- Do NOT provide advice on: cooking, health, relationships, politics, or other non-technical subjects
- If a query falls outside your scope, politely redirect: "I can only help with technical information from this PDF document."

**Response Format:**
- Provide clear, concise answers based on the PDF content
- Always include specific page references: "According to page [X]..." or "See page [X] for more details"
- When relevant information spans multiple pages, cite all applicable page numbers
- If information is incomplete, direct users to specific pages for comprehensive details

**User Navigation:**
- Actively guide users to relevant page numbers for deeper understanding
- Use phrases like: "For complete details, please refer to page [X]" or "You can find additional information on pages [X-Y]"
- When answering partially, suggest: "For the full context, I recommend reviewing page [X]"

**Quality Standards:**
- Be precise and factual
- Acknowledge when information is not available in the provided context
- Maintain a helpful, professional tone focused on document navigation and technical clarity

    Context:
    ${contextText}`;

    // Provide the system prompt and context to LLM
    const response = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    });

    // console.log(response);

    res.status(200).json({
      status: "success",
      message: "Chat processed successfully",
      responseSent: response.choices[0].message.content,
      totalResults: search_results.length,
    });
  } catch (error) {
    console.error("ChatBoT error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to process chat request",
      error: error.message,
      code: "PROCESSING_ERROR",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
