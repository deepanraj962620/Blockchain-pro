import { useRef } from 'react';
import { useState, useEffect } from 'react';
import { UploadCloud, User, Send, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const SendFile = ({ onSend }) => {
  const location = useLocation();
  const [files, setFiles] = useState([]);
  const [recipient, setRecipient] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle, uploading, sent
  const fileInputRef = useRef(null);

  useEffect(() => {
    const nextRecipient = location.state?.recipient;
    if (nextRecipient) {
      // Defer state update to avoid sync update warnings for this external value.
      queueMicrotask(() => setRecipient(nextRecipient));
    }
  }, [location.state?.recipient]);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const getFileIcon = (file) => {
    const type = file.type;
    const name = file.name || '';
    if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return '🖼️';
    if (type.startsWith('video/') || name.match(/\.(mp4|avi|mov|webm)$/i)) return '🎥';
    if (type.startsWith('audio/') || name.match(/\.(mp3|wav|webm|ogg)$/i)) return '🎵';
    return '📄';
  };

  const handleSend = async () => {
    if (!files.length || !recipient) {
      alert("Please select files and enter a recipient address.");
      return;
    }

    setStatus("uploading");
    
    try {
      // Simulate encryption and blockchain upload for each file
      for (const file of files) {
        // Wait for each file to be processed
        const result = await onSend(file, recipient, password);
        if (result && result.success === false) {
          setStatus("idle");
          return; // Stop if one fails
        }
      }
      
      setStatus("sent");
      
      setTimeout(() => {
        setStatus("idle");
        setFiles([]);
        setRecipient("");
        setPassword("");
      }, 3000);
    } catch (error) {
      console.error("Handle send error:", error);
      setStatus("idle");
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3><UploadCloud size={18} color="#10b981" /> Send File</h3>
      </div>
      
      <div 
        className="drop-zone" 
        style={{ cursor: 'default', borderColor: files.length ? '#10b981' : 'var(--border)', marginBottom: '20px' }}
      >
        <div style={{ background: files.length ? '#10b981' : '#f0fdf4', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', transition: 'all 0.3s' }}>
          {files.length ? <CheckCircle2 size={32} color="white" /> : <UploadCloud size={32} color="#10b981" />}
        </div>
        <p>{files.length ? `${files.length} files selected` : "Drag & drop your files here to begin the secure transfer flow."}</p>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button className="btn-primary" style={{ margin: '8px auto', fontSize: '0.75rem', padding: '8px 16px' }} onClick={() => fileInputRef.current?.click()}>
          <UploadCloud size={16} /> Upload Files
        </button>
        {files.length > 0 && (
          <button className="btn-secondary" style={{ margin: '8px auto', fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setFiles([])}>
            Clear All
          </button>
        )}
        {files.length > 0 && (
          <div style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '12px', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px' }}>
            {(Array.isArray(files) ? files : []).map((file, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px', borderRadius: '4px', background: '#f8fafc', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.5rem' }}>{getFileIcon(file)}</span>
                <span style={{ fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{Math.round(file.size / 1024)} KB</span>
                <button 
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                  onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Recipient Wallet Address</label>
          <div className="input-with-icon">
            <input 
              type="text" 
              placeholder="0x7B21...a8F3" 
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <User className="input-icon" size={16} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Set Password (Optional)</label>
          <div className="input-with-icon">
            <input 
              type="password" 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Lock className="input-icon" size={16} />
          </div>
        </div>
      </div>

      <button 
        className="btn-primary" 
        style={{ width: '100%', justifyContent: 'center', opacity: status === 'uploading' ? 0.7 : 1 }} 
        onClick={handleSend}
        disabled={status === 'uploading'}
      >
        {status === 'idle' && <><Send size={18} /> Send {files.length || 1} File{files.length !== 1 ? 's' : ''} Securely</>}
        {status === 'uploading' && <><Loader2 size={18} className="spin" /> Encrypting & Uploading...</>}
        {status === 'sent' && <><CheckCircle2 size={18} /> Files Sent!</>}
      </button>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SendFile;
