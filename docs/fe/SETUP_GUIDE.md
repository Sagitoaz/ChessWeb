# ChessWeb Frontend Setup Guide

## 🚀 Quick Start

### 1. Initialize Project
```bash
# Tạo project với Vite
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

### 2. Install Dependencies
```bash
# Core dependencies
npm install react-router-dom chess.js react-chessboard socket.io-client axios zustand @tanstack/react-query react-hook-form zod date-fns lucide-react clsx react-hot-toast

# Dev dependencies
npm install -D tailwindcss postcss autoprefixer eslint prettier eslint-config-prettier
```

### 3. Setup Tailwind CSS
```bash
npx tailwindcss init -p
```

Edit `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}
```

### 4. Project Structure
Create these folders:
```bash
mkdir -p src/{components/{common,layout,game},pages/{auth,profile,ranked,rooms,tournaments,bot,replay,home},services,hooks,store,utils,routes,styles,mocks}
```

### 5. Environment Variables
Create `.env` file:
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## 📦 Package.json Example

```json
{
  "name": "chessweb-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{js,jsx,json,css}\""
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "chess.js": "^1.0.0-beta.6",
    "react-chessboard": "^4.3.2",
    "socket.io-client": "^4.6.1",
    "axios": "^1.6.5",
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.17.19",
    "react-hook-form": "^7.49.3",
    "zod": "^3.22.4",
    "date-fns": "^3.2.0",
    "lucide-react": "^0.309.0",
    "clsx": "^2.1.0",
    "react-hot-toast": "^2.4.1",
    "framer-motion": "^10.18.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.11",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.33",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "prettier": "^3.1.1",
    "eslint-config-prettier": "^9.1.0"
  }
}
```

## 🎨 Global Styles

Create `src/styles/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply box-border;
  }

  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }

  #root {
    @apply min-h-screen;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
  }

  .btn-primary {
    @apply bg-primary text-white hover:bg-blue-600 active:scale-95;
  }

  .btn-secondary {
    @apply bg-secondary text-white hover:bg-green-600 active:scale-95;
  }

  .btn-outline {
    @apply border-2 border-primary text-primary hover:bg-primary hover:text-white;
  }

  .btn-danger {
    @apply bg-danger text-white hover:bg-red-600 active:scale-95;
  }

  .card {
    @apply bg-white rounded-xl shadow-md p-6;
  }

  .input {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary;
  }
}
```

## 📱 ESLint Config

`.eslintrc.cjs`:
```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
  },
}
```

## 🎯 Prettier Config

`.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always"
}
```

## 🔥 Git Ignore

Add to `.gitignore`:
```
# dependencies
node_modules/

# production
dist/
build/

# env files
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# logs
*.log
```

## 🌳 Git Branch Setup

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create develop branch
git checkout -b develop

# Push to remote
git remote add origin <your-repo-url>
git push -u origin main
git push -u origin develop
```

## 👥 Team Workflow

### Create feature branch:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/auth-profile  # Thay tên theo module
```

### Commit changes:
```bash
git add .
git commit -m "feat: add login page"
git push origin feature/auth-profile
```

### Create Pull Request:
1. Go to GitHub/GitLab
2. Create PR from `feature/auth-profile` → `develop`
3. Request review from team member
4. Merge after approval

## 📝 VS Code Extensions (Recommended)

- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets
- Auto Rename Tag
- Path Intellisense

## 🔧 VS Code Settings

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] Project created with Vite
- [ ] All dependencies installed
- [ ] Tailwind CSS configured
- [ ] Folder structure created
- [ ] ESLint & Prettier configured
- [ ] Git initialized
- [ ] Environment variables set
- [ ] VS Code extensions installed
- [ ] Team members can run `npm run dev` successfully

## 🚀 Run Project

```bash
npm run dev
```

Visit: http://localhost:5173

---

**Next Steps:** Start creating common components!
