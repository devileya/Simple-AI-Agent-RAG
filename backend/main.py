from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import ChatRequest, ChatResponse, DocumentsResponse, UploadResponse, DocumentInfo, ChunksResponse
from services.pdf_processor import PDFProcessor
from services.vector_store import VectorStoreService
from services.rag_pipeline import RAGPipeline
from config import settings
from typing import Optional
import logging
import time
import os
import shutil
from datetime import datetime

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RAG-based Financial Statement Q&A System",
    description="AI-powered Q&A system for financial documents using RAG",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pdf_processor = None
vector_store = None
rag_pipeline = None

# Document store for tracking uploads
document_store = {}


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global pdf_processor, vector_store, rag_pipeline
    
    logger.info("Starting RAG Q&A System...")
    
    # Create upload directory if it doesn't exist
    os.makedirs(settings.pdf_upload_path, exist_ok=True)
    
    # Initialize services
    pdf_processor = PDFProcessor()
    vector_store = VectorStoreService()
    rag_pipeline = RAGPipeline(vector_store)
    
    logger.info("RAG Q&A System started successfully")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "RAG-based Financial Statement Q&A System is running"}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process PDF file"""
    logger.info(f"Received file upload request: {file.filename}")
    start_time = time.time()
    
    try:
        # 1. Validate file type (PDF)
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # 2. Save uploaded file
        file_path = os.path.join(settings.pdf_upload_path, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File saved to {file_path}")
        
        # 3. Process PDF and extract text
        documents = pdf_processor.process_pdf(file_path)
        
        # 4. Store documents in vector database
        document_ids = vector_store.add_documents(documents)
        
        # 5. Store document info in document store
        document_store[file.filename] = {
            "filename": file.filename,
            "upload_date": datetime.now(),
            "chunks_count": len(documents),
            "status": "processed",
            "document_ids": document_ids
        }
        
        processing_time = time.time() - start_time
        
        # 6. Return processing results
        return UploadResponse(
            message="File processed successfully",
            filename=file.filename,
            chunks_count=len(documents),
            processing_time=round(processing_time, 2)
        )
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process chat request and return AI response"""
    try:
        # 1. Validate request
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        # Validate document_id exists if provided
        if request.document_id and request.document_id not in document_store:
            raise HTTPException(status_code=404, detail=f"Document with ID {request.document_id} not found")
        
        # If no document_id is provided, use the first document in document_store if available
        document_filter = None
        if request.document_id:
            document_filter = request.document_id
        elif document_store and len(document_store) > 0:
            # Use the first document as default if none specified
            document_filter = list(document_store.keys())[0]

        logger.info(f"Using document filter: {document_filter}")
        # 2. Use RAG pipeline to generate answer
        response = rag_pipeline.generate_answer(
            question=request.question,
            session_id=request.session_id,
            chat_history=request.chat_history,
            document_filter=document_filter
        )
        
        # 3. Return response with sources
        return ChatResponse(
            answer=response["answer"],
            sources=response["sources"],
            processing_time=response["processing_time"]
        )
        
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")


@app.get("/api/documents", response_model=DocumentsResponse)
async def get_documents():
    """Get list of processed documents"""
    try:
        documents = [DocumentInfo(**doc) for doc in document_store.values()]
        return DocumentsResponse(documents=documents)
    except Exception as e:
        logger.error(f"Error retrieving documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")


@app.get("/api/chunks", response_model=ChunksResponse)
async def get_chunks(
    filename: Optional[str] = Query(None, description="Filter by filename"),
    page: Optional[int] = Query(None, description="Filter by page number"),
    limit: int = Query(20, description="Number of chunks to return")
):
    """Get document chunks (optional endpoint)"""
    try:
        # This is a simplified implementation
        # In a real application, you would query the vector store directly
        
        chunks = []
        total_count = 0
        
        # Return some sample chunks for now
        # In a real implementation, you would query the vector store
        
        return ChunksResponse(
            chunks=chunks,
            total_count=total_count
        )
    except Exception as e:
        logger.error(f"Error retrieving chunks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving chunks: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port, reload=settings.debug) 