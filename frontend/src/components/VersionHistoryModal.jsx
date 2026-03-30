import { useState, useEffect } from 'react';
import axios from 'axios';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function VersionHistoryModal({ documentId, onClose, onRestore, showToast }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`/api/documents/${documentId}`);
        const v = data.document.versions || [];
        setVersions([...v].reverse()); // newest first
      } catch {
        showToast('Failed to load versions', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [documentId, showToast]);

  const handleRestore = async (originalIndex) => {
    setRestoring(originalIndex);
    await onRestore(originalIndex);
    setRestoring(null);
  };

  // Map reversed display index back to original index
  const getOriginalIndex = (displayIndex) => {
    return versions.length - 1 - displayIndex;
  };

  return (
    <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-brown-light/10 animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="p-8 border-b border-brown-light/10 flex items-center justify-between flex-shrink-0 bg-beige-soft/10">
          <div>
            <h2 className="text-2xl font-black text-charcoal tracking-tight">Timeline</h2>
            <p className="text-[10px] font-black text-brown-dark/40 uppercase tracking-[0.2em] mt-1">{versions.length} Archive Snapshots</p>
          </div>
          <button onClick={onClose} className="text-brown-dark/40 hover:text-red-500 p-2 rounded-lg transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Version list */}
          <div className="w-80 border-r border-brown-light/10 overflow-y-auto flex-shrink-0 bg-white custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-brown-light/20 border-t-brown-dark rounded-full animate-spin mx-auto" />
              </div>
            ) : versions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-beige-soft/40 rounded-full flex items-center justify-center mx-auto mb-6 text-xl">∅</div>
                <p className="text-[10px] font-black text-brown-dark/40 uppercase tracking-[0.2em]">Empty Archives</p>
                <p className="mt-4 text-xs text-charcoal/40 leading-relaxed px-4">Take a snapshot in the editor to preserve this moment.</p>
              </div>
            ) : (
              <ul className="divide-y divide-brown-light/5">
                {versions.map((v, displayIdx) => {
                  const origIdx = getOriginalIndex(displayIdx);
                  const isActive = preview === v;
                  return (
                    <li
                      key={displayIdx}
                      onClick={() => setPreview(v)}
                      className={`p-6 cursor-pointer transition-all ${isActive ? 'bg-beige-soft/20 ring-1 ring-inset ring-brown-light/10' : 'hover:bg-beige-soft/10'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`text-sm font-black truncate ${isActive ? 'text-charcoal' : 'text-charcoal/60'}`}>{v.label || `Draft ${origIdx + 1}`}</div>
                        {onRestore && (
                        <button
                          onClick={e => { e.stopPropagation(); handleRestore(origIdx); }}
                          disabled={restoring === origIdx}
                          className="mt-4 text-[10px] font-black text-white bg-brown-dark hover:bg-[#4A3525] px-4 py-2 rounded-xl shadow-[0_5px_15px_rgba(92,64,51,0.2)] transition-all disabled:opacity-50 uppercase tracking-widest block transform hover:scale-105 active:scale-95"
                        >
                          {restoring === origIdx ? '...' : 'Restore'}
                        </button>
                        )}
                      </div>
                      <div className="text-[10px] text-brown-dark/40 font-black uppercase tracking-widest">{formatDate(v.savedAt)}</div>
                      {v.savedBy && (
                        <div className="text-[10px] text-brown-dark/30 mt-1 font-bold italic">by {v.savedBy.name}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Preview pane */}
          <div className="flex-1 overflow-y-auto p-12 bg-cream-bg/30 relative custom-scrollbar">
            {preview ? (
              <div className="h-full flex flex-col">
                <div className="mb-8 flex items-end justify-between border-b border-brown-light/20 pb-4">
                  <h3 className="text-xl font-black text-charcoal">{preview.label}</h3>
                  <span className="text-[10px] font-black text-brown-dark/40 uppercase tracking-widest">{formatDate(preview.savedAt)}</span>
                </div>
                <div className="flex-1 bg-white border border-brown-light/10 shadow-sm rounded-[32px] p-12 text-charcoal text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto custom-scrollbar">
                  {preview.content || <span className="text-charcoal/20 italic font-medium">Empty Manuscript</span>}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <div className="w-20 h-20 border-2 border-dashed border-brown-dark rounded-[24px] flex items-center justify-center text-4xl mb-6">👁</div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em]">Select a version to inspect</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
