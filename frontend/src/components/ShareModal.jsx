import React, { useState } from 'react';
import axios from 'axios';

export default function ShareModal({ document, onClose, onUpdate, showToast }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const collaborators = document?.collaborators || [];
  const shareLink = document?.shareToken
    ? `${window.location.origin}/document/${document._id}?token=${document.shareToken}`
    : null;

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`/api/documents/${document._id}/share`, { email, role });
      onUpdate(data.document);
      setEmail('');
      showToast(`Shared with ${email}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      const { data } = await axios.post(`/api/documents/${document._id}/share`, {});
      onUpdate(data.document);
      showToast('Share link generated');
    } catch {
      showToast('Failed to generate link', 'error');
    }
  };

  const handleRemove = async (userId) => {
    try {
      const { data } = await axios.delete(`/api/documents/${document._id}/collaborators/${userId}`);
      onUpdate(data.document);
      showToast('Collaborator removed');
    } catch {
      showToast('Failed to remove', 'error');
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const collab = collaborators.find(c => c.user._id === userId);
      if (!collab) return;
      const { data } = await axios.post(`/api/documents/${document._id}/share`, {
        email: collab.user.email,
        role: newRole,
      });
      onUpdate(data.document);
    } catch {
      showToast('Failed to update role', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-[32px] shadow-2xl border border-brown-light/10 w-full max-w-md animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-brown-light/10 bg-beige-soft/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-charcoal tracking-tight">Access Control</h2>
            <button onClick={onClose} className="text-brown-dark/40 hover:text-red-500 p-2 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Add collaborator */}
          <form onSubmit={handleShare} className="space-y-4">
            <p className="text-[10px] font-black text-brown-dark/40 uppercase tracking-[0.2em] mb-2">Invite Collaborators</p>
            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                className="flex-1 px-4 py-3 text-sm bg-white border border-brown-light/20 rounded-xl text-charcoal placeholder-charcoal/20 focus:outline-none focus:border-brown-light focus:ring-4 focus:ring-brown-light/5 transition-all font-medium"
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="px-3 py-3 text-sm bg-beige-soft/40 border border-brown-light/20 text-charcoal font-bold rounded-xl focus:outline-none transition-all cursor-pointer"
              >
                <option value="editor">Edit</option>
                <option value="viewer">View</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brown-dark text-white text-[11px] font-black uppercase tracking-[0.1em] rounded-xl shadow-[0_10px_20px_rgba(92,64,51,0.2)] hover:shadow-[0_15px_30px_rgba(92,64,51,0.3)] hover:bg-[#4A3525] transform transition-all hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>

          {/* Current collaborators */}
          {collaborators.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-brown-dark/40 uppercase tracking-[0.2em] mb-4">Active Access ({collaborators.length})</p>
              <ul className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {collaborators.map(c => (
                  <li key={c.user._id} className="flex items-center justify-between gap-3 p-3 bg-beige-soft/20 rounded-2xl border border-brown-light/5 hover:border-brown-light/20 transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 border-2 border-white ring-1 ring-brown-light/10 shadow-sm"
                        style={{ backgroundColor: c.user.color || '#a57f5c' }}
                      >
                        {c.user.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-charcoal font-bold truncate">{c.user.name}</div>
                        <div className="text-[10px] text-brown-dark/50 truncate font-black uppercase tracking-widest">{c.user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={c.role}
                        onChange={e => handleRoleChange(c.user._id, e.target.value)}
                        className="text-[10px] font-black uppercase tracking-widest border border-brown-light/20 bg-white text-brown-dark rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brown-light/5 cursor-pointer"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => handleRemove(c.user._id)}
                        className="text-red-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Share link */}
          <div className="pt-2">
            <p className="text-[10px] font-black text-brown-dark/40 uppercase tracking-[0.2em] mb-4">Sharing Link</p>
            {shareLink ? (
              <div className="flex gap-2">
                <input
                  value={shareLink}
                  readOnly
                  className="flex-1 px-4 py-3 text-xs border border-brown-light/20 rounded-xl bg-beige-soft/30 text-charcoal/60 truncate focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-6 py-3 bg-brown-dark text-white border border-brown-dark rounded-xl text-[10px] font-black hover:bg-[#4A3525] transition-all uppercase tracking-widest whitespace-nowrap shadow-[0_5px_15px_rgba(92,64,51,0.2)] active:scale-95"
                >
                  {copied ? '✓ Copied' : 'Copy Link'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateLink}
                className="w-full py-4 border-2 border-dashed border-brown-dark text-brown-dark text-[11px] font-black rounded-2xl hover:bg-brown-dark hover:text-white hover:border-brown-dark transition-all uppercase tracking-widest transform hover:scale-[1.01]"
              >
                + Create Guest Link
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
