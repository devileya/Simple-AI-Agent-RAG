# RAG-based Financial Statement Q&A System

## Project Overview

This project implements a Retrieval-Augmented Generation (RAG) system for financial statement analysis. Users can upload PDF financial documents, which are then processed, chunked, and stored in a vector database. The system enables users to ask natural language questions about the uploaded documents and receive AI-generated responses that are grounded in the specific content of those documents.

## Architecture

The application follows a client-server architecture with:

1. **Frontend**: A React/Next.js application that provides:
   - User interface for document upload
   - Document management
   - Chat interface for asking questions

2. **Backend**: A FastAPI-based server that handles:
   - PDF document processing
   - Text extraction and chunking
   - Vector embedding storage
   - RAG pipeline integration with LLM

## Core Components

### Backend Components

#### 1. PDF Processing Service (`PDFProcessor`)
- Extracts text content from uploaded PDF documents
- Uses both `pdfplumber` and `PyPDF2` for reliable text extraction
- Splits documents into semantic chunks using LangChain's `RecursiveCharacterTextSplitter`
- Preserves metadata like page numbers and source information

#### 2. Vector Store Service (`VectorStoreService`)
- Embeds document chunks using Google Gemini embeddings (models/text-embedding-004)
- Stores document vectors in ChromaDB with persistent storage
- Provides similarity search capabilities for retrieval
- Converts cosine distance to similarity scores for accurate relevance display
- Implements threshold-based filtering for relevance
- **Persistent Storage**: Documents remain in vector DB after system restart

#### 3. RAG Pipeline (`RAGPipeline`)
- Coordinates the retrieval and generation process
- Uses retrieved document chunks to provide context for the LLM
- Formats prompts with contextual information
- Generates answers using Google Gemini models (gemini-1.5-flash)
- **Session-based Chat History**: Maintains conversation context per user session using LangChain memory
- Returns both answers and source information for transparency
- Supports both session-based (server-side) and manual (client-side) chat history

#### 4. API Endpoints
- `/api/upload`: Handles PDF file upload and processing
- `/api/chat`: Processes questions and returns AI-generated answers
- `/api/documents`: Lists all processed documents
- `/api/chunks`: (Optional) Retrieves individual chunks for a document

### Frontend Components

#### 1. File Upload Component (`FileUpload.tsx`)
- Drag-and-drop interface for PDF uploads
- Progress indicator for upload status
- File validation (PDF only, size limits)
- Error handling and user feedback

#### 2. Chat Interface Component (`ChatInterface.tsx`)
- Message input for asking questions
- Displays conversation history
- Shows AI responses with source attribution
- Handles loading states and errors

#### 3. Main Application (`index.tsx`)
- Manages application state
- Integrates upload and chat components
- Handles document selection
- Coordinates communication with backend API

## Data Flow

1. **Document Upload Process**:
   - User uploads a PDF financial document
   - Frontend sends the file to the backend `/api/upload` endpoint
   - Backend processes the PDF, extracting text and metadata
   - Text is split into semantic chunks
   - Chunks are embedded and stored in the vector database
   - Backend returns confirmation with document metadata
   - Frontend updates UI to show the document as available for queries

2. **Question-Answering Process**:
   - User selects a document and asks a question
   - Frontend sends the question and document ID to the `/api/chat` endpoint
   - Backend retrieves relevant chunks based on query similarity
   - Retrieved chunks form context for the LLM prompt
   - LLM generates an answer using the provided context
   - Response with answer and source information returns to frontend
   - Frontend displays the answer with source attribution

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework for building APIs
- **LangChain**: Framework for developing LLM-powered applications
- **OpenAI API**: For embeddings and LLM capabilities
- **ChromaDB**: Vector database for storing embeddings
- **PDFPlumber/PyPDF2**: PDF text extraction tools
- **Uvicorn**: ASGI server for running the FastAPI application

### Frontend
- **Next.js**: React framework for building the web application
- **TypeScript**: Type-safe JavaScript for better development experience
- **React**: UI component library
- **CSS-in-JS**: For component styling
- **Axios**: HTTP client for API requests

## Environment Configuration

The system uses various environment variables to configure its behavior:

### Backend Environment Variables
- `OPENAI_API_KEY`: API key for OpenAI services
- `VECTOR_DB_PATH`: Path to store vector database files
- `PDF_UPLOAD_PATH`: Directory for storing uploaded PDFs
- `EMBEDDING_MODEL`: Model name for generating embeddings
- `LLM_MODEL`: Language model for generating answers
- `CHUNK_SIZE`: Size of text chunks for processing
- `CHUNK_OVERLAP`: Overlap between consecutive chunks
- `RETRIEVAL_K`: Number of chunks to retrieve for context
- `SIMILARITY_THRESHOLD`: Minimum relevance score for retrieved chunks
- `HOST`, `PORT`, `DEBUG`: Server configuration options
- `ALLOWED_ORIGINS`: CORS configuration for frontend access

## Setup and Deployment

### Backend Setup
1. Create a Python virtual environment
2. Install dependencies from `requirements.txt`
3. Set up environment variables in `.env`
4. Run the FastAPI server using Uvicorn

### Frontend Setup
1. Install Node.js dependencies using npm/yarn
2. Configure API endpoint in environment settings
3. Run development server or build for production

## Challenges and Solutions

### 1. PDF Text Extraction
**Challenge**: Financial PDFs often have complex layouts and formatting that make text extraction difficult.
**Solution**: The system uses a multi-tiered approach with both PDFPlumber and PyPDF2 as fallback to maximize text extraction quality.

### 2. Context Window Limitations
**Challenge**: LLM context windows limit how much information can be included.
**Solution**: The chunking strategy balances size and semantic coherence, and the retrieval system selects only the most relevant chunks.

### 3. Responsive UI for Document Management
**Challenge**: Providing a seamless experience for document upload and selection.
**Solution**: Real-time upload feedback with progress indicators and a clear document selection interface.

## Future Enhancements

1. **Document Management**: Add document deletion and organization features
2. **Chunk Visualization**: Allow users to browse and search document chunks
3. **Chat History**: Persist conversation history across sessions
4. **Multi-Document Queries**: Allow questions across multiple financial statements
5. **Table Extraction**: Specialized handling of tabular data in financial documents
6. **Security Enhancements**: User authentication and document access control
7. **Offline Processing**: Add support for offline document processing using local models

## Conclusion

This RAG-based Financial Statement Q&A System demonstrates how modern LLM technologies can be effectively applied to domain-specific document analysis tasks. By combining PDF processing, vector embeddings, and large language models, the system enables natural language interaction with complex financial documents, potentially improving efficiency and accessibility of financial analysis tasks.
