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
RUN echo "=== Installing ML packages (this may take 5-10 minutes) ===" && \
    pip install --no-cache-dir --default-timeout=600 \
        "sentence-transformers==2.2.2" || \
    (echo "sentence-transformers failed, retrying..." && \
     pip install --no-cache-dir --default-timeout=900 --retries 3 \
         "sentence-transformers==2.2.2")

# Stage 5: Remaining packages (fast)
RUN echo "=== Installing remaining packages ===" && \
    pip install --no-cache-dir --default-timeout=300 \
        "anthropic==0.18.1" \
        "python-multipart==0.0.6" \
        "httpx==0.25.2"

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data chroma_db

# Expose FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]

