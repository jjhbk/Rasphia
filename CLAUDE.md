# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rasphia** is a dual-interface AI shopping concierge platform:
- **Web App** (Next.js 16): Interactive chat-based product discovery with persona-driven recommendations
- **Chrome Extension** (MV3): In-page product analysis, virtual try-on, and contextualized shopping insights

The system uses AI (OpenAI GPT-4, Google Gemini 2.0 Flash) for personalized product curation, vector embeddings for semantic search, and integrates with Razorpay (payments), WhatsApp (messaging), and Vercel Blob (image storage). MongoDB stores user profiles, personas, chat history, orders, and analyses.

**Core Hypothesis**: Personalization via detailed user personas (skin type, hair type, body type, style archetype, taste, lifestyle) enables AI to recommend products that are genuinely aligned with user needs—not just trending.

---

## Table of Contents

1. [Development & Build](#development--build)
2. [Architecture: Web App](#architecture-web-app)
3. [Architecture: Chrome Extension](#architecture-chrome-extension)
4. [Data Models & MongoDB Schema](#data-models--mongodb-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Routes Reference](#api-routes-reference)
7. [State Management & Data Flow](#state-management--data-flow)
8. [Persona System: The Core Innovation](#persona-system-the-core-innovation)
9. [AI Integration Patterns](#ai-integration-patterns)
10. [External Integrations](#external-integrations)
11. [Common Patterns & Anti-Patterns](#common-patterns--anti-patterns)
12. [Testing & Quality](#testing--quality)
13. [Performance Considerations](#performance-considerations)

---

## Development & Build

### Commands

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint check
```

### Environment Setup

**Required `.env.local`:**
```
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rasphia

# NextAuth & OAuth
NEXTAUTH_URL=http://localhost:3000 (dev) or https://rasphia.com (prod)
NEXTAUTH_SECRET=<32-byte random hex>
GOOGLE_CLIENT_ID=<from console.cloud.google.com>
GOOGLE_CLIENT_SECRET=<from console.cloud.google.com>
ADMIN_EMAILS=admin@rasphia.com (comma-separated for admin role)

# LLMs
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...

# Payments
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=<secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-signing-secret>

# Messaging
WHATSAPP_PHONE_NUMBER_ID=<phone-id>
WHATSAPP_TOKEN=<bearer-token>

# Extension Auth
EXTENSION_JWT_SECRET=<32-byte random hex>

# File Storage
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
```

### Build Configuration

**Important**: `next.config.js` explicitly ignores TypeScript and ESLint errors:
```javascript
typescript: { ignoreBuildErrors: true }
eslint: { ignoreDuringBuilds: true }
```

This is a **major red flag** for code quality. Fix errors instead of relying on this. Consider re-enabling these checks and actually fixing issues.

### Path Aliases

TypeScript path alias: `@/*` → project root. Use `@/app/lib/...` instead of relative paths.

---

## Architecture: Web App

### High-Level Flow

```
User (Browser)
    ↓
NextAuth Session (Google OAuth)
    ↓
/app/page.tsx (Client Component)
    ├─ Chat UI ──► /api/chats/* ──► OpenAI (curate-openai) ──► MongoDB
    ├─ Persona ──► /api/persona/* ──► Gemini (analyze image) ──► MongoDB
    ├─ Checkout ──► /api/create-order ──► Razorpay
    ├─ Payment ──► /api/verify-payment ──► Razorpay webhook
    └─ WhatsApp ──► /api/razorpay-webhook ──► WhatsApp Cloud API
```

### Page Structure

**Entry Point**: `/app/layout.tsx`
- Wraps with `SessionProvider` (NextAuth)
- Provides context for all child pages
- No auth enforced at layout level (public + protected pages mixed)

**Main App**: `/app/page.tsx`
- **Large client component** (1000+ lines) managing:
  - Chat history + new message handling
  - Cart state + checkout flow
  - Profile display + order history
  - Analysis tools (image upload, face/skin analysis)
  - Persona editing modal
  - Sign-in popup (unauthenticated state)
  - Product comparison table
  - Review submission modal

- **Three-panel layout:**
  - Left: `ChatSidebar` (chat list, new chat button, search)
  - Center: `ChatWindow` (message history), `ChatInput` (text input + send)
  - Right: `AnalysisSidebar` (analysis tools), `PersonaSidebar` (persona summary)

**Secondary Pages**:
- `/admin` - Admin product management (CRUD products)
- `/persona` + `/persona/create` - Dedicated persona creation flow (optional; modal in main app preferred)
- `/face` - Face analysis page (alternative UI)
- `/tryon/[id]` - Virtual try-on result detail page
- `/stylist` - Stylist recommendation page
- `/otp` - WhatsApp OTP verification
- `/contact`, `/about`, `/privacy`, `/credits` - Static pages

### Component Hierarchy

**Core Chat Components:**
```
/app/page.tsx
├─ ChatSidebar.tsx
│   └─ Chat list + new chat button
├─ ChatWindow.tsx
│   └─ Renders messages with auto-scroll
├─ ChatInput.tsx
│   └─ Text input + send button
└─ Message.tsx
    └─ Single message bubble (user or AI)
```

**Product & Checkout:**
```
/app/page.tsx
├─ CartModal.tsx
│   └─ Shopping cart display + add/remove
├─ CheckoutPage.tsx
│   └─ Shipping details + Razorpay payment gateway
├─ ProductCard.tsx
│   └─ Product display (image, name, price, description)
└─ ComparisonTable.tsx
    └─ Renders product comparison headers + rows
```

**Persona System:**
```
/app/page.tsx
└─ PersonaSidebar.tsx
    └─ Persona summary display
└─ persona/PersonalFlowModal.tsx (conditional render)
    └─ Flow components (BodyFlow, StyleFlow, SkinFlow, HairFlow, LifestyleFlow, TasteFlow)
        └─ Each flow: multiple-choice + image capture
```

**Analysis Tools:**
```
/app/page.tsx
└─ AnalysisSidebar.tsx
    ├─ AnalysisUploadModal.tsx (image upload)
    ├─ AnalysisListModal.tsx (past analyses)
    ├─ AnalysisDetailsModal.tsx (detailed result)
    └─ FaceBlur.tsx (privacy control)
```

### State Management in /app/page.tsx

Uses `useState` heavily for:
```typescript
// Authentication
const [session, isLoadingSession] = useState()

// Chat
const [chats, setChats] = useState<ChatSession[]>([])
const [selectedChat, setSelectedChat] = useState<ChatSession | null>()
const [messages, setMessages] = useState<Message[]>([])
const [isLoadingResponse, setIsLoadingResponse] = useState(false)

// Persona
const [persona, setPersona] = useState<Persona | null>()
const [showPersonaModal, setShowPersonaModal] = useState(false)

// Cart & Checkout
const [cartItems, setCartItems] = useState<Product[]>([])
const [showCheckout, setShowCheckout] = useState(false)
const [checkoutData, setCheckoutData] = useState<CheckoutCustomer>()

// Analysis
const [analyses, setAnalyses] = useState<Analysis[]>([])
const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis>()
const [showAnalysisModal, setShowAnalysisModal] = useState(false)

// UI
const [showProfile, setShowProfile] = useState(false)
const [showCart, setShowCart] = useState(false)
const [showReviewModal, setShowReviewModal] = useState(false)
```

**Note**: This single component is a refactoring candidate. Break into smaller components with context providers:
- `ChatProvider` for chat state
- `CartProvider` for cart state
- `PersonaProvider` for persona state
- `AnalysisProvider` for analysis state

---

## Architecture: Chrome Extension

**Note**: This is a **separate Git repository** (`rasphia-extension/`). Changes to the main app's `/api/extension/*` routes require extension updates to consume them.

### Extension Structure

```
rasphia-extension/
├── manifest.json                    # MV3 manifest (side panel UI)
├── background/
│   └── background.js                # Service worker (main orchestrator)
├── sidebar/
│   ├── sidebar.html                 # UI markup
│   ├── sidebar.js                   # State machine + event handlers
│   └── sidebar.css                  # Styling
├── content/
│   ├── contentScript.js             # Product detection + page automation
│   ├── pdpExtractor.js              # High-quality image extraction
│   ├── authScript.js                # Auth callback handling
│   └── contentScript.css
├── utils/
│   └── api.js                       # API helper (mostly deprecated)
└── lib/
    ├── marked.min.js                # Markdown rendering
    └── purify.min.js                # XSS sanitization (DOMPurify)
```

### Extension Authentication Flow

1. **Initialization:**
   ```
   User clicks "Connect Rasphia" in sidebar
       ↓
   `background.js` → `GET /api/extension/init?ext=1`
       ↓
   Returns one-time token (5-min expiry) + login URL
       ↓
   Opens: ${baseUrl}/api/auth/signin/google?callbackUrl=/extension/auth?token=${token}
   ```

2. **Google OAuth:**
   ```
   User signs in with Google consent
       ↓
   Google redirects to: /extension/auth?token=${token}
       ↓
   contentScript.js (authScript.js) intercepts callback
       ↓
   Extracts token, posts to background.js
   ```

3. **Token Exchange:**
   ```
   background.js → `POST /api/extension/exchange`
   Body: { oneTimeToken: "..." }
       ↓
   Returns: { access_token: "jwt...", expires_in: 604800 }
       ↓
   Stored in chrome.storage.local.rasphia_ext_token
   ```

4. **API Calls:**
   ```
   All extension API requests include:
   Header: X-Rasphia-Extension-Token: ${jwt}
       ↓
   Backend verifies JWT with EXTENSION_JWT_SECRET
       ↓
   Extracts email + validates signature
   ```

### Extension Feature Map

| Feature | Component | API Endpoint | Credits |
|---------|-----------|--------------|---------|
| **Persona Gate** | sidebar.js | GET /api/extension/persona/get | Free |
| **Product Detection** | contentScript.js | N/A (client-side heuristic) | Free |
| **Chat** | sidebar.js | POST /api/extension/chats/add-message | Free |
| **Product Insights** | sidebar.js | POST /api/extension/chats/add-message (with context) | 5 credits |
| **Virtual Try-On** | sidebar.js | POST /api/extension/tryon-gemini | 20 credits |
| **Best Pick** | sidebar.js | POST /api/extension/chats/best-pick | Free |
| **Reimagine** | sidebar.js | POST /api/extension/reimagine | 10 credits |
| **View Analyses** | sidebar.js | GET /api/extension/insights/list | Free |

### Product Detection Algorithm (contentScript.js)

Detects products on major e-commerce sites by site-specific heuristics:

**Amazon:**
```javascript
// Detects via data-old-hires attribute
document.querySelectorAll('[data-old-hires*="cloudfront"]')
```

**Myntra:**
```javascript
// Detects via background image URLs
document.querySelectorAll('.image-grid-image')
```

**Shopify:**
```javascript
// Detects via Liquid template JSON
window.Shopify?.products || JSON.parse(script.text)
```

**Fallback (Unknown Sites):**
```javascript
// Heuristic: Search for <img> tags with product-like alt text
// Filter by size, aspect ratio, URL patterns (cdn, shop, product, etc.)
```

Returns: `{ products: [{ name, image, price, url }] }`

### Extension Message Flow

```
User Action (sidebar.js)
    ↓
window.postMessage({ type: 'ACTION_NAME', payload: {...} })
    ↓
contentScript.js (message listener)
    ↓
chrome.runtime.sendMessage to background.js
    ↓
background.js (message hub)
    ├─ Fetches token from storage
    ├─ Calls API with X-Rasphia-Extension-Token
    ├─ Sends response back to content/sidebar
    └─ Updates UI state
```

Example: Product Analysis
```javascript
// sidebar.js
window.postMessage({
  type: 'ANALYZE_PRODUCT',
  payload: { productName: 'Nike Shoes', imageUrl: '...' }
})

// contentScript.js intercepts, forwards to background
chrome.runtime.sendMessage({
  action: 'analyzeProduct',
  data: { productName, imageUrl }
})

// background.js
chrome.runtime.onMessage.addListener(({ action, data }, sender, sendResponse) => {
  if (action === 'analyzeProduct') {
    callStandardAPI('/api/extension/chats/add-message', {
      message: `Analyze: ${data.productName}`,
      productContext: data.imageUrl
    }).then(sendResponse)
  }
})

// Response sent back to sidebar.js, updates UI
```

### Extension CORS & Permissions

**manifest.json permissions:**
```json
{
  "host_permissions": [],  // NO host_permissions!
  "permissions": [
    "activeTab",           // Can inject content script in active tab
    "tabs",                // Can read tab data
    "storage"              // Local storage for token
  ]
}
```

**CORS Strategy:**
- No host_permissions = content script runs on any page
- Extension adds CORS headers to all requests:
  ```
  Access-Control-Allow-Origin: chrome-extension://<ext-id>
  Access-Control-Allow-Methods: POST, GET
  Access-Control-Allow-Headers: Content-Type, X-Rasphia-Extension-Token
  ```
- Backend verifies `withExtensionCors()` wrapper on response

---

## Data Models & MongoDB Schema

### Core Types (app/types.ts)

```typescript
// Message in chat
interface Message {
  author: 'user' | 'ai'
  text: string
  products?: Product[]           // Embedded product cards
  comparisonTable?: {
    headers: string[]
    rows: string[][]             // For "compare X vs Y" queries
  }
  createdAt?: ISO8601
}

// Chat session (stores conversation history)
interface ChatSession {
  _id?: ObjectId
  userEmail: string
  title: string
  messages: Message[]            // All messages in conversation
  context?: { products?: Product[] }  // Attached context (for extension)
  createdAt: ISO8601
  updatedAt: ISO8601
}

// Product (comprehensive schema for hyper-personalization)
interface Product {
  _id?: ObjectId
  name: string
  brand?: string
  category: string               // e.g. "skincare", "fashion", "fragrances"
  price?: number
  description?: string
  story?: string                 // Brand story/why unique
  imageUrl?: string
  affiliateLink?: string         // E-commerce link (Amazon, Myntra, etc.)

  // Flexible tags (legacy)
  tags?: string[]
  occasion?: string[]
  recipient?: string

  // Personalization: Style
  styleTags?: string[]           // e.g. ["streetwear", "minimal", "boho"]
  colorPalette?: string[]        // e.g. ["beige", "navy"]
  materials?: string[]           // e.g. ["leather", "cotton", "silk"]

  // Structured attributes (deep personalization)
  attributes?: {
    // Skincare
    skinType?: string[]          // "oily" | "dry" | "combination" | "sensitive"
    concerns?: string[]          // "acne" | "pigmentation" | "aging" | "dullness"
    comedogenicRating?: number   // 0-5 (clogging risk)
    actives?: string[]           // "salicylic acid" | "niacinamide" | "retinol"

    // Haircare
    hairType?: string[]          // "straight" | "wavy" | "curly" | "coily"
    hairConcerns?: string[]      // "frizz" | "dryness" | "breakage"
    ingredients?: string[]       // "keratin" | "argan oil" | "biotin"

    // Body/Fitness
    physiqueGoals?: string[]     // "fat loss" | "muscle gain" | "lean"
    usageTime?: string           // "daily" | "AM/PM" | "pre-workout"

    // Fashion
    fit?: string[]               // "relaxed" | "slim" | "oversized"
    silhouette?: string[]        // "drop-shoulder" | "cropped" | "oversized"

    // Home Decor
    aesthetic?: string[]         // "minimal" | "modern" | "vintage" | "cozy"
    room?: string[]              // "bedroom" | "living room" | "kitchen"

    // Gifting
    occasion?: string[]          // "birthday" | "anniversary" | "wedding"
    recipient?: string           // "him" | "her" | "unisex"

    // Fragrances
    scentNotes?: string[]        // "citrus" | "amber" | "spicy" | "floral"
    projection?: string          // "soft" | "moderate" | "strong"
    longevity?: string           // "4-6h" | "8h+" | "24h+"

    // General use cases (cross-category)
    useCases?: string[]          // "travel-friendly" | "premium" | "office"
  }

  // Persona alignment scoring
  personaAlignment?: {
    skinScore?: number           // 0-100 (% match to user's skin needs)
    hairScore?: number
    styleScore?: number
    homeScore?: number
    fragranceScore?: number
    lifestyleScore?: number
    giftingScore?: number
  }

  // Reviews & social proof
  reviews?: Array<{
    rating: 1 | 2 | 3 | 4 | 5
    comment?: string
    user?: string                // Email of reviewer
    date?: ISO8601
  }>

  // Vector embeddings for semantic search
  embedding?: number[]           // 1536-dim (OpenAI ada-002) or 768-dim (other)
}

// User persona (the core personalization engine)
interface Persona {
  skin?: {
    photoUrls?: string[]
    skinType?: string            // "oily" | "dry" | "combination" | "sensitive"
    concerns?: string[]          // Acne, pigmentation, aging, dullness, etc.
    sensitivity?: string         // "low" | "medium" | "high"
    fitzpatrick?: number         // 1-6 (skin tone classification)
    climate?: string             // "humid" | "dry" | "temperate"
    allergies?: string[]
  }

  hair?: {
    photoUrls?: string[]
    hairType?: string            // "straight" | "wavy" | "curly" | "coily" | "kinky"
    density?: string             // "thin" | "medium" | "thick"
    scalpType?: string           // "oily" | "dry" | "normal"
    goals?: string[]             // "shine" | "growth" | "volume"
    lifestyle?: string           // "low-maintenance" | "high-maintenance"
    colorTreated?: boolean
  }

  body?: {
    photoUrls?: string[]
    height?: string              // e.g. "5'6\""
    frame?: string               // "petite" | "medium" | "tall"
    proportions?: string         // "pear" | "apple" | "hourglass"
    bodyType?: string            // "ectomorph" | "mesomorph" | "endomorph"
    activities?: string[]        // "yoga" | "gym" | "running"
    goals?: string[]             // "flexibility" | "strength" | "endurance"
  }

  style?: {
    archetypes?: string[]        // "minimalist" | "maximalist" | "preppy" | etc.
    colorPalette?: string[]      // "warm" | "cool" | "neutral"
    boldness?: number            // 1-10 (adventurousness in fashion)
    occasions?: string[]         // "casual" | "professional" | "party"
    footwear?: string[]          // "sneakers" | "heels" | "flats"
    accessories?: string[]       // "minimal" | "maximalist"
  }

  taste?: {
    giftingStyle?: string        // "sentimental" | "practical" | "luxury"
    decorPreferences?: string[]  // "minimalist" | "maximalist" | "vintage"
    scentPreferences?: string[]  // "fresh" | "floral" | "woody" | "gourmand"
    priceComfort?: string        // "budget" | "mid-range" | "luxury"
    brandLoyal?: boolean
  }

  lifestyle?: {
    workSetup?: string           // "remote" | "office" | "hybrid"
    diet?: string[]              // "vegetarian" | "vegan" | "omnivore"
    fitness?: number             // 1-10 (activity level)
    travelFrequency?: string     // "never" | "occasionally" | "frequently"
    climate?: string             // e.g. "tropical", "temperate", "cold"
    sleep?: number               // hours per night
  }
}

// Order (purchase record)
interface Order {
  _id?: ObjectId
  order_id: string              // Razorpay order ID
  customer: {
    name: string
    email: string
    phone: string
    address: string
  }
  products: Product[]
  payment_id?: string           // Razorpay payment ID
  amount: number                // In INR
  currency: string              // "INR"
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Paid'
  trackingNumber?: string
  isReviewed?: boolean
  createdAt: ISO8601
  updatedAt: ISO8601
}

// User profile
interface UserProfile {
  _id?: ObjectId
  email: string                 // Primary key
  name?: string
  phone?: string
  address?: string
  profileImage?: string
  wishlist?: Product[]
  credits: number               // Extension credit balance
  role: 'user' | 'admin'        // Set based on ADMIN_EMAILS env var
  createdAt: ISO8601
  updatedAt: ISO8601
}

// Image analysis result
interface Analysis {
  analysisId: string            // UUID
  userEmail: string
  type: 'skin' | 'hair' | 'body' | 'similar'
  fileUrl: string               // Vercel Blob URL
  aiResult: {
    summary: string
    optimizedPrompt?: string
    insights?: string[]
  }
  createdAt: ISO8601
  updatedAt: ISO8601
}
```

### MongoDB Collections

| Collection | Purpose | Documents | Indexes |
|-----------|---------|-----------|---------|
| **users** (NextAuth auto) | User accounts | `{ email, image, emailVerified, createdAt }` | email (unique) |
| **user_profiles** | User profile + credits + role | `{ email, name, phone, credits, role, wishlist: [], createdAt }` | email (unique), role |
| **chats** | Chat sessions | `{ userEmail, title, messages: [], context, createdAt, updatedAt }` | userEmail, createdAt |
| **products** | Product inventory | Full Product schema | name, category, embedding (vector) |
| **orders** | Purchase orders | Order schema with payment status | userEmail, status, createdAt |
| **reviews** | Product reviews | `{ authorName, productName, orderId, rating, comment, date }` | productName, rating |
| **analyses** | Image analyses | Analysis schema | userEmail, type, createdAt |
| **sessions** (NextAuth auto) | Auth sessions | NextAuth session tokens | sessionToken (unique), expires |
| **accounts** (NextAuth auto) | OAuth accounts | Google OAuth linkage | userId + provider |
| **verification_tokens** (NextAuth auto) | Email verification | Unused (Google OAuth only) | token (unique), identifier |
| **extension_tokens** | One-time tokens | `{ email, token, expiresAt, consumed, createdAt }` | token (unique), expiresAt |
| **tryons** | Virtual try-on results | `{ email, userImage, productImage, result, createdAt }` | email, createdAt |
| **reimagined_products** | Generative variations | `{ email, baseImage, prompt, result, credits, createdAt }` | email, createdAt |
| **credit_ledger** | Credits audit log | `{ email, type, amount, reason, createdAt }` | email, createdAt |
| **whatsapp_sessions** | WhatsApp state | `{ phone, sessionId, metadata, createdAt }` | phone (unique) |
| **submissions** | Contact form | `{ name, email, message, createdAt }` | email, createdAt |

---

## Authentication & Authorization

### Web App (NextAuth + Session Cookies)

**Flow:**
```
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent
3. Google redirects back with code
4. NextAuth handler (lib/auth.ts) exchanges code for tokens
5. MongoDB adapter stores session + user + account
6. Sets secure session cookie: next-auth.session-token
7. Browser includes cookie on every request
8. Routes use authGuard() to verify cookie + extract email
```

**Session Structure (JWT claims):**
```typescript
{
  sub: "unique-user-id",
  email: "user@example.com",
  name: "User Name",
  image: "https://lh3.googleusercontent.com/...",
  iat: 1234567890,
  exp: 1234654290
}
```

**Auth Guard** (`lib/auth-guard.ts`):
```typescript
export async function authGuard() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Unauthorized")
  return session.user.email
}
// Usage in every protected API route:
const userEmail = await authGuard()
```

**Admin Check** (`lib/auth.ts`):
```typescript
export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = await db.collection('user_profiles').findOne({ email: session.user.email })
  if (user.role !== 'admin') throw new Error("Forbidden: Admin access required")
  return user
}
```

Admin role assigned automatically if email in `ADMIN_EMAILS` env var (on first login).

### Extension (Custom JWT in Header)

**Flow:**
```
1. User clicks "Connect Rasphia" in sidebar
2. `GET /api/extension/init?ext=1` returns one-time token (5-min expiry)
3. Opens Google OAuth with callback to /extension/auth?token=...
4. After Google OAuth, token extracted from URL
5. `POST /api/extension/exchange` exchanges token for JWT
6. JWT signed with EXTENSION_JWT_SECRET, 7-day expiry
7. Stored in chrome.storage.local.rasphia_ext_token
8. All extension API calls include header: X-Rasphia-Extension-Token: ${jwt}
9. Backend verifies JWT with jose library
```

**JWT Structure:**
```typescript
{
  sub: "user-email@example.com",
  email: "user-email@example.com",
  iat: 1234567890,
  exp: 1234654290,  // +7 days
  aud: "rasphia-extension",
  iss: "rasphia"
}
```

**Token Verification** (`lib/verifyExtToken.ts`):
```typescript
export async function verifyExtensionToken(token: string) {
  const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET!)
  const verified = await jwtVerify(token, secret)
  return verified.payload.email
}
```

**Important Differences:**
| Aspect | Web App | Extension |
|--------|---------|-----------|
| Token Storage | Secure HttpOnly cookie | chrome.storage.local |
| Token Lifetime | Session (~30 days) | 7 days (manual refresh) |
| Token Location | Request header (automatic) | Custom header `X-Rasphia-Extension-Token` |
| Token Generation | NextAuth + Google | Custom flow (init → exchange) |
| CORS | Standard (same-origin) | Custom (chrome-extension://) |

---

## API Routes Reference

### Authentication Routes

**`POST /api/auth/[...nextauth]/route.ts`**
- Handles all NextAuth flows (callback, signin, signout, session, csrf, error, etc.)
- Google OAuth provider configured
- MongoDB adapter for session persistence
- On first login: Auto-creates `user_profiles` doc with 50 initial credits + "user" role
- On admin email: Sets role to "admin"

### Chat Management (Web)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/chats/create` | POST | NextAuth | Create new chat session |
| `/api/chats/list` | GET | NextAuth | Fetch all chats for user |
| `/api/chats/get` | GET | NextAuth | Fetch chat + messages by ID |
| `/api/chats/delete` | POST | NextAuth | Delete chat (ownership check) |
| `/api/chats/rename` | POST | NextAuth | Rename chat title |
| `/api/chats/add-message` | POST | NextAuth | Send user message + get AI response |
| `/api/chats/search` | GET | NextAuth | Search chats by text query |
| `/api/chats/update-title` | POST | NextAuth | Update chat title (alternative) |

**`POST /api/chats/add-message` Flow:**
```typescript
1. User sends message: { chatId, text, productContext? }
2. Append user message to chat.messages[]
3. Load user persona for context
4. Call OpenAI with system prompt + persona + chat history
5. OpenAI returns: { text, products?, comparisonTable? }
6. Append AI message to chat.messages[]
7. Generate embeddings for response
8. Update chat.updatedAt
9. Return updated messages
```

### Product Curation (Web)

**`POST /api/curate-openai/route.ts`**
- User question → OpenAI + vector search
- Loads products matching embeddings
- Scores products against user persona
- Returns curated list + comparison table if requested

**`POST /api/curate-agent/route.ts`**
- Agent-based curation (alternative to direct OpenAI)

**`POST /api/curate/route.ts`**
- Gemini endpoint (deprecated in favor of OpenAI)

### User Profile Management

**`GET /api/user/get-profile`**
- Query: `email=user@example.com`
- Returns: UserProfile from `user_profiles` collection
- Must match session.user.email (ownership check)

**`POST /api/user/update-profile`**
- Body: `{ name, phone, address, wishlist }`
- Updates `user_profiles` document
- Validates ownership

### Persona Management

**`GET /api/persona/get`**
- Query: `email=user@example.com`
- Returns: User persona merged with defaults
- Used by both web app + extension

**`POST /api/persona/update`**
- Body: `{ skin?, hair?, body?, style?, taste?, lifestyle? }`
- Updates user.persona in `users` collection
- Merges with existing (doesn't overwrite)

**`POST /api/persona/analyze-image`**
- Body: `{ image (base64), type: 'skin'|'hair'|'body' }`
- Calls Gemini to analyze image
- Updates persona based on analysis
- Stores analysis in `analyses` collection
- Returns: AI insights + updated persona

### Persona Image Analysis Details

```typescript
// For type: 'skin'
// Calls Gemini with prompt like:
// "Analyze this skin photo and identify: skin type, concerns, fitzpatrick, etc."
// Updates: persona.skin with findings

// For type: 'hair'
// Similar prompt for hair characteristics
// Updates: persona.hair

// For type: 'body'
// Analyzes body type, proportions, frame
// Updates: persona.body

// For type: 'similar' (extension)
// Finds products similar to image
// Returns: products with similarity scores
```

### Products

**`GET /api/products/get`**
- Returns all products from `products` collection
- Includes embeddings (optional)

**`GET /api/products/getByName`**
- Query: `name=Nike`
- Returns matching products (fuzzy search)

**`POST /api/products/add` (Admin)**
- Body: Full Product schema
- Calls `requireAdmin()` check
- Generates embeddings automatically
- Stores in `products` collection

**`POST /api/products/update` (Admin)**
- Updates product by ID
- Regenerates embeddings if attributes change

**`POST /api/products/delete` (Admin)**
- Soft deletes product

### Orders & Payments

**`POST /api/create-order`**
- Body: `{ products: Product[], customer: CheckoutCustomer }`
- Creates MongoDB order doc with status: "Processing"
- Calls Razorpay API to generate order ID
- Returns: `{ orderId, razorpayOrderId }`
- Customer added to order for shipping

**`POST /api/verify-payment`**
- Body: `{ paymentId, razorpayOrderId, razorpaySignature }`
- Verifies Razorpay signature
- Updates order.status to "Paid"
- Calls WhatsApp to send confirmation
- Returns: Order details

**`POST /api/create-payment-link`**
- Alternative: Creates Razorpay payment link (instead of order)

**`POST /api/razorpay-webhook`**
- Webhook from Razorpay (triggered by payment events)
- Event: `payment_link.paid`
- Updates order status
- Sends WhatsApp notification with tracking link
- Signature verified with `RAZORPAY_WEBHOOK_SECRET`

**`GET /api/orders`**
- Query: `email=user@example.com`
- Returns all user orders
- Includes products, status, tracking

### Reviews

**`POST /api/reviews/add`**
- Body: `{ authorName, productName, orderId, rating, comment }`
- Adds review to product.reviews[] array
- Also stores in `reviews` collection for analytics

### Image Upload

**`POST /api/upload`**
- Body: FormData with file
- Uploads to Vercel Blob
- Returns: `{ url: "https://..." }`
- Used for persona photos, analysis images, try-on results

### Contact

**`POST /api/contact`**
- Body: `{ name, email, message }`
- Stores in `submissions` collection
- Used for contact form

### WhatsApp Integration

**`POST /api/whatsapp/route.ts`**
- Webhook from WhatsApp Cloud API
- Processes incoming messages from users
- Routes to chatbot logic

**`POST /api/whatsapp/send-otp`**
- Body: `{ phone, email }`
- Generates 6-digit OTP
- Sends via WhatsApp
- Stores in `otp_store` (global memory)

**`POST /api/whatsapp/verify-otp`**
- Body: `{ phone, otp }`
- Verifies OTP matches stored value
- Creates/updates user if first-time

**`POST /api/whatsapp-session`**
- Stores WhatsApp session data (phone, sessionId, metadata)
- Used to maintain conversation context

---

## Extension API Routes (`/api/extension/*`)

**Note**: All extension routes:
1. Verify JWT header: `X-Rasphia-Extension-Token`
2. Include CORS headers via `withExtensionCors()` wrapper
3. Extract email from JWT claims
4. Use same email-based ownership checks as web app

### Extension Authentication

**`POST /api/extension/init`**
- Query: `ext=1` (extension identifier)
- Returns one-time token (5-min expiry) + login URL
- Stored in `extension_tokens` collection

**`POST /api/extension/exchange`**
- Body: `{ oneTimeToken: "..." }`
- Validates token not consumed + not expired
- Signs JWT with EXTENSION_JWT_SECRET
- Marks token as consumed
- Returns: `{ access_token: "jwt...", expires_in: 604800 }`

### Extension Chat (Parallel to Web)

**`POST /api/extension/chats/create`**
- Creates chat for extension user (same as web)

**`GET /api/extension/chats/list`**
- Lists all chats for extension user

**`GET /api/extension/chats/get`**
- Fetches single chat with messages

**`POST /api/extension/chats/delete`**

**`POST /api/extension/chats/rename`**

**`POST /api/extension/chats/add-message`**
- Body: `{ chatId, text, productContext? }`
- Uses Gemini (not OpenAI) for extension responses
- Can attach product context: `{ name, image, description }`
- Returns: AI message + formatted response

**`GET /api/extension/chats/search`**

**`POST /api/extension/chats/summarize`**
- Body: `{ productName, productImage?, analysis? }`
- AI generates summary of product

**`POST /api/extension/chats/best-pick`**
- Body: `{ userImage?, products: Product[] }`
- AI selects best matching product with reasoning
- Returns schema: `{ bestProduct, verdict: 'buy'|'wait'|'skip', confidence, oneLineReason }`

**`POST /api/extension/chats/product-context`**
- Body: `{ chatId, products: Product[] }`
- Attaches products as context to chat (for conversation)

### Extension Credits System

**`GET /api/extension/credits/get`**
- Query: `email=...`
- Returns: `{ credits: number }`

**`POST /api/extension/credits/spend`**
- Body: `{ amount: number, reason: string }`
- Deducts credits from user_profiles.credits
- Logs to `credit_ledger` collection
- Returns error if insufficient balance

**Credit Pricing:**
- Free operations: Chat, best-pick, product analysis
- 5 credits: Detailed product insights (₹0.05)
- 10 credits: Product reimagination (₹0.10)
- 20 credits: Virtual try-on (₹0.20)

### Extension Virtual Try-On

**`POST /api/extension/tryon-gemini`**
- Body: `{ userImage (base64), productImageUrl, productName }`
- Calls Gemini 2.0 Flash to generate photorealistic try-on
- Spends 20 credits
- Stores result in `tryons` collection
- Returns: `{ tryon: imageUrl, confidence }`

**`GET /api/extension/tryon-gemini/list`**
- Returns past try-ons for user

**`POST /api/extension/tryon`**
- Alternative try-on endpoint

### Extension Persona

**`GET /api/extension/persona/get`**
- Query: `email=...`
- Returns persona with preview (extension-friendly format)
- Persona gate check: Must have ≥3 sections completed

### Extension Generative Features

**`POST /api/extension/reimagine`**
- Body: `{ productImage (base64), prompt: string }`
- Calls Gemini to generate variations of product
- Costs 10 credits
- Returns: `{ reimagined: imageUrl, description }`

**`GET /api/extension/reimagine/list`**
- Lists past reimaginations

**`GET /api/extension/insights/list`**
- Lists product insights (cached AI analyses)

### Extension Orders

**`POST /api/extension/create-order`**
- Same as web app but called from extension

---

## State Management & Data Flow

### Web App State Flow

```
Main App (/app/page.tsx)
├─ Chat State
│  ├─ chats: ChatSession[] (from DB)
│  ├─ selectedChat: ChatSession | null (user selects)
│  ├─ messages: Message[] (from selectedChat.messages)
│  └─ isLoadingResponse: boolean (while awaiting AI)
│
├─ Persona State
│  ├─ persona: Persona (from /api/persona/get)
│  ├─ showPersonaModal: boolean
│  └─ personaSections: string[] (tracks completed sections)
│
├─ Cart State
│  ├─ cartItems: Product[]
│  ├─ showCart: boolean
│  └─ showCheckout: boolean (controls CheckoutPage modal)
│
├─ Analysis State
│  ├─ analyses: Analysis[]
│  ├─ selectedAnalysis: Analysis | null
│  └─ showAnalysisModal: boolean
│
└─ UI State
   ├─ session: Session | null (NextAuth)
   ├─ showProfile: boolean
   ├─ showReviewModal: boolean
   └─ sidebarOpen: boolean
```

### Chat Message Flow

```
User types message + clicks Send
    ↓
setIsLoadingResponse(true)
setMessages([...messages, { author: 'user', text: userInput }])
    ↓
POST /api/chats/add-message
  {
    chatId: selectedChat._id,
    userEmail: session.user.email,
    message: userInput
  }
    ↓
Backend:
  1. Load persona
  2. Call OpenAI with [system prompt, persona, chat history, new message]
  3. Parse response (may include products, comparison table)
  4. Append to chat.messages[]
  5. Generate embeddings
  6. Return messages
    ↓
setMessages(response.messages)
setIsLoadingResponse(false)
    ↓
ChatWindow auto-scrolls to bottom
```

### Persona Update Flow

```
User clicks "Edit Persona" → PersonaModal opens
    ↓
User completes Skin Flow (selects type, concerns, uploads photo)
    ↓
Backend: /api/persona/analyze-image
  1. Call Gemini with image + analysis prompt
  2. Parse AI findings
  3. Update persona.skin in user doc
  4. Store analysis in analyses collection
  5. Return updated persona
    ↓
Frontend: setPersona(updatedPersona)
    ↓
Persona sections update, UI reflects completion
    ↓
Once 3+ sections complete, persona gate removed in extension
```

### Product Discovery Flow (Extension)

```
User on Amazon product page
    ↓
contentScript.js detects page (heuristic matching)
    ↓
User clicks "Analyze with Rasphia" in sidebar
    ↓
sidebar.js reads product details from page:
  - Name, price, image URL
  - Opens file picker for user's photo
    ↓
background.js calls POST /api/extension/chats/add-message
  {
    message: "Analyze if this ${productName} is good for me",
    productContext: { name, image, description }
  }
    ↓
Backend:
  1. Load user persona
  2. Call Gemini with product details + persona
  3. Generate verdict: "buy" | "wait" | "skip"
  4. Return analysis
    ↓
sidebar.js displays verdict + reasoning
    ↓
User can click "Try On" (5-second camera capture) or "Add to Cart"
```

---

## Persona System: The Core Innovation

### Why Personas?

Traditional product recommendation engines use:
- Browsing history
- Purchase history
- Collaborative filtering

Rasphia uses **detailed user personas** to understand **intrinsic preferences**:
- Skin type affects skincare matches
- Hair type affects haircare matches
- Style archetype affects fashion matches
- Lifestyle affects product practicality

This enables recommendations that are **fundamentally better** because they're based on **who the user is**, not just **what they clicked**.

### Persona Structure (Nested in users Collection)

```typescript
users:
  email: "user@example.com"
  persona: {
    skin: { skinType, concerns, fitzpatrick, climate, allergies }
    hair: { hairType, density, scalpType, goals, lifestyle }
    body: { height, frame, proportions, bodyType, activities, goals }
    style: { archetypes, colorPalette, boldness, occasions }
    taste: { giftingStyle, decorPreferences, scentPreferences, priceComfort }
    lifestyle: { workSetup, diet, fitness, travelFrequency, climate }
  }
```

### Persona Completion Flow

**Onboarding** (`/app/persona/create/page.tsx` or modal):
1. User signs in
2. Presented with 6 flows: Skin, Hair, Body, Style, Taste, Lifestyle
3. Each flow:
   - Multiple-choice questions (e.g. "What's your skin type?")
   - Optional photo capture (AI analyzes if uploaded)
   - Saves to persona.section
4. After 3+ sections: **Persona Gate Unlocked**

**AI-Enhanced** (`/api/persona/analyze-image`):
- User uploads photo for any section
- Gemini analyzes image + generates findings
- Automatically updates persona section
- Examples:
  - Photo of face → detects skin type, fitzpatrick, concerns
  - Photo of hair → identifies hair type, density, condition
  - Photo of body → estimates body type, proportions

**Persona as System Prompt**:
```
When recommending products, ALWAYS consider:
${JSON.stringify(persona, null, 2)}

For skincare: Prioritize products matching skin type + concerns
For fashion: Suggest styles matching archetype + colorPalette
For home: Recommend aesthetic matching lifestyle + budget
For gifting: Match occasion + recipient + taste preferences
```

### Persona Alignment Scoring

Products include `personaAlignment` object:
```typescript
{
  skinScore: 85,      // % match to user's skin needs
  hairScore: 90,
  styleScore: 75,
  homeScore: 60,
  fragranceScore: 80,
  lifestyleScore: 88,
  giftingScore: 70
}
```

When curating, AI:
1. Loads user persona
2. Queries products matching category + attributes
3. **Weighs products by alignment scores**
4. Returns top matches sorted by persona fit

### Persona Evolution

Persona is **never locked**:
- User can update anytime via modal
- New analyses update persona automatically
- Persona preferences inform all future recommendations
- Over time, system gets more personalized as more data collected

---

## AI Integration Patterns

### OpenAI (Web App Curation)

**When Used:**
- `/api/chats/add-message` (main web chat)
- `/api/curate-openai` (product curation endpoint)

**Model:** `gpt-4` (or configurable)

**System Prompt:**
```
You are Rasphia, an AI shopping concierge.
Your role is to recommend products that match the user's needs perfectly.

User Persona:
${JSON.stringify(userPersona)}

Available Products Database:
${JSON.stringify(topProducts, null, 2)}

When responding:
1. Answer the user's question naturally
2. Recommend products from the database that match their persona
3. Explain why each product matches their needs
4. If user asks for comparison, provide a comparison table
5. Be conversational and friendly
```

**Response Parsing:**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'system', content: systemPrompt }, ...chatHistory],
  functions: [{
    name: 'curate_products',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'AI response text' },
        products: { type: 'array', items: { type: 'string' } },
        comparisonTable: { type: 'object' }
      }
    }
  }]
})

// Extract products + comparison from response
```

### Google Gemini (Image Analysis + Extension)

**When Used:**
- `/api/persona/analyze-image` (analyze user photos)
- `/api/extension/chats/add-message` (extension chat)
- `/api/extension/tryon-gemini` (virtual try-on generation)
- `/api/extension/reimagine` (product reimagination)

**Model:** `gemini-2.0-flash`

**Image Analysis Prompt** (for Skin):
```
Analyze this skin photo and identify:
1. Skin type (oily, dry, combination, sensitive)
2. Visible concerns (acne, pigmentation, aging, dullness)
3. Fitzpatrick scale (1-6)
4. Estimated skin sensitivity (low, medium, high)
5. Recommended skincare actives (salicylic acid, niacinamide, etc.)

Respond in JSON format:
{
  "skinType": "...",
  "concerns": ["...", "..."],
  "fitzpatrick": 3,
  "sensitivity": "...",
  "recommendedActives": ["...", "..."]
}
```

**Try-On Prompt** (with Gemini 2.0 Flash):
```
Generate a photorealistic image of a person wearing ${productName}.
- Use the user's facial features from the provided image
- Show the product on the user's body
- Realistic lighting and shadow
- High quality output
- Product must be clearly visible

Input images:
1. User photo: ${userImage}
2. Product image: ${productImage}
```

**Gemini Response Parsing:**
- Uses vision capability to process images
- Returns structured JSON or generated images
- Gemini 2.0 can generate images directly

### Embedding Pipeline

**When Used:**
- `/api/curate-openai` (semantic product search)
- Product ingestion (`/api/products/add`)

**Model:** `text-embedding-3-small` (OpenAI)

**Process:**
```typescript
1. New product added
2. Generate embedding from product description + attributes:
   description = `${name} by ${brand}. ${description}. Categories: ${attributes.skinType}, ${attributes.concerns}`
3. Call OpenAI: embedding = await openai.embeddings.create({
     model: 'text-embedding-3-small',
     input: description
   })
4. Store embedding in product.embedding (1536-dim vector)

When user queries:
1. Convert user query to embedding
2. Query MongoDB vector search: db.products.find({
     embedding: { $near: { $geometry: { type: "Point", coordinates: [userQueryEmbedding] } } }
   })
3. Return top-K products by vector distance
4. Rank by persona alignment scores
```

---

## External Integrations

### Razorpay (Payment Processing)

**Integration Point:** `/api/create-order`, `/api/verify-payment`, `/api/razorpay-webhook`

**Flow:**
```
1. User in CheckoutPage clicks "Pay"
   ↓
2. POST /api/create-order
   {
     products: [...],
     customer: { name, email, phone, address },
     totalAmount: number
   }
   ↓
3. Backend:
   - Create Order doc in MongoDB (status: "Processing")
   - Call Razorpay: razorpay.orders.create({ amount, currency: 'INR' })
   - Return: { orderId, razorpayOrderId }
   ↓
4. Frontend opens Razorpay checkout modal with razorpayOrderId
   ↓
5. User selects payment method (Card, UPI, Wallet)
   ↓
6. Razorpay processes + returns paymentId
   ↓
7. Frontend: POST /api/verify-payment
   {
     paymentId,
     razorpayOrderId,
     razorpaySignature (signed by Razorpay)
   }
   ↓
8. Backend:
   - Verify signature: createHmac('sha256', RAZORPAY_KEY_SECRET)
   - Signature valid → Update order.status = "Paid"
   - Call WhatsApp: "Your order is confirmed!"
   - Return order details
   ↓
9. Also: Razorpay sends webhook to /api/razorpay-webhook
   - On payment_link.paid event
   - Updates order status (redundancy check)
```

**Key Constants:**
- Amount in paise: `totalAmount * 100`
- Currency: "INR"
- Signature algorithm: HMAC-SHA256

### WhatsApp Cloud API (Messaging)

**Integration Point:** `/api/razorpay-webhook`, `/api/whatsapp/send-otp`, `/api/whatsapp/route.ts`

**Flow:**
```
Backend sends message to customer:
lib/whatsapp.ts sendWhatsAppMessage(phone, message)
  ↓
curl -X POST https://graph.instagram.com/v18.0/{PHONE_NUMBER_ID}/messages
  {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: message }
  }
  Header: Authorization: Bearer ${WHATSAPP_TOKEN}
  ↓
WhatsApp Cloud API sends message to user's phone
```

**Message Types:**
- Text messages (order confirmations)
- OTP delivery
- Product recommendation buttons (with links)
- File attachments (images, documents)

**Webhook (Incoming Messages):**
```
WhatsApp → /api/whatsapp (POST)
  {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: phone,
            text: { body: message }
          }]
        }
      }]
    }]
  }
  ↓
Backend parses message + routes to chatbot logic
```

### Vercel Blob (Image Storage)

**Integration Point:** `/api/upload`

**Flow:**
```
User uploads image (persona photo, analysis):
FormData { file: File }
  ↓
POST /api/upload
  ↓
Backend:
const blob = await put(file.name, file, {
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN
})
  ↓
Returns: { url: blob.url }  // e.g. https://xxxx.blob.vercel-storage.com/file-xxxxx
  ↓
URL stored in persona.skin.photoUrls, analysis.fileUrl, etc.
  ↓
URL accessible publicly (CDN cached)
```

**Benefits:**
- No database bloat (files not stored in MongoDB)
- Fast CDN delivery
- Automatic expiry (configurable)
- GDPR-friendly (separate storage)

### Google OAuth (Authentication)

**Integration Point:** `/api/auth/[...nextauth]/route.ts`

**Flow:**
```
User clicks "Sign in with Google"
  ↓
Redirects to: https://accounts.google.com/o/oauth2/v2/auth?
  client_id=${GOOGLE_CLIENT_ID}&
  redirect_uri=${NEXTAUTH_URL}/api/auth/callback/google&
  scope=openid%20email%20profile
  ↓
User consents + Google redirects back with code
  ↓
NextAuth handler exchanges code for tokens
  ↓
MongoDB adapter stores user + account + session
  ↓
Sets session cookie
```

**Session Data:**
```javascript
{
  user: {
    id: 'google_id',
    email: 'user@gmail.com',
    name: 'User Name',
    image: 'https://lh3.googleusercontent.com/...'
  },
  expires: ISO8601 (30 days from now)
}
```

---

## Common Patterns & Anti-Patterns

### ✅ Recommended Patterns

**1. Email-Based Ownership Check**
```typescript
const userEmail = await authGuard()
const resource = await db.collection('chats').findOne({ _id, userEmail })
if (!resource) throw new Error("Forbidden: Resource not owned by user")
```
Every route validates ownership before returning data.

**2. Persona-First Curation**
```typescript
const persona = await db.collection('users').findOne({ email: userEmail })
const systemPrompt = `
  Consider this user persona:
  ${JSON.stringify(persona, null, 2)}
`
// AI uses persona to filter/rank products
```

**3. Async/Await for Sequential AI Calls**
```typescript
const persona = await loadPersona(email)
const products = await queryEmbeddings(query, persona)
const response = await callOpenAI(systemPrompt, products)
const embeddings = await generateEmbeddings(response)
```

**4. MongoDB Transactions for Multi-Step Operations**
```typescript
const session = client.startSession()
try {
  await session.withTransaction(async () => {
    await orders.insertOne(orderDoc, { session })
    await users.updateOne({ email }, { $inc: { credits: -cost } }, { session })
    await ledger.insertOne(ledgerEntry, { session })
  })
} finally {
  await session.endSession()
}
```

### ❌ Anti-Patterns (Current Codebase)

**1. Ignored Build Errors**
```javascript
// next.config.js
typescript: { ignoreBuildErrors: true }  // 🚨 FIX THIS!
```
This hides real bugs. Re-enable and fix issues instead.

**2. Global State in /app/page.tsx**
The main page component is 1000+ lines managing 10+ pieces of state. Should split into:
- `ChatProvider` (chat state)
- `CartProvider` (cart state)
- `PersonaProvider` (persona state)
- `AnalysisProvider` (analysis state)

**3. Hardcoded LLM Model Names**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4'  // Hard to change across codebase
})
```
Should define models in env vars + config file.

**4. No Type Safety for MongoDB Queries**
```typescript
db.collection('chats').findOne({ _id })  // Returns `any`
```
Should use Mongoose schema definitions or TypeScript interfaces for MongoDB operations.

**5. Persona Validation Missing**
```typescript
const persona = await db.collection('users').findOne({ email })
// No check if persona is complete for extension use
// Should have: persona.skin?.skinType && persona.hair?.hairType && persona.body?.bodyType
```

**6. No Rate Limiting on AI Endpoints**
Users can spam `/api/chats/add-message` to generate unlimited responses. Should add:
- Per-user rate limit (e.g., 10 req/min)
- Credit-based throttling
- CAPTCHA for suspicious activity

---

## Testing & Quality

### Current State
- **No test files found** in repository
- ESLint disabled in build
- TypeScript errors ignored

### Recommended Test Coverage

**Unit Tests** (Jest):
```typescript
// lib/generateEmbeddings.test.ts
describe('generateEmbeddings', () => {
  it('returns 1536-dim vector for valid text', async () => {
    const embedding = await generateEmbeddings('Nike shoes')
    expect(embedding).toHaveLength(1536)
  })

  it('throws on empty input', async () => {
    await expect(generateEmbeddings('')).rejects.toThrow()
  })
})

// lib/queryEmbeddings.test.ts
describe('queryEmbeddings', () => {
  it('returns products sorted by vector distance', async () => {
    const results = await queryEmbeddings(userEmbedding, 10)
    expect(results).toHaveLength(10)
    expect(results[0].distance).toBeLessThanOrEqual(results[1].distance)
  })
})

// types.ts (validation)
describe('Persona validation', () => {
  it('rejects invalid fitzpatrick scale', () => {
    const persona = { skin: { fitzpatrick: 10 } }
    expect(() => validatePersona(persona)).toThrow('Fitzpatrick 1-6')
  })
})
```

**Integration Tests** (E2E):
```typescript
// tests/chat.integration.ts
describe('Chat Curation Flow', () => {
  it('should return products matching user persona', async () => {
    const session = await signInWithGoogle()
    const persona = await updatePersona({ skin: { skinType: 'oily' } })
    const response = await sendChatMessage('Best face wash for oily skin')

    expect(response.products).toBeTruthy()
    expect(response.products[0].attributes.skinType).toContain('oily')
  })
})

// tests/extension.integration.ts
describe('Extension Try-On', () => {
  it('should generate try-on with sufficient credits', async () => {
    const token = await exchangeExtensionToken()
    const credits = await getCredits(token)  // 50
    const tryon = await generateTryOn(token, { userImage, productImage })

    expect(tryon.imageUrl).toBeTruthy()
    const newCredits = await getCredits(token)
    expect(newCredits).toBe(credits - 20)
  })

  it('should fail if credits insufficient', async () => {
    const token = await exchangeExtensionToken()
    await spendAllCredits(token)  // Spend 50 credits

    await expect(generateTryOn(token, {...})).rejects.toThrow('Insufficient credits')
  })
})
```

**Security Tests:**
```typescript
// tests/auth.security.ts
describe('Authorization', () => {
  it('should prevent user A from accessing user B chat', async () => {
    const userA = await signIn('a@example.com')
    const userB = await signIn('b@example.com')
    const chatB = await createChat(userB)

    const response = await getChat(userA, chatB.id)
    expect(response.status).toBe(403)
  })

  it('should reject forged extension JWT', async () => {
    const fakeToken = jwt.sign({ email: 'fake@example.com' }, 'wrong-secret')

    const response = await callExtensionAPI(fakeToken, ...)
    expect(response.status).toBe(401)
  })
})
```

---

## Performance Considerations

### Database Optimization

**Current Bottlenecks:**
1. **No indexes on chats collection**
   - Queries like `db.chats.find({ userEmail, createdAt })` are slow
   - Add index: `db.chats.createIndex({ userEmail: 1, createdAt: -1 })`

2. **Large chat.messages array**
   - Loading entire chat with 500+ messages is slow
   - Solution: Pagination query with `messages: { $slice: [0, 50] }`

3. **No vector search index on products.embedding**
   - Semantic search (vector distance) without index is O(n)
   - Add MongoDB vector search index (Atlas-only feature)

**Recommendations:**
```javascript
// Create these indexes
db.chats.createIndex({ userEmail: 1, createdAt: -1 })
db.products.createIndex({ category: 1, 'attributes.skinType': 1 })
db.products.createIndex({ embedding: '2dsphere' })  // Vector search
db.orders.createIndex({ userEmail: 1, createdAt: -1 })
db.user_profiles.createIndex({ email: 1 })  // Already unique
db.analyses.createIndex({ userEmail: 1, createdAt: -1 })
```

### API Response Time Optimization

**Current Slow Paths:**
1. `/api/chats/add-message` (3-5 sec)
   - Loads persona (100ms)
   - Queries embeddings (500ms)
   - Calls OpenAI (2000ms)
   - Generates response embeddings (200ms)
   - **Total: ~2.8 sec** ✓ Acceptable

2. `/api/persona/analyze-image` (2-3 sec)
   - Upload to Vercel Blob (500ms)
   - Call Gemini Vision (1500ms)
   - Parse response + update DB (200ms)
   - **Total: ~2.2 sec** ✓ Acceptable

3. `/api/extension/tryon-gemini` (5-8 sec)
   - Encode user image (100ms)
   - Call Gemini 2.0 (4000ms)
   - Return result (100ms)
   - **Total: ~4.2 sec** ⚠️ Consider async generation + email link

### Frontend Performance

**Current Issues:**
1. **Large component**: `/app/page.tsx` (1000+ lines)
   - Should split into smaller components with memoization
   - Use `React.memo()` to prevent unnecessary re-renders

2. **No pagination on chats**
   - Loading all 100+ chats on page load
   - Add pagination: Load 20, then fetch more on scroll

3. **Image processing on client**
   - Face blur using canvas is expensive
   - Should use worker thread for image processing

**Recommendations:**
```typescript
// Memoize expensive components
const ChatMessage = React.memo(({ message }) => (...), (prev, next) =>
  prev.message.text === next.message.text &&
  prev.message.createdAt === next.message.createdAt
)

// Virtualize long lists
import { FixedSizeList } from 'react-window'
<FixedSizeList
  height={600}
  itemCount={chats.length}
  itemSize={60}
>
  {({ index, style }) => <ChatItem style={style} chat={chats[index]} />}
</FixedSizeList>

// Lazy load analyses
const [analyses, setAnalyses] = useState<Analysis[]>([])
const [page, setPage] = useState(0)
useEffect(() => {
  fetchAnalyses(page * 20, 20).then(newAnalyses =>
    setAnalyses(prev => [...prev, ...newAnalyses])
  )
}, [page])
```

### Network Optimization

**Current Issues:**
1. No gzip compression on API responses
   - Next.js gzip automatically, but check `next.config.js`

2. Large JSON payloads
   - Product objects with full embedding (1536 floats = 6KB each)
   - Exclude embeddings in API responses unless needed

**Recommendations:**
```typescript
// Filter embedding field from response
const products = await db.products.find({...}).project({ embedding: 0 })

// Compress large arrays
const compressedChats = chats.map(chat => ({
  ...chat,
  messages: chat.messages.slice(-50)  // Keep last 50 messages
}))
```

---

## Key Files by Purpose

| Purpose | Primary Files | Key Functions |
|---------|--------------|----------------|
| **Chat** | `/app/page.tsx`, `/api/chats/*` | Message handling, AI response |
| **Persona** | `/app/utils/defaultPersona.ts`, `/api/persona/*`, `persona/*/Flow.tsx` | Persona mgmt, image analysis |
| **Products** | `/app/lib/generateEmbeddings.ts`, `/app/lib/queryEmbeddings.ts`, `/api/products/*` | Semantic search, vector ops |
| **Checkout** | `/app/components/CheckoutPage.tsx`, `/api/create-order`, `/api/verify-payment` | Order creation, payment |
| **WhatsApp** | `/app/lib/whatsapp.ts`, `/api/whatsapp/*`, `/api/razorpay-webhook` | Message sending, webhook handling |
| **Extension** | `rasphia-extension/`, `/api/extension/*` | Browser integration, try-on |
| **Analysis** | `/app/components/analysis/*`, `/api/persona/analyze-image` | Image processing, AI insights |
| **Auth** | `/app/lib/auth.ts`, `/middleware.ts`, `/api/auth/*` | NextAuth, JWT, session mgmt |
| **Database** | `/app/lib/mongodb.ts` | MongoDB connection singleton |
| **Types** | `/app/types.ts` | All TypeScript interfaces |

---

## Summary

Rasphia is a **sophisticated AI shopping platform** combining:
- **Persona-driven personalization** (deep user profiling)
- **Semantic search** (embeddings + vector matching)
- **AI curation** (OpenAI + Gemini)
- **Dual interfaces** (web + Chrome extension)
- **E-commerce integration** (Razorpay + WhatsApp)

The architecture is fundamentally sound but needs:
1. **Immediate**: Re-enable TypeScript errors, add tests, split main component
2. **Short-term**: Add database indexes, pagination, rate limiting
3. **Long-term**: Extract state into providers, add monitoring, optimize images

The extension provides **in-page product analysis** without requiring users to navigate to a separate website—a key differentiator.
