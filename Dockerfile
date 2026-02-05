# Dockerfile for Container Yard Optimization API
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first (for better caching)
COPY requirements.txt .

# Install Python dependencies in stages for better progress visibility
# Stage 1: Core framework (fast)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    echo "=== Installing core framework ===" && \
    pip install --no-cache-dir --default-timeout=300 \
        "fastapi==0.104.1" \
        "uvicorn[standard]==0.24.0" \
        "pydantic>=2.0.0,<3.0.0" \
        "python-dotenv==1.0.0"

# Stage 2: Database clients (fast)
RUN echo "=== Installing database clients ===" && \
    pip install --no-cache-dir --default-timeout=300 \
        "neo4j==5.14.1" \
        "chromadb==0.4.18"

# Stage 3: LangChain (medium)
RUN echo "=== Installing LangChain packages ===" && \
    pip install --no-cache-dir --default-timeout=300 \
        "langchain==0.1.0" \
        "langchain-community==0.0.10" \
        "langchain-anthropic==0.1.0" \
        "langchain-core==0.1.10"

# Stage 4: ML/AI packages (SLOW - this is where it takes time)
# Install torch first (required by sentence-transformers)
RUN echo "=== Installing PyTorch (this may take 5-10 minutes) ===" && \
    pip install --no-cache-dir --default-timeout=600 \
        "torch>=2.0.0" && \
    echo "=== PyTorch installed ==="

# Install sentence-transformers with dependencies
# Note: sentence-transformers 2.2.2 is incompatible with newer huggingface_hub
# Using 2.3.0+ which is compatible with current huggingface_hub versions
RUN echo "=== Installing huggingface_hub (compatible version) ===" && \
    pip install --no-cache-dir --default-timeout=300 \
        "huggingface_hub>=0.20.0,<1.0.0" && \
    echo "=== Installing sentence-transformers ===" && \
    pip install --no-cache-dir --default-timeout=600 \
        "transformers>=4.30.0" \
        "sentence-transformers>=2.3.0,<3.0.0" && \
    echo "=== Verifying sentence-transformers ===" && \
    python -c "from sentence_transformers import SentenceTransformer; print('✓ sentence-transformers OK')"

# Stage 5: Remaining packages (fast)
RUN echo "=== Installing remaining packages ===" && \
    pip install --no-cache-dir --default-timeout=300 \
        "anthropic==0.18.1" \
        "python-multipart==0.0.6" \
        "httpx==0.25.2"

# Copy application code
# Copy root-level files first
COPY requirements.txt .
COPY .env* ./

# Copy Yard-Optimization backend (the main API)
COPY Yard-Optimization/backend /app/Yard-Optimization/backend

# Install backend-specific requirements if they exist
RUN if [ -f /app/Yard-Optimization/backend/requirements.txt ]; then \
        echo "=== Installing backend requirements ===" && \
        pip install --no-cache-dir --default-timeout=300 -r /app/Yard-Optimization/backend/requirements.txt; \
    fi

# Copy src directory (for shared modules if needed, but exclude main.py to avoid conflicts)
COPY src /app/src
RUN rm -f /app/src/main.py 2>/dev/null || true  # Remove conflicting main.py if it exists

# Copy data and scripts directories
COPY data /app/data
COPY scripts /app/scripts

# Create necessary directories
RUN mkdir -p /app/data /app/chroma_db /app/Yard-Optimization/backend

# Expose FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Set working directory to backend (where the main app is)
WORKDIR /app/Yard-Optimization/backend

# Set PYTHONPATH to include backend directory so Modules.* imports work
ENV PYTHONPATH=/app/Yard-Optimization/backend

# Verify the main module can be imported before running
RUN python -c "import Modules.main; print('Main module import successful')" || echo "Warning: Main module import check failed"

# Run the application from the backend directory
CMD ["python", "-m", "uvicorn", "Modules.main:app", "--host", "0.0.0.0", "--port", "8000"]

