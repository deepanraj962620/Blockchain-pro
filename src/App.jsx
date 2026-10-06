import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Web3Provider, useWeb3 } from './Web3Context'
import MainLayout from './components/MainLayout'
import DashboardView from './views/DashboardView'
import SendFileView from './views/SendFileView'
import ReceiveFilesView from './views/ReceiveFilesView'
import ChatView from './views/ChatView'
import HistoryView from './views/HistoryView'
import SecurityView from './views/SecurityView'
import ContactsView from './views/ContactsView'
import SettingsView from './views/SettingsView'
import CloudStorageView from './views/CloudStorageView'
import SharedFileView from './views/SharedFileView'
import LoginView from './views/LoginView'
import './index.css'

function AuthenticatedApp() {
  const { account } = useWeb3()

  if (!account) {
    return <LoginView />
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/send" element={<SendFileView />} />
        <Route path="/receive" element={<ReceiveFilesView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/security" element={<SecurityView />} />
        <Route path="/contacts" element={<ContactsView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/cloud" element={<CloudStorageView />} />
      </Routes>
    </MainLayout>
  )
}

function App() {
  return (
    <Web3Provider>
      <Router>
        <Routes>
          <Route path="/shared/:token" element={<SharedFileView />} />
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </Router>
    </Web3Provider>
  )
}

export default App
