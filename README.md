# 🤖 AI-Enhanced Electronics Lab Inventory

A modern, intelligent inventory management system for electronics labs with AI-powered object recognition.

## ✨ Features

- **🔍 AI Object Detection**: Automatically identify and catalog items using TensorFlow.js
- **📷 Camera Integration**: Real-time object recognition through device camera
- **📤 Image Upload**: Upload photos for AI analysis
- **🏷️ Smart Cataloging**: Auto-generate containers with detected items
- **🔍 Intelligent Search**: Find items across all containers instantly
- **📱 Mobile Optimized**: Perfect for lab use on phones and tablets
- **💾 Local Storage**: All data saved locally, works offline
- **📊 Export/Import**: Backup and restore your inventory data

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd electronics-inventory

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

### Deployment
This project is configured for automatic deployment to Netlify:
1. Push to `master` branch
2. Netlify automatically builds and deploys
3. Your app is live!

## 🤖 AI Technology

- **TensorFlow.js**: Browser-based machine learning
- **COCO-SSD Model**: Pre-trained object detection (80+ classes)
- **Privacy-First**: All processing happens locally
- **Offline Capable**: Works without internet after initial load

## 📱 Usage

1. **Allow Camera Access**: Grant permissions for AI features
2. **Wait for AI Model**: Green checkmark indicates ready
3. **Scan Containers**: Use camera or upload images
4. **Auto-Catalog**: AI detects and adds items automatically
5. **Search & Organize**: Find items instantly

## 🛠️ Tech Stack

- **React 19**: Modern UI framework
- **Vite**: Fast build tool
- **TensorFlow.js**: AI/ML capabilities
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Beautiful icons
- **Netlify**: Deployment platform

## 📦 Scripts

```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run preview  # Preview production build
```

## 🌐 Deployment

Configured for Netlify with:
- Automatic builds on push to master
- SPA routing support
- Performance optimizations
- Security headers

## 🔒 Privacy

- All AI processing happens in your browser
- No images uploaded to external servers
- Data stored locally on your device
- Complete privacy for your lab inventory

---

**Perfect for modern electronics labs that demand efficiency and innovation! 🚀**
