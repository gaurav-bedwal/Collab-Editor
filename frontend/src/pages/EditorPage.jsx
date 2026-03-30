import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import VersionHistoryModal from '../components/VersionHistoryModal';

const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

let socket = null;

function Avatar({ name, color, size = 7 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 border-2 border-white ring-1 ring-brown-light/10 shadow-sm`}
      style={{ backgroundColor: color || '#a57f5c' }}
      title={name}
    >
      {initials}
    </div>
  );
}

function formatSaveTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function EditorPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [lastSaved, setLastSaved] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [toast, setToast] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [canEdit, setCanEdit] = useState(false);

  const textareaRef = useRef(null);
  const autoSaveRef = useRef(null);
  const contentRef = useRef('');
  const titleRef = useRef('');
  const isRemoteChange = useRef(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Initialize socket
  useEffect(() => {
    if (!token) return;

    if (!socket || !socket.connected) {
      socket = io('/', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
      });
    }

    socket.on('connect', () => {
      socket.emit('join-document', { documentId: id });
    });

    if (socket.connected) {
      socket.emit('join-document', { documentId: id });
    }

    socket.on('document-loaded', ({ content: c, title: t }) => {
      isRemoteChange.current = true;
      setContent(c);
      setTitle(t);
      contentRef.current = c;
      titleRef.current = t;
      setWordCount(c.trim() ? c.trim().split(/\s+/).length : 0);
      setTimeout(() => { isRemoteChange.current = false; }, 50);
    });

    socket.on('document-updated', ({ content: c, userId }) => {
      if (userId === user?._id?.toString()) return;
      isRemoteChange.current = true;
      setContent(c);
      contentRef.current = c;
      setWordCount(c.trim() ? c.trim().split(/\s+/).length : 0);
      setSaveStatus('unsaved');
      setTimeout(() => { isRemoteChange.current = false; }, 50);
    });

    socket.on('title-updated', ({ title: t, userId }) => {
      if (userId === user?._id?.toString()) return;
      setTitle(t);
      titleRef.current = t;
    });

    socket.on('active-users', (users) => {
      setActiveUsers(users);
    });

    socket.on('user-left', ({ name }) => {
      showToast(`${name} left the document`, 'info');
    });

    socket.on('save-confirmed', ({ savedAt }) => {
      setSaveStatus('saved');
      setLastSaved(savedAt);
    });

    socket.on('save-error', () => {
      setSaveStatus('unsaved');
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setLoading(false);
    });

    return () => {
      socket.emit('leave-document', { documentId: id });
      socket.off('document-loaded');
      socket.off('document-updated');
      socket.off('title-updated');
      socket.off('active-users');
      socket.off('user-left');
      socket.off('save-confirmed');
      socket.off('save-error');
      socket.off('error');
      socket.off('connect');
    };
  }, [id, token, user]);

  // Fetch document metadata
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const { data } = await axios.get(`/api/documents/${id}`);
        setDocument(data.document);
        const editable = data.document.owner?._id?.toString() === user?._id?.toString() ||
          data.document.collaborators?.some(c => c.user?._id?.toString() === user?._id?.toString() && c.role === 'editor');
        setCanEdit(editable);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load document');
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id, user]);

  // Auto-save
  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(() => {
      if (saveStatus === 'unsaved' && socket?.connected) {
        setSaveStatus('saving');
        socket.emit('auto-save', {
          documentId: id,
          content: contentRef.current,
          title: titleRef.current,
        });
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(autoSaveRef.current);
  }, [id, saveStatus]);

  const handleContentChange = useCallback((e) => {
    if (!canEdit) return;
    const newContent = e.target.value;
    setContent(newContent);
    contentRef.current = newContent;
    setWordCount(newContent.trim() ? newContent.trim().split(/\s+/).length : 0);
    setSaveStatus('unsaved');
    if (socket?.connected) {
      socket.emit('document-change', { documentId: id, content: newContent });
    }
  }, [id, canEdit]);

  const handleTitleChange = useCallback((e) => {
    if (!canEdit) return;
    const newTitle = e.target.value;
    setTitle(newTitle);
    titleRef.current = newTitle;
    setSaveStatus('unsaved');
    if (socket?.connected) {
      socket.emit('title-change', { documentId: id, title: newTitle });
    }
  }, [id, canEdit]);

  const handleManualSave = useCallback(() => {
    if (!canEdit || !socket?.connected) return;
    setSaveStatus('saving');
    socket.emit('auto-save', {
      documentId: id,
      content: contentRef.current,
      title: titleRef.current,
    });
  }, [id, canEdit]);

  const handleSaveVersion = useCallback(() => {
    if (!canEdit || !socket?.connected) return;
    const label = `Snapshot — ${new Date().toLocaleString()}`;
    socket.emit('save-version', { documentId: id, label });
    showToast('Version saved to history');
  }, [id, canEdit, showToast]);

  const handleRestoreVersion = useCallback(async (versionIndex) => {
    try {
      const { data } = await axios.post(`/api/documents/${id}/versions/${versionIndex}/restore`);
      const restored = data.document.content;
      isRemoteChange.current = true;
      setContent(restored);
      contentRef.current = restored;
      setWordCount(restored.trim() ? restored.trim().split(/\s+/).length : 0);
      setSaveStatus('saved');
      if (socket?.connected) {
        socket.emit('document-change', { documentId: id, content: restored });
      }
      setTimeout(() => { isRemoteChange.current = false; }, 50);
      setShowVersions(false);
      showToast('Version restored successfully');
    } catch {
      showToast('Failed to restore version', 'error');
    }
  }, [id, showToast]);

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleManualSave]);

  if (loading) return (
    <div className="min-h-screen bg-cream-bg flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brown-light/20 border-t-brown-dark rounded-full animate-spin mx-auto mb-6" />
        <p className="text-brown-dark/40 font-black uppercase tracking-[0.3em] text-[10px]">Loading Manuscript</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-cream-bg flex items-center justify-center font-sans p-6">
      <div className="bg-white rounded-[32px] p-12 shadow-2xl border border-brown-light/10 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">✕</div>
        <h2 className="text-2xl font-black text-charcoal mb-4">Access Denied</h2>
        <p className="text-charcoal/60 mb-8 font-medium leading-relaxed">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="w-full py-4 bg-brown-dark text-white rounded-xl font-bold shadow-lg hover:bg-[#4A3525] transition-all">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  const SaveIndicator = () => {
    if (saveStatus === 'saving') return (
      <span className="flex items-center gap-2 text-brown-dark/60 text-[10px] font-black uppercase tracking-widest">
        <span className="w-3 h-3 border-2 border-brown-light/30 border-t-brown-dark rounded-full animate-spin" />
        Saving
      </span>
    );
    if (saveStatus === 'unsaved') return (
      <span className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Unsaved
      </span>
    );
    return (
      <span className="text-charcoal/30 text-[10px] font-black uppercase tracking-widest">
        Synced {lastSaved ? `at ${formatSaveTime(lastSaved)}` : ''}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-cream-bg flex flex-col font-sans selection:bg-brown-light selection:text-brown-dark">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-6 py-3 rounded-2xl shadow-xl border animate-slide-down backdrop-blur-md
          ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-brown-light/30 text-charcoal'}`}>
          <div className="flex items-center gap-2 font-semibold">
            {toast.type === 'error' ? '✕' : '✓'}
            {toast.message}
          </div>
        </div>
      )}

      {/* Top Toolbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-brown-light/20 sticky top-0 z-40 h-16 flex items-center shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-brown-dark/40 hover:text-brown-dark p-2 -ml-2 rounded-lg transition-colors flex-shrink-0"
              title="Back"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="w-px h-6 bg-brown-light/20 flex-shrink-0" />
            <input
              value={title}
              onChange={handleTitleChange}
              disabled={!canEdit}
              className="font-bold text-lg text-charcoal bg-transparent border-none outline-none min-w-0 truncate disabled:cursor-default placeholder-charcoal/20 focus:ring-0"
              placeholder="Untitled Document"
              maxLength={200}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 rounded-full bg-beige-soft/40 border border-brown-light/10 mr-4">
              <SaveIndicator />
            </div>

            <div className="flex items-center -space-x-2 mr-4">
              {activeUsers.slice(0, 3).map((u, i) => (
                <div key={i} className="ring-2 ring-white rounded-full">
                  <Avatar name={u.name} color={u.color} size={8} />
                </div>
              ))}
              {activeUsers.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-beige-soft border-2 border-white flex items-center justify-center text-[10px] font-black text-brown-dark shadow-sm">
                  +{activeUsers.length - 3}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-brown-light/20 mx-2 hidden sm:block" />

            {canEdit && (
              <button
                onClick={handleSaveVersion}
                className="p-2 text-brown-dark/50 hover:text-brown-dark hover:bg-beige-soft rounded-lg transition-all hover:scale-110 active:scale-90"
                title="Save Snapshot"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}

            <button
              onClick={() => setShowVersions(true)}
              className="p-2 text-brown-dark/50 hover:text-brown-dark hover:bg-beige-soft rounded-lg transition-all hover:scale-110 active:scale-90"
              title="History"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {document?.owner?._id === user?._id && (
              <button
                onClick={() => setShowShare(true)}
                className="ml-2 flex items-center gap-2 px-6 py-2.5 bg-brown-dark text-white text-[11px] font-black uppercase tracking-[0.1em] rounded-xl shadow-[0_10px_25px_rgba(92,64,51,0.2)] hover:shadow-[0_15px_35px_rgba(92,64,51,0.3)] hover:bg-[#4A3525] transform transition-all hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                Share
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Editor Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-12">
        <div className="max-w-4xl mx-auto min-h-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-brown-light/10 rounded-[40px] p-12 sm:p-20 relative">
          {!canEdit && (
            <div className="mb-12 flex items-center justify-center gap-3 text-xs text-red-600 bg-red-50/50 border border-red-100 rounded-2xl py-4 font-bold uppercase tracking-widest shadow-sm">
              View-only Access
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            disabled={!canEdit}
            placeholder={canEdit ? "Pour your thoughts here..." : ""}
            className="w-full bg-transparent resize-none border-none outline-none focus:ring-0 text-charcoal text-lg leading-relaxed placeholder-charcoal/10"
            style={{ minHeight: 'calc(100vh - 400px)' }}
          />
        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-10 bg-white/80 backdrop-blur-md border-t border-brown-light/20 flex items-center justify-between px-6 text-[10px] font-black text-brown-dark uppercase tracking-[0.2em] shadow-sm z-40">
        <div className="flex items-center gap-8">
          <span className="flex items-center gap-2">{wordCount} Words</span>
          <span className="hidden sm:block opacity-50">•</span>
          <span className="hidden sm:block">{content.length} Characters</span>
        </div>
        <div className="flex items-center gap-6">
          {activeUsers.length > 1 && (
            <span className="flex items-center gap-2 text-brown-dark/80">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Active Now
            </span>
          )}
          {canEdit && (
            <span className="hidden md:block opacity-40 italic lowercase">⌘S to save snapshot</span>
          )}
        </div>
      </footer>

      {/* Modals */}
      {showShare && (
        <ShareModal
          document={document}
          onClose={() => setShowShare(false)}
          onUpdate={setDocument}
          showToast={showToast}
        />
      )}
      {showVersions && (
        <VersionHistoryModal
          documentId={id}
          onClose={() => setShowVersions(false)}
          onRestore={canEdit ? handleRestoreVersion : null}
          showToast={showToast}
        />
      )}
    </div>
  );
}
