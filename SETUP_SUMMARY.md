# Setup Summary: Ollama + DeepSeek Integration

## ✅ What Was Changed

Your RAG system has been updated to use:
- **Ollama** (local, FREE) for embeddings with DeepSeek model
- **DeepSeek API** (cloud, cheap) for LLM/chat

This fixes the 404 error you were seeing with DeepSeek embeddings API.

## 🔧 Updated Files

1. **`backend/services/vector_store.py`**
   - Changed from OpenAI embeddings to Ollama embeddings
   - Now uses: `OllamaEmbeddings` from `langchain_community`

2. **`backend/config.py`**
   - Added `ollama_base_url` configuration
   - Updated `embedding_model` default to `deepseek-r1:1.5b`

3. **`backend/.env.example`**
   - Added Ollama configuration
   - Removed OpenAI API key requirement

4. **`README.md`**
   - Added Ollama installation instructions
   - Updated setup steps

5. **New Files Created:**
   - `OLLAMA_SETUP.md` - Detailed Ollama setup guide
   - `setup_ollama.sh` - Automated setup script

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Ollama
```bash
# Run the automated setup script
./setup_ollama.sh
```

This script will:
- ✅ Install Ollama (if not already installed)
- ✅ Start Ollama service
- ✅ Download DeepSeek model (1.5B)
- ✅ Verify everything works

### Step 2: Configure Environment
```bash
cd backend
cp .env.example .env
```

Edit `.env` and set:
```bash
# Get your DeepSeek API key from https://platform.deepseek.com
DEEPSEEK_API_KEY=sk-your-actual-key-here

# Ollama is already configured for local use
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=deepseek-r1:1.5b
LLM_MODEL=deepseek-chat
```

### Step 3: Install Dependencies & Run
```bash
# Make sure you're in backend directory
cd backend

# Activate virtual environment (if not already)
source venv/bin/activate

# Install/update dependencies
pip install -r requirements.txt

# Clear old vector store (recommended)
rm -rf vector_store/

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 🎯 What You Need

### Required:
1. **Ollama** - FREE, install via `./setup_ollama.sh`
2. **DeepSeek API Key** - Get from https://platform.deepseek.com (cheap, ~$0.14 per 1M tokens)

### Optional:
- OpenAI API key - ❌ NOT needed anymore!

## 💡 How It Works Now

```
┌─────────────────────────────────────────┐
│  Your Document (PDF)                    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  PDF Processor                          │
│  (Extracts text & chunks)               │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Ollama (Local - FREE)                  │
│  Generates embeddings                   │
│  Model: deepseek-r1:1.5b                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  ChromaDB Vector Store                  │
│  (Stores embeddings)                    │
└────────────┬────────────────────────────┘
             │
             ▼ (on query)
┌─────────────────────────────────────────┐
│  RAG Pipeline                           │
│  1. Search similar chunks (Ollama)      │
│  2. Generate answer (DeepSeek API)      │
└─────────────────────────────────────────┘
```

## 🐛 Troubleshooting

### Error: "Connection refused to localhost:11434"
**Solution:**
```bash
# Make sure Ollama is running
ollama serve

# Or use brew services (macOS)
brew services start ollama
```

### Error: "Model not found"
**Solution:**
```bash
# Pull the model
ollama pull deepseek-r1:1.5b

# Verify it's there
ollama list
```

### Error: Old 404 error still appears
**Solution:**
```bash
# Clear the old vector store
rm -rf backend/vector_store/

# Restart the server
cd backend
uvicorn main:app --reload
```

## 📊 Cost Breakdown

| Component | Solution | Cost |
|-----------|----------|------|
| **Embeddings** | Ollama (local) | **$0 (FREE!)** |
| **LLM Chat** | DeepSeek API | ~$0.14 per 1M tokens |
| **Storage** | ChromaDB (local) | **$0 (FREE!)** |
| **Total** | Hybrid setup | **~$0.14 per 1M tokens** |

### Comparison with Other Solutions:

**OpenAI (all cloud):**
- Embeddings: $0.02 per 1M tokens
- GPT-4: $30 per 1M tokens
- Total: **~$30 per 1M tokens** (214x more expensive!)

**Google Gemini (previous setup):**
- Had issues with API compatibility
- Required Google API key

## ✨ Benefits of This Setup

✅ **FREE embeddings** - Ollama runs locally  
✅ **Privacy** - Your documents never leave your machine for embedding  
✅ **Fast** - Local embeddings are faster than API calls  
✅ **Cheap LLM** - DeepSeek API is very affordable  
✅ **Simple** - Only ONE API key needed  
✅ **Works offline** - Embeddings work without internet  

## 📚 Additional Resources

- **Detailed Ollama Setup**: See [OLLAMA_SETUP.md](OLLAMA_SETUP.md)
- **Main README**: See [README.md](README.md)
- **Ollama Documentation**: https://ollama.com/docs
- **DeepSeek Platform**: https://platform.deepseek.com

## 🔄 Next Steps

1. ✅ Run `./setup_ollama.sh`
2. ✅ Get DeepSeek API key from https://platform.deepseek.com
3. ✅ Configure `.env` file
4. ✅ Clear old vector store: `rm -rf backend/vector_store/`
5. ✅ Start server: `uvicorn main:app --reload`
6. ✅ Upload your PDFs via the API
7. ✅ Start asking questions!

## 🎉 You're All Set!

The 404 error is fixed. Your system now uses:
- **Ollama locally** for embeddings (free, fast, private)
- **DeepSeek API** for chat (cheap, high-quality)

Happy coding! 🚀
