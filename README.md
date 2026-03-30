# Quill — Real-Time Collaborative Document Editor

A full-stack collaborative document editor built with React, Node.js, Socket.io, and MongoDB.

---

## 🚀 Features

- **JWT Authentication** — Signup/Login with bcrypt password hashing
- **Document Management** — Create, rename, delete documents
- **Real-time Collaboration** — Multiple users editing simultaneously via Socket.io
- **Live User Presence** — See who's online in the editor
- **Auto-save** — Documents auto-save every 5 seconds
- **Document Sharing** — Share with Viewer or Editor roles via email
- **Version History** — Save snapshots and restore any previous version
- **Word/Character Count** — Live stats in the status bar

---

## 📂 Project Structure

```
collab-editor/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Document.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── documents.js
│   ├── middleware/
│   │   └── auth.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ShareModal.jsx
    │   │   └── VersionHistoryModal.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── hooks/
    │   │   └── useSocket.js
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   └── EditorPage.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

---

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/collab-editor
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev    # development (nodemon)
npm start      # production
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:5173**

The Vite dev server proxies `/api` and `/socket.io` requests to the backend at port 5000.

---

## 🔄 How It Works

### Authentication Flow
1. User signs up/logs in → JWT token stored in localStorage
2. Axios automatically sends token in `Authorization: Bearer <token>` header
3. Socket.io connects with token in `auth` handshake

### Real-time Editing Flow
1. User opens a document → joins Socket.io room
2. Every keystroke emits `document-change` to the room
3. Other clients receive and apply changes instantly
4. Auto-save triggers every 5 seconds via `auto-save` socket event
5. Server saves to MongoDB and confirms with `save-confirmed`

### Document Sharing
- Owner can invite collaborators by email with Viewer or Editor roles
- Viewers can read but not edit
- Editors can edit, save versions, and restore history

---

## 📡 API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Get current user |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get document |
| PUT | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/documents/:id/share` | Share document |
| DELETE | `/api/documents/:id/collaborators/:userId` | Remove collaborator |
| POST | `/api/documents/:id/versions` | Save version |
| POST | `/api/documents/:id/versions/:idx/restore` | Restore version |

### Socket Events

**Client → Server**
| Event | Payload | Description |
|-------|---------|-------------|
| `join-document` | `{ documentId }` | Join a document room |
| `document-change` | `{ documentId, content }` | Broadcast content change |
| `title-change` | `{ documentId, title }` | Broadcast title change |
| `cursor-move` | `{ documentId, cursor }` | Share cursor position |
| `auto-save` | `{ documentId, content, title }` | Trigger save |
| `save-version` | `{ documentId, label }` | Save version snapshot |
| `leave-document` | `{ documentId }` | Leave room |

**Server → Client**
| Event | Payload | Description |
|-------|---------|-------------|
| `document-loaded` | `{ content, title }` | Initial document data |
| `document-updated` | `{ content, userId }` | Remote content change |
| `title-updated` | `{ title, userId }` | Remote title change |
| `active-users` | `[{ name, color }]` | Current room users |
| `user-left` | `{ userId, name }` | User disconnected |
| `save-confirmed` | `{ savedAt }` | Save successful |
| `cursor-updated` | `{ userId, name, color, cursor }` | Remote cursor moved |

---

## 🚀 Production Deployment

### Backend (e.g., Railway, Render, Fly.io)
1. Set environment variables in your hosting platform
2. `npm start`

### Frontend (e.g., Vercel, Netlify)
1. Build: `npm run build`
2. Set `VITE_API_URL` if backend is on a different domain
3. Update `vite.config.js` proxy or configure CORS on backend

---

## 🔒 Security Notes
- JWT tokens expire in 7 days
- Passwords are hashed with bcrypt (12 salt rounds)
- All document routes are protected by auth middleware
- Only document owners can delete, share, or remove collaborators
- Role-based edit restrictions enforced on both client and server
