#!/bin/bash

# Ollama + DeepSeek Setup Script
# This script automates the setup of Ollama with DeepSeek model

set -e  # Exit on error

echo "🚀 Setting up Ollama with DeepSeek for embeddings..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Ollama is installed
echo "Step 1: Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    print_success "Ollama is already installed"
else
    print_info "Ollama not found. Installing..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            print_info "Installing via Homebrew..."
            brew install ollama
            print_success "Ollama installed via Homebrew"
        else
            print_error "Homebrew not found. Please install from https://ollama.com"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        print_info "Installing via curl..."
        curl -fsSL https://ollama.com/install.sh | sh
        print_success "Ollama installed"
    else
        print_error "Unsupported OS. Please install manually from https://ollama.com"
        exit 1
    fi
fi

echo ""
echo "Step 2: Checking if Ollama service is running..."

# Check if Ollama is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    print_success "Ollama service is running"
else
    print_info "Starting Ollama service..."
    
    # Try to start Ollama in background
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - try brew services first
        if command -v brew &> /dev/null; then
            brew services start ollama 2>/dev/null || {
                print_info "Starting Ollama manually..."
                nohup ollama serve > /dev/null 2>&1 &
            }
        else
            nohup ollama serve > /dev/null 2>&1 &
        fi
    else
        # Linux
        nohup ollama serve > /dev/null 2>&1 &
    fi
    
    # Wait for service to be ready (retry up to 10 times)
    print_info "Waiting for Ollama service to be ready..."
    for i in {1..10}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            print_success "Ollama service started successfully"
            break
        fi
        sleep 1
        if [ $i -eq 10 ]; then
            print_error "Ollama service took too long to start. Please run 'ollama serve' manually"
            exit 1
        fi
    done
fi

echo ""
echo "Step 3: Checking DeepSeek model..."

# Check if model is already pulled
if ollama list | grep -q "deepseek-r1:1.5b"; then
    print_success "DeepSeek model (1.5b) is already available"
else
    print_info "Pulling DeepSeek model (1.5b) - this may take a few minutes..."
    ollama pull deepseek-r1:1.5b
    print_success "DeepSeek model downloaded successfully"
fi

echo ""
echo "Step 4: Verifying setup..."

# Verify everything works
if curl -s http://localhost:11434/api/tags | grep -q "deepseek-r1:1.5b"; then
    print_success "Setup verification passed!"
else
    print_error "Setup verification failed"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Setup complete! ✨"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Available models:"
ollama list
echo ""
print_info "Next steps:"
echo "  1. Make sure your .env file has: OLLAMA_BASE_URL=http://localhost:11434"
echo "  2. Set EMBEDDING_MODEL=deepseek-r1:1.5b in your .env"
echo "  3. Get your DeepSeek API key from https://platform.deepseek.com"
echo "  4. Set DEEPSEEK_API_KEY in your .env"
echo "  5. Run: cd backend && uvicorn main:app --reload"
echo ""
print_success "Happy coding! 🚀"
