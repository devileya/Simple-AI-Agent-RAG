# Ollama + DeepSeek Integration Guide

This guide explains how to set up Ollama for local embeddings with DeepSeek model, combined with DeepSeek API for LLM.

## Architecture

```
┌─────────────────────────────────────────────────┐
│         RAG System Architecture                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐         ┌─────────────────┐ │
│  │   Ollama     │         │  DeepSeek API   │ │
│  │  (Local)     │         │   (Cloud)       │ │
│  │              │         │                 │ │
│  │  Embeddings  │         │   LLM Chat      │ │
│  │  FREE!       │         │   Paid (cheap)  │ │
│  └──────────────┘         └─────────────────┘ │
│         ↓                         ↓           │
│  ┌──────────────┐         ┌─────────────────┐ │
│  │  ChromaDB    │         │  RAG Pipeline   │ │
│  │ Vector Store │←────────│  Answer Gen     │ │
│  └──────────────┘         └─────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Why This Setup?

### ✅ Benefits
- **Free embeddings**: Ollama runs locally, no API costs
- **Privacy**: Your documents never leave your machine for embedding
- **Fast**: Local embeddings are faster than API calls
- **Cheap LLM**: DeepSeek API is very affordable for chat
- **Best of both worlds**: Local + cloud hybrid

### 📊 Cost Comparison
| Component | Solution | Cost |
|-----------|----------|------|
| Embeddings | Ollama (local) | **FREE** |
| LLM Chat | DeepSeek API | ~$0.14 per 1M tokens |
| **Total** | Hybrid | **Minimal** |

Compare to all-cloud:
| Component | Solution | Cost |
|-----------|----------|------|
| Embeddings | OpenAI API | $0.02 per 1M tokens |
| LLM Chat | GPT-4 | $30 per 1M tokens |
| **Total** | All-cloud | **Expensive** |

## Installation Steps

### Step 1: Install Ollama

#### macOS
```bash
# Using Homebrew
brew install ollama

# Or download from https://ollama.com
```

#### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Windows
Download from https://ollama.com/download/windows

### Step 2: Start Ollama Service

```bash
# Start Ollama server
ollama serve
```

Keep this terminal running. The service will run on `http://localhost:11434`

### Step 3: Pull DeepSeek Model

Open a new terminal and pull the DeepSeek model for embeddings:

```bash
# Pull the lightweight 1.5B model (recommended for embeddings)
ollama pull deepseek-r1:1.5b

# Alternative: Pull larger model for better quality
ollama pull deepseek-r1:7b
```

### Step 4: Verify Ollama is Running

```bash
# Test if Ollama is responding
curl http://localhost:11434/api/tags

# You should see a JSON response with your models
```

### Step 5: Configure Your Application

Update your `.env` file:

```bash
# DeepSeek API for LLM (get from https://platform.deepseek.com)
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Ollama for embeddings (local)
OLLAMA_BASE_URL=http://localhost:11434

# Model configuration
EMBEDDING_MODEL=deepseek-r1:1.5b
LLM_MODEL=deepseek-chat
```

## Usage

### Embedding Generation (Ollama)
The system automatically uses Ollama to generate embeddings for your PDF documents:

```python
# This happens in vector_store.py
self.embedding_function = OllamaEmbeddings(
    model="deepseek-r1:1.5b",
    base_url="http://localhost:11434"
)
```

### LLM Chat (DeepSeek API)
The system uses DeepSeek API for generating answers:

```python
# This happens in rag_pipeline.py
self.llm = ChatOpenAI(
    model="deepseek-chat",
    api_key=settings.deepseek_api_key,
    base_url=settings.deepseek_base_url
)
```

## Troubleshooting

### Issue: Ollama not found
**Solution:**
```bash
# Check if Ollama is installed
which ollama

# If not installed, install it
brew install ollama  # macOS
```

### Issue: Connection refused to localhost:11434
**Solution:**
```bash
# Make sure Ollama service is running
ollama serve

# In a new terminal, check if it's listening
curl http://localhost:11434/api/tags
```

### Issue: Model not found
**Solution:**
```bash
# List available models
ollama list

# Pull the model if not present
ollama pull deepseek-r1:1.5b
```

### Issue: Ollama service stops after terminal closes
**Solution:**

For persistent service, use a process manager:

**macOS (using brew services):**
```bash
brew services start ollama
```

**Linux (using systemd):**
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

### Issue: Slow embedding generation
**Solution:**
- The 1.5B model is fast but if too slow, check:
  - Your CPU/RAM usage
  - Try closing other applications
  - Consider using a GPU if available

## Model Options

### Available DeepSeek Models in Ollama

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `deepseek-r1:1.5b` | 1.5GB | Fast | Good | Recommended for embeddings |
| `deepseek-r1:7b` | 7GB | Medium | Better | Higher quality embeddings |
| `deepseek-r1:14b` | 14GB | Slow | Best | Maximum quality |

### Switching Models

Edit your `.env`:
```bash
# Use larger model for better quality
EMBEDDING_MODEL=deepseek-r1:7b
```

Then pull the model:
```bash
ollama pull deepseek-r1:7b
```

## Performance Tips

### Optimize Ollama
1. **Use SSD**: Store models on SSD for faster loading
2. **Allocate RAM**: Ensure enough RAM for model size
3. **GPU acceleration**: If you have NVIDIA GPU, Ollama will use it automatically

### Monitor Performance
```bash
# Check Ollama logs
ollama logs

# Monitor resource usage
ollama ps
```

## Advanced Configuration

### Custom Ollama Port
If port 11434 is taken:

```bash
# Start Ollama on different port
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

Update `.env`:
```bash
OLLAMA_BASE_URL=http://localhost:11435
```

### Multiple Models
You can have multiple models for different purposes:

```bash
# Pull multiple models
ollama pull deepseek-r1:1.5b
ollama pull deepseek-r1:7b

# Switch between them in .env
EMBEDDING_MODEL=deepseek-r1:7b  # For production
# EMBEDDING_MODEL=deepseek-r1:1.5b  # For development
```

## Resources

- **Ollama Documentation**: https://ollama.com/docs
- **DeepSeek Models**: https://ollama.com/library/deepseek-r1
- **DeepSeek API**: https://platform.deepseek.com
- **LangChain Ollama Integration**: https://python.langchain.com/docs/integrations/text_embedding/ollama

## Summary

This setup gives you:
- ✅ **FREE** local embeddings via Ollama
- ✅ **Cheap** LLM via DeepSeek API
- ✅ **Privacy** - documents stay local
- ✅ **Speed** - no API latency for embeddings
- ✅ **Simple** - only one API key needed

Perfect balance of cost, privacy, and performance! 🚀
