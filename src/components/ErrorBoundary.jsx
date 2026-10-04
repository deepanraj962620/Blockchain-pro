import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('SecureChain UI error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Arial,sans-serif',background:'#f8fafc'}}>
          <div style={{maxWidth:620,width:'100%',background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:24,boxShadow:'0 10px 30px rgba(15,23,42,.08)'}}>
            <h2 style={{margin:'0 0 10px'}}>SecureChain could not load this screen</h2>
            <p style={{color:'#475569'}}>The app is online, but one frontend data request failed. Refresh once. If this message remains, check Supabase tables and Render environment variables.</p>
            <pre style={{whiteSpace:'pre-wrap',fontSize:12,background:'#f1f5f9',padding:12,borderRadius:8,overflow:'auto'}}>{String(this.state.error?.message || 'Unknown UI error')}</pre>
            <button onClick={() => { localStorage.removeItem('account'); localStorage.removeItem('authToken'); window.location.href='/'; }} style={{marginTop:12,padding:'10px 14px',border:0,borderRadius:8,cursor:'pointer'}}>Reset session</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
