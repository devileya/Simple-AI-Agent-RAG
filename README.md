# AI Agent for Financial Statement Analysis

## Project Structure

```
demo_rag/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models/              # Data models
│   │   └── schemas.py       # Pydantic schemas
│   ├── services/            # RAG service logic
│   │   ├── pdf_processor.py # PDF processing and chunking
│   │   ├── vector_store.py  # Vector database integration
│   │   └── rag_pipeline.py  # RAG pipeline
│   ├── requirements.txt     # Python dependencies
│   └── config.py           # Configuration file
├── frontend/
│   ├── pages/              # Next.js pages
│   │   ├── index.tsx       # Main page
│   │   └── _app.tsx        # App component
│   ├── components/         # React components
│   │   ├── ChatInterface.tsx
│   │   └── FileUpload.tsx
│   ├── styles/             # CSS files
│   │   └── globals.css     # Global styles
│   ├── package.json        # Node.js dependencies
│   ├── tsconfig.json       # TypeScript configuration
│   ├── next.config.js      # Next.js configuration
│   ├── next-env.d.ts       # Next.js type definitions
│   └── .eslintrc.json      # ESLint configuration
├── data/
│   └── sample.pdf
└── README.md
```

---

## Getting Started

### 1. **Environment Setup**
```bash
# Clone repository
git clone <your-repository-url>
cd demo_rag
```

### 2. **Backend Setup**
```bash
cd backend

# Set up environment variables (create .env file)
OPENAI_API_KEY=your_openai_api_key
VECTOR_DB_PATH=./vector_store
PDF_UPLOAD_PATH=../data

# Set up Python virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. **Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

**Note**: If you encounter TypeScript/linting errors:
- Make sure `npm install` completed successfully
- The project includes all necessary configuration files (`tsconfig.json`, `.eslintrc.json`, `next-env.d.ts`)
- Check that all dependencies are properly installed in `node_modules`

### 4. **Initial Data Processing**
```bash
# Process and vectorize PDF file via API
curl -X POST "http://localhost:8000/api/upload" \
     -F "file=@../data/sample.pdf"
```

---

## API Endpoints

### **POST /api/upload**
Upload PDF file and store in vector database
```json
{
  "file": "multipart/form-data"
}
```

### **POST /api/chat**
Generate RAG-based answer to question
```json
{
  "question": "What is the total revenue for 2025?",
  "chat_history": [] // optional
}
```

Response:
```json
{
  "answer": "The total revenue for 2025 is 123.4 billion won...",
  "sources": [
    {
      "content": "Related document chunk content",
      "page": 1,
      "score": 0.85
    }
  ],
  "processing_time": 2.3
}
```

### **GET /api/documents**
Retrieve processed document information
```json
{
  "documents": [
    {
      "filename": "FinancialStatement_2025_I_AADIpdf.pdf",
      "upload_date": "2024-01-15T10:30:00Z",
      "chunks_count": 125,
      "status": "processed"
    }
  ]
}
```

## Sample Questions

Your system should be able to handle questions like these about the financial statement PDF:

- "What is the total revenue for 2025?"
- "What is the year-over-year operating profit growth rate?"
- "What are the main cost items?"
- "How is the cash flow situation?"
- "What is the debt ratio?"

---