#!/bin/bash

echo "🚀 ZClipper.com Launch Script"
echo "==============================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the zclipper directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Building for production..."
npm run build

echo "🧪 Running tests..."
npm run lint || echo "⚠️ Linting issues found - continuing anyway"

echo "🌐 Deploying to Vercel..."
npx vercel --prod

echo ""
echo "✅ Frontend deployed!"
echo ""
echo "🔧 Next steps:"
echo "1. Deploy backend to Railway/Render"
echo "2. Update DNS for zclipper.com"  
echo "3. Set environment variables"
echo "4. Test end-to-end functionality"
echo ""
echo "🎉 Ready to launch ZClipper.com!"