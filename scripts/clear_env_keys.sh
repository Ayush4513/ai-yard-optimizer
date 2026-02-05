#!/bin/bash
# Script to clear API keys from .env file (keep only placeholders)

echo "🔐 Clearing API keys from .env file..."
echo ""

if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    exit 1
fi

# Backup original
cp .env .env.backup
echo "✅ Created backup: .env.backup"

# Clear API keys (set to empty)
sed -i.bak 's/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=/' .env
sed -i.bak 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=/' .env

# Remove backup file created by sed
rm -f .env.bak

echo "✅ API keys cleared from .env"
echo ""
echo "💡 To set API keys, edit .env file directly:"
echo "   Add your keys to the .env file in the project root"
echo ""
echo "   See SECURITY.md for detailed instructions"
echo ""

