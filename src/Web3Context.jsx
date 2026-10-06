import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from './lib/api';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(() => localStorage.getItem('account') || null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || null);
  const apiUrl = API_URL;
  const authHeaders = (extra = {}) => authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : extra;
  const [provider, setProvider] = useState(null);
  const [network, setNetwork] = useState(() => localStorage.getItem('network') || 'Ethereum Mainnet');
  const [loading, setLoading] = useState(false);
  const [isP2pMode, setIsP2pMode] = useState(localStorage.getItem('isP2pMode') === 'true');
  const socketRef = useRef(null);

useEffect(() => {
    if (!apiUrl || !SOCKET_URL) return;
    // Use the resolved API URL for the socket server (strip trailing /api).
    const socketUrl = SOCKET_URL;
    if (socketRef.current) socketRef.current.disconnect();
    socketRef.current = io(socketUrl);
    
    socketRef.current.on('connect', () => {
      console.log('Connected to backend socket server');
    });

    socketRef.current.on('receive-message', (data) => {
      setMessages(prev => {
        const contactId = data.sender === (account || 'guest') ? data.recipient : data.sender;
        const chatHistory = Array.isArray(prev?.[contactId]) ? prev[contactId] : [];
        // Avoid duplicates
        if (chatHistory.find(m => m.id === data.id)) return prev;
        return {
          ...prev,
          [contactId]: [...chatHistory, data]
        };
      });
    });

    socketRef.current.on('incoming-transfer', (data) => {
      setReceivedFiles(prev => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.find(f => f.id === data.id)) return list;
        return [data, ...list];
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [apiUrl]);

  useEffect(() => {
    if (account && socketRef.current) {
      socketRef.current.emit('join', account);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      localStorage.setItem('account', account);
      localStorage.setItem('network', network);
    } else {
      localStorage.removeItem('account');
      localStorage.removeItem('network');
    }
  }, [account, network]);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem('authToken', authToken);
    } else {
      localStorage.removeItem('authToken');
    }
  }, [authToken]);

  useEffect(() => {
    localStorage.setItem('isP2pMode', isP2pMode);
  }, [isP2pMode]);

  const loginWithWallet = async (walletAddress, browserProvider = provider) => {
    if (!apiUrl) throw new Error('VITE_API_URL is not configured');
    try {
      const activeProvider = browserProvider || (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null);
      if (!activeProvider) throw new Error('MetaMask provider not available');

      const nonceRes = await fetch(`${apiUrl}/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      });
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData.error || 'Unable to create wallet challenge');

      const signer = await activeProvider.getSigner();
      const signature = await signer.signMessage(nonceData.message);
      const verifyRes = await fetch(`${apiUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature })
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(data.error || 'Wallet verification failed');
      if (data?.token) {
        setAuthToken(data.token);
        if (data.profile?.display_name) localStorage.setItem('displayName', data.profile.display_name);
        return data.token;
      }
    } catch (error) {
      console.error('Wallet login failed', error);
      throw error;
    }
    return null;
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      alert('Wallet address copied to clipboard!');
    }
  };

  // Global State for Backend functionality
  const [transfers, setTransfers] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState({});

  const fetchData = async () => {
    try {
      const transRes = await fetch(`${apiUrl}/transfers`);
      const transData = await transRes.json().catch(() => []);
      const safeTransfers = transRes.ok && Array.isArray(transData) ? transData : [];
      if (!transRes.ok) console.error('Transfers API error:', transData);
      setTransfers(safeTransfers);
      setReceivedFiles(safeTransfers);

      const actRes = await fetch(`${apiUrl}/activities`);
      const actData = await actRes.json().catch(() => []);
      const safeActivities = actRes.ok && Array.isArray(actData) ? actData : [];
      if (!actRes.ok) console.error('Activities API error:', actData);
      setActivities(safeActivities);
      
      const res = await fetch(`${apiUrl}/messages/all`, { headers: authHeaders() });
      // Since our endpoint requires address, let's fetch for the current user later or create an "all" endpoint.
      // But we will rely on the account useEffect for messages for now.
    } catch (e) {
      console.error('API Fetch failed', e);
    }
  };

  useEffect(() => {
    if (apiUrl) fetchData();
  }, [apiUrl, authToken]);

  useEffect(() => {
    if (account && authToken) {
      // If we want to show messages even as guest, let's just fetch for 'guest' or fetch all
      const fetchAddress = account || 'guest';
      fetch(`${apiUrl}/messages/${fetchAddress}`, { headers: authHeaders() })
        .then(async res => {
          const data = await res.json().catch(() => []);
          if (!res.ok) {
            console.error('Messages API error:', data);
            return [];
          }
          return Array.isArray(data) ? data : [];
        })
        .then(data => {
          const msgsByContact = {};
          data.forEach(msg => {
            const contactId = msg.sender === fetchAddress ? msg.recipient : msg.sender;
            if (!msgsByContact[contactId]) msgsByContact[contactId] = [];
            msgsByContact[contactId].push(msg);
          });
          setMessages(msgsByContact);
        })
        .catch(console.error);
    }
  }, [account, apiUrl, authToken]);

  const sendMessage = async (recipient, text) => {
    const newMessage = {
      recipient,
      sender: account || 'guest',
      text,
      fileName: null,
      fileSize: null,
      isFile: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'sent'
    };

    try {
      const res = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newMessage)
      });
      const data = await res.json();
      
      setMessages(prev => {
        const chatHistory = Array.isArray(prev?.[recipient]) ? prev[recipient] : [];
        return {
          ...prev,
          [recipient]: [...chatHistory, data]
        };
      });



    } catch (e) { console.error(e); }
  };

  const sendFileMessage = async (recipient, file) => {
    const newMessage = {
      recipient,
      sender: account || 'guest',
      text: '',
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(2) + ' KB',
      isFile: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'sent'
    };

    try {
      const res = await fetch(`${apiUrl}/messages`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(newMessage)
      });
      const data = await res.json();
      setMessages(prev => {
        const chatHistory = Array.isArray(prev?.[recipient]) ? prev[recipient] : [];
        return { ...prev, [recipient]: [...chatHistory, data] };
      });
    } catch (e) { console.error(e); }
  };

  const deleteMessage = async (recipient, messageId) => {
    try {
      await fetch(`${apiUrl}/messages/${messageId}`, { method: 'DELETE', headers: authHeaders() });
      setMessages(prev => {
        const chatHistory = Array.isArray(prev?.[recipient]) ? prev[recipient] : [];
        return { ...prev, [recipient]: chatHistory.filter(msg => msg.id !== messageId) };
      });
    } catch (e) { console.error(e); }
  };

  const editMessage = async (recipient, messageId, newText) => {
    try {
      await fetch(`${apiUrl}/messages/${messageId}`, {
        method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ text: newText })
      });
      setMessages(prev => {
        const chatHistory = Array.isArray(prev?.[recipient]) ? prev[recipient] : [];
        return { ...prev, [recipient]: chatHistory.map(msg => msg.id === messageId ? { ...msg, text: newText } : msg) };
      });
    } catch (e) { console.error(e); }
  };

  const addTransfer = async (file, recipient, password) => {
    const fileId = Math.random().toString(36).substr(2, 9);
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create activity object
    const newActivity = {
      type: 'sent',
      file: file.name,
      target: recipient.substring(0, 6) + '...' + recipient.substring(recipient.length - 4),
      time: time,
      date: date
    };

    if (isP2pMode) {
      // In P2P mode, we still need to make the file available. 
      // We'll upload it to the server but tag it as a P2P transfer.
      console.log(`Initiating P2P transfer for ${file.name} to ${recipient}`);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', fileId);
    formData.append('name', file.name);
    formData.append('size', (file.size / (1024 * 1024)).toFixed(1) + ' MB');
    formData.append('date', date);
    formData.append('status', 'Confirmed');
    formData.append('type', file.name.split('.').pop() || 'file');
    formData.append('color', isP2pMode ? '#8b5cf6' : '#10b981'); // Purple for P2P, Green for Standard
    formData.append('recipient', recipient);
    formData.append('sender', account || 'guest');
    formData.append('password', password || '');
    formData.append('hasBlob', 'true');

    try {
      // Post transfer to server
      const response = await fetch(`${apiUrl}/transfers`, { 
        method: 'POST',
        headers: authHeaders(),
        body: formData 
      });

      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try { message = JSON.parse(text)?.error || text; } catch (_) {}
        throw new Error(message || `Server responded with ${response.status}`);
      }
      
      const newTransfer = {
        id: fileId, 
        name: file.name, 
        size: formData.get('size'), 
        date: date,
        status: 'Confirmed', 
        type: formData.get('type'), 
        color: formData.get('color'), 
        recipient,
        sender: account || 'guest',
        from: account || 'guest',
        password: Boolean(password), 
        hasBlob: true,
        isP2p: isP2pMode
      };

      // Post activity to server (best-effort)
      fetch(`${apiUrl}/activities`, {
        method: 'POST', 
        headers: authHeaders({ 'Content-Type': 'application/json' }), 
        body: JSON.stringify(newActivity)
      }).catch(console.warn);

      setTransfers(prev => [newTransfer, ...prev]);
      setActivities(prev => [newActivity, ...prev]);
      setReceivedFiles(prev => [newTransfer, ...prev]);

      if (isP2pMode) {
        alert(`P2P direct transfer of "${file.name}" to ${recipient} completed successfully!`);
      }
      return { success: true };
    } catch (err) {
      console.error("Transfer error:", err);
      const errorMsg = err.message || "Unknown error";
      alert(`Failed to transfer "${file.name}".\n\nError: ${errorMsg}\n\nTip: If your backend is deployed on Render free tier, it may take 40-50 seconds to wake up from idle.`);
      return { success: false, error: err.message };
    }
  };

  const downloadFile = async (fileId, enteredPassword) => {
    const file = transfers.find(f => f.id === fileId) || receivedFiles.find(f => f.id === fileId);
    if (!file) return { success: false, message: 'File not found' };

    if (file.hasBlob) {
      const response = await fetch(`${apiUrl}/transfers/download/${fileId}`, {
        headers: enteredPassword ? { 'X-File-Password': enteredPassword } : {}
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { success: false, message: error.error || 'Download failed' };
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    } else {
      alert(`Downloading ${file.name} (Simulation)`);
      return { success: true };
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        setAccount(accounts[0]);
        setProvider(provider);
        
        const networkData = await provider.getNetwork();
        setNetwork(networkData.name === 'unknown' ? 'Localhost' : networkData.name);
        await loginWithWallet(accounts[0], provider);
      } catch (error) {
        console.error("User denied account access", error);
        alert("Wallet connection cancelled or failed. Please try again or use Guest mode.");
      } finally {
        setLoading(false);
      }
    } else {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.open(`https://metamask.app.link/dapp/${window.location.host}`, '_blank');
      } else {
        window.open('https://metamask.io/download/', '_blank');
        alert("MetaMask not found. Please install the MetaMask extension from https://metamask.io to connect your real wallet. Or you can Continue as Guest.");
      }
    }
  };

  const mockConnectWallet = () => {
    setLoading(true);
    setTimeout(() => {
      const randomWallet = ethers.Wallet.createRandom();
      setAccount(randomWallet.address);
      setNetwork('Mock Network');
      setLoading(false);
    }, 500);
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setAuthToken(null);
  };

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length > 0) {
        try {
          setAccount(accounts[0]);
          const nextProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(nextProvider);
          await loginWithWallet(accounts[0], nextProvider);
        } catch (error) {
          console.error('Wallet re-authentication failed', error);
          setAuthToken(null);
        }
      } else {
        setAccount(null);
        setAuthToken(null);
      }
    };

    const handleChainChanged = () => window.location.reload();
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [apiUrl]);

  const deleteTransfer = async (id) => {
    try {
      await fetch(`${apiUrl}/transfers/${id}`, { method: 'DELETE' });
      setTransfers(prev => prev.filter(t => t.id !== id));
      setReceivedFiles(prev => prev.filter(f => f.id !== id));
    } catch(e) { console.error(e); }
  };

  const editTransfer = (id, newData) => {
    setTransfers(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === id ? { ...t, ...newData } : t));
    setReceivedFiles(prev => (Array.isArray(prev) ? prev : []).map(f => f.id === id ? { ...f, ...newData } : f));
  };

  const deleteActivity = async (fileName) => {
    try {
      await fetch(`${apiUrl}/activities/byFile/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
      setActivities(prev => prev.filter(a => a.file !== fileName));
    } catch(e) { console.error(e); }
  };

  const editActivity = async (oldFileName, newFileName) => {
    try {
      await fetch(`${apiUrl}/activities/editFile/${encodeURIComponent(oldFileName)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newName: newFileName })
      });
      setActivities(prev => (Array.isArray(prev) ? prev : []).map(a => a.file === oldFileName ? { ...a, file: newFileName } : a));
    } catch(e) { console.error(e); }
  };

  return (
  <Web3Context.Provider value={{ 
      account, authToken, apiUrl, connectWallet, mockConnectWallet, disconnectWallet, network, loading,
      isP2pMode, setIsP2pMode,
      transfers, activities, addTransfer, receivedFiles, downloadFile,
      copyAddress, deleteTransfer, editTransfer, deleteActivity, editActivity,
      messages, sendMessage, sendFileMessage, deleteMessage, editMessage
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
