# Security Guide - API Keys Management

## 🔐 Secure API Key Storage

**Never commit API keys to version control!** The `.env` file is already in `.gitignore`.

### ✅ Recommended: Use .env File

**All API keys should be stored in the `.env` file only.**

1. **Create or edit `.env` file** in the project root:
   ```env
   # Anthropic Configuration (Required for LLM/RAG features)
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

   # LangChain Configuration (Optional)
   LANGCHAIN_TRACING_V2=false
   LANGCHAIN_API_KEY=
   ```

2. **Security Best Practices**:
   - ✅ Keep `.env` in `.gitignore` (already done)
   - ✅ Never commit `.env` to Git
   - ✅ Never share `.env` files
   - ✅ Use `.env.example` as a template (without real keys)
   - ❌ Don't add `.env` to version control
   - ❌ Don't hardcode keys in any source files

## 🔍 How the Application Loads Keys

The application loads API keys from the `.env` file using `python-dotenv`:
- Keys are read from `.env` file in the project root
- If `.env` doesn't exist, keys will be empty (optional features disabled)

## ✅ Verification

Check if your API key is loaded:
```bash
# Test in Python
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('Key set:', bool(os.getenv('ANTHROPIC_API_KEY')))"
```

Or check in the application:
```bash
curl http://localhost:8000/health
# Check the "llm" status in response
```

## 🚨 If You Accidentally Committed Keys

1. **Immediately rotate/revoke the exposed key** in your API provider dashboard
2. **Remove from Git history**:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Add to `.gitignore`** (already done)
4. **Force push** (if already pushed to remote):
   ```bash
   git push origin --force --all
   ```

## 📝 .env File Template

The `.env` file should contain:
```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=container_yard_password

# ChromaDB Configuration
CHROMA_DB_PATH=./chroma_db

# Anthropic Configuration (Required for LLM/RAG features)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# LangChain Configuration (Optional)
LANGCHAIN_TRACING_V2=false
LANGCHAIN_API_KEY=
```

**Add your actual API keys to this file, but never commit it to Git!**
