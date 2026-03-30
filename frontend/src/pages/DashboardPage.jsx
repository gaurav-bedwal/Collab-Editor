import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ name, color, size = 8 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 shadow-sm`}
      style={{ backgroundColor: color || '#a57f5c' }}
    >
      {initials}
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/documents');
      setDocuments(data.documents);
    } catch {
      showToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const createDocument = async () => {
    setCreating(true);
    try {
      const { data } = await axios.post('/api/documents', { title: 'Untitled Document' });
      navigate(`/document/${data.document._id}`);
    } catch {
      showToast('Failed to create document', 'error');
      setCreating(false);
    }
  };

  const deleteDocument = async (id) => {
    try {
      await axios.delete(`/api/documents/${id}`);
      setDocuments(prev => prev.filter(d => d._id !== id));
      setDeleteId(null);
      showToast('Document deleted');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
      setDeleteId(null);
    }
  };

  const filtered = documents.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const myDocs = filtered.filter(d => d.owner?._id === user?._id);
  const sharedDocs = filtered.filter(d => d.owner?._id !== user?._id);

  return (
    <div className="min-h-screen bg-cream-bg flex flex-col font-sans selection:bg-brown-light selection:text-brown-dark">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-2xl shadow-2xl border animate-slide-down backdrop-blur-md
          ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-brown-light/30 text-charcoal'}`}>
          <div className="flex items-center gap-2 font-semibold">
            {toast.type === 'error' ? '✕' : '✓'}
            {toast.message}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-brown-light/20 sticky top-0 z-40 h-16 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-display text-2xl font-black text-brown-dark tracking-tighter">Quill</span>
            <div className="hidden md:flex items-center gap-6 text-sm font-bold text-charcoal/60">
              <span className="text-charcoal cursor-default">Documents</span>
              <span className="hover:text-charcoal cursor-pointer transition-colors">Shared</span>
              <span className="hover:text-charcoal cursor-pointer transition-colors">Templates</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 pl-2 pr-1 py-1 bg-beige-soft/40 rounded-full border border-brown-light/10">
              <span className="text-charcoal text-xs font-bold hidden sm:block px-2">{user?.name}</span>
              <Avatar name={user?.name} color={user?.color} size={8} />
            </div>
            <button
              onClick={logout}
              className="text-brown-dark/60 hover:text-brown-dark p-2 rounded-lg transition-colors"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12">
          {/* Welcome Section */}
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-brown-dark font-black uppercase tracking-[0.2em] text-xs mb-3">Workspace</p>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-charcoal tracking-tight">
                Hey, {user?.name?.split(' ')[0]} 🖋
              </h1>
            </div>
            
            <div className="flex gap-4">
              <div className="relative flex-1 md:w-64">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search files..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-brown-light/20 rounded-xl text-sm focus:outline-none focus:border-brown-light focus:ring-4 focus:ring-brown-light/5 transition-all font-medium"
                />
              </div>
              
              <button
                onClick={createDocument}
                disabled={creating}
                className="flex items-center gap-2 px-8 py-3.5 bg-brown-dark text-white rounded-xl shadow-[0_10px_25px_rgba(92,64,51,0.2)] hover:shadow-[0_15px_35px_rgba(92,64,51,0.3)] hover:bg-[#4A3525] transform transition-all hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] font-black text-[11px] uppercase tracking-[0.1em] whitespace-nowrap"
              >
                {creating ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>+ New Manuscript</>
                )}
              </button>
          </div>
        </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-56 bg-white/40 rounded-[24px] animate-pulse border border-brown-light/10" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-32 bg-white/30 rounded-[32px] border border-brown-light/10 shadow-sm">
              <p className="text-charcoal text-lg font-bold mb-6 italic">Your library is empty.</p>
              <button
                onClick={createDocument}
                className="px-8 py-4 bg-brown-dark text-white rounded-xl font-black text-[11px] uppercase tracking-[0.1em] shadow-[0_10px_25px_rgba(92,64,51,0.2)] hover:shadow-[0_15px_35px_rgba(92,64,51,0.3)] hover:bg-[#4A3525] transform transition-all hover:scale-105"
              >
                Start your first draft
              </button>
            </div>
          ) : (
            <div className="space-y-16">
              {myDocs.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-black text-brown-dark uppercase tracking-[0.3em] mb-8 ml-1">Personal Docs</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {myDocs.map(doc => (
                      <DocCard key={doc._id} doc={doc} user={user} onOpen={() => navigate(`/document/${doc._id}`)} onDelete={() => setDeleteId(doc._id)} isOwner />
                    ))}
                  </div>
                </section>
              )}
              {sharedDocs.length > 0 && (
                <section>
                  <h2 className="text-[11px] font-black text-brown-dark uppercase tracking-[0.3em] mb-8 ml-1">Collaborations</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {sharedDocs.map(doc => (
                      <DocCard key={doc._id} doc={doc} user={user} onOpen={() => navigate(`/document/${doc._id}`)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>

        {/* Delete confirm modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setDeleteId(null)}>
            <div className="bg-white rounded-[24px] p-8 max-w-sm w-full animate-slide-up shadow-2xl border border-brown-light/20" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-extrabold text-charcoal mb-4">Delete?</h3>
              <p className="text-charcoal/60 mb-8 font-medium">This document will be permanently removed. Proceed?</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 text-brown-dark/60 font-black uppercase tracking-widest text-[10px] hover:bg-beige-soft/50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteDocument(deleteId)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl shadow-[0_10px_20px_rgba(220,38,38,0.2)] font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transform transition-all hover:scale-105 active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

function DocCard({ doc, user, onOpen, onDelete, isOwner }) {
  const collab = doc.collaborators || [];
  const role = !isOwner
    ? collab.find(c => c.user?._id === user?._id)?.role
    : 'owner';

  return (
    <div className="group bg-white rounded-[24px] p-6 shadow-sm border border-brown-light/10 hover:border-brown-light hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full" onClick={onOpen}>
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 bg-beige-soft rounded-2xl">
          <svg className="w-5 h-5 text-brown-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        {isOwner && onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-charcoal/20 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <h3 className="text-xl font-bold text-charcoal mb-4 line-clamp-2 leading-snug">{doc.title || 'Untitled'}</h3>
      
      <div className="mt-auto flex items-center justify-between">
        <div className="flex -space-x-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black border-2 border-white ring-1 ring-brown-light/10"
            style={{ backgroundColor: doc.owner?.color || '#a57f5c' }}
          >
            {doc.owner?.name?.[0]?.toUpperCase()}
          </div>
          {collab.slice(0, 2).map((c) => (
            <div
              key={c.user?._id}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black border-2 border-white ring-1 ring-brown-light/10"
              style={{ backgroundColor: c.user?.color || '#a57f5c' }}
            >
              {c.user?.name?.[0]?.toUpperCase()}
            </div>
          ))}
        </div>
        <div className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest">
          {formatDate(doc.updatedAt)}
        </div>
      </div>
    </div>
  );
}
