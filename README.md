# PDF Chatbot with AI

A RAG (Retrieval-Augmented Generation) application that allows users to upload PDFs, then chat with an AI about the document's content.

## Features

- **PDF Upload & Processing**
  - Secure file upload with Multer
  - Text extraction and chunking
  - Vector embeddings generation

- **AI-Powered Chat**
  - Conversational interface with document context
  - Response generation using OpenAI
  - Conversation history tracking

- **Vector Database**
  - Qdrant for efficient similarity search
  - Isolated collections per document

## Tech Stack

**Frontend:**
- React + TypeScript
- Tailwind CSS
- Shadcn/ui Components
- React Router

**Backend:**
- Node.js + Express
- LangChain.js
- OpenAI API
- Qdrant Vector Database
- Multer (File Uploads)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pdf-chatbot.git
   cd pdf-chatbot