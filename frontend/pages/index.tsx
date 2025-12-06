import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import FileUpload from '../components/FileUpload';
import ChatInterface from '../components/ChatInterface';

interface Document {
  id: string;
  name: string;
  chunks_count: number;
}

interface Message {
  content: string;
  role: 'user' | 'assistant';
  sources?: Array<{
    pageContent: string;
    metadata: {
      page: number;
    };
    score?: number;
  }>;
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');

  // Handle file upload completion
  const handleUploadComplete = useCallback((result: any) => {
    const newDocument = {
      id: result.filename,
      name: result.filename,
      chunks_count: result.chunks_count
    };

    setDocuments(prev => [...prev, newDocument]);
    setCurrentDocument(newDocument);
    setUploadError(null);
    setIsUploading(false);
  }, []);

  // Handle file upload error
  const handleUploadError = useCallback((error: string) => {
    setUploadError(error);
    setIsUploading(false);
  }, []);

  // Send message to API
  const handleSendMessage = useCallback(async (message: string, sessionId: string, chatHistory: any[]) => {
    if (!currentDocument) {
      return {
        answer: "Please upload a financial statement PDF first.",
        sources: [],
        processing_time: 0
      };
    }

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message,
          session_id: sessionId,
          chat_history: chatHistory,
          document_id: currentDocument.id
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      return data; // Return the full response object with answer, sources, etc.
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        answer: "Sorry, there was an error processing your request.",
        sources: [],
        processing_time: 0
      };
    }
  }, [apiUrl, currentDocument]);

  return (
    <div className="app-container">
      <Head>
        <title>AI Agent for Financial Statement Analysis</title>
        <meta name="description" content="AI-powered Q&A system for financial documents" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <header className="app-header">
        <h1>AI Agent for Financial Statement Analysis</h1>
      </header>

      <main className="app-main">
        <div className="app-sidebar">
          <div className="upload-section">
            <h2>Upload Document</h2>
            <FileUpload 
              apiUrl={`${apiUrl}/api/upload`}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
            {uploadError && <div className="error-message">{uploadError}</div>}
          </div>
          
          <div className="documents-section">
            <h2>Documents</h2>
            {documents.length === 0 ? (
              <p className="no-documents">No documents uploaded yet</p>
            ) : (
              <ul className="document-list">
                {documents.map(doc => (
                  <li 
                    key={doc.id} 
                    className={`document-item ${currentDocument?.id === doc.id ? 'active' : ''}`}
                    onClick={() => setCurrentDocument(doc)}
                  >
                    <span className="document-name">{doc.name}</span>
                    <span className="document-chunks">{doc.chunks_count} chunks</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="chat-container">
          {currentDocument ? (
            <>
              <div className="chat-header">
                <h2>Chat with: {currentDocument.name}</h2>
              </div>
              <ChatInterface onSendMessage={handleSendMessage} />
            </>
          ) : (
            <div className="chat-placeholder">
              <div className="placeholder-content">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <h3>No document selected</h3>
                <p>Upload a financial PDF document to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>AI Agent for Financial Statement Analysis | Arif Fadly Siregar &copy; 2025</p>
      </footer>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html,
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
            Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
          background-color: #f5f7fa;
          color: #333;
        }
        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .app-header {
          background-color: #2c3e50;
          color: white;
          padding: 1rem 2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .app-main {
          flex: 1;
          display: flex;
          padding: 2rem;
          gap: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }
        .app-sidebar {
          width: 350px;
          flex-shrink: 0;
        }
        .chat-container {
          flex: 1;
          border-radius: 8px;
          background-color: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .upload-section, .documents-section {
          background-color: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        h2 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          color: #2c3e50;
        }
        .error-message {
          color: #e74c3c;
          margin-top: 1rem;
          font-size: 0.875rem;
        }
        .document-list {
          list-style: none;
        }
        .document-item {
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          border: 1px solid #eaeaea;
          display: flex;
          justify-content: space-between;
        }
        .document-item.active {
          background-color: #ebf5ff;
          border-color: #3498db;
        }
        .document-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .document-chunks {
          font-size: 0.75rem;
          color: #7f8c8d;
          padding-left: 0.5rem;
        }
        .no-documents {
          color: #7f8c8d;
          font-style: italic;
        }
        .chat-placeholder {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #fafafa;
          color: #7f8c8d;
          text-align: center;
        }
        .placeholder-content {
          padding: 2rem;
        }
        .chat-placeholder svg {
          color: #95a5a6;
          margin-bottom: 1rem;
        }
        .chat-placeholder h3 {
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .chat-header {
          padding: 1rem;
          border-bottom: 1px solid #eaeaea;
        }
        .app-footer {
          text-align: center;
          padding: 1.5rem;
          color: #7f8c8d;
          font-size: 0.875rem;
          border-top: 1px solid #eaeaea;
        }
        /* FileUpload component styles */
        .file-upload {
          width: 100%;
        }
        .upload-area {
          border: 2px dashed #bdc3c7;
          border-radius: 8px;
          padding: 2rem 1rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1rem;
        }
        .upload-area:hover, .upload-area.active {
          border-color: #3498db;
          background-color: #f8fafc;
        }
        .upload-area.has-file {
          border-color: #27ae60;
          background-color: #f0fff4;
        }
        .upload-icon svg {
          color: #7f8c8d;
          margin-bottom: 1rem;
        }
        .primary-text {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        .secondary-text {
          font-size: 0.875rem;
          color: #7f8c8d;
        }
        .filename {
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: #27ae60;
        }
        .file-size {
          font-size: 0.875rem;
          color: #7f8c8d;
        }
        .upload-actions {
          display: flex;
          gap: 1rem;
        }
        .upload-button, .cancel-button {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          outline: none;
        }
        .upload-button {
          background-color: #3498db;
          color: white;
          flex: 1;
        }
        .upload-button:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }
        .cancel-button {
          background-color: #f1f3f5;
          color: #7f8c8d;
        }
        .progress-container {
          margin-top: 1rem;
        }
        .progress-bar {
          width: 100%;
          background-color: #ecf0f1;
          border-radius: 4px;
          height: 8px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .progress-fill {
          height: 100%;
          background-color: #3498db;
          transition: width 0.3s ease;
        }
        .progress-text {
          font-size: 0.75rem;
          color: #7f8c8d;
          text-align: right;
        }
      `}</style>
    </div>
  );
}