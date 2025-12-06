import React, { useState, useEffect, useRef } from 'react';

export interface Source {
  content: string;
  page: number;
  score: number;
  metadata?: any;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp?: Date;
  isLoading?: boolean;
}

export interface ChatHistory {
  role: string;
  content: string;
}

interface ChatInterfaceProps {
  onSendMessage?: (message: string, sessionId: string, history: ChatHistory[]) => Promise<any>;
}

export default function ChatInterface({ onSendMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('Chat session started with ID:', sessionId);
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Clear input and add user message
    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create temporary loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      isLoading: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Create chat history for API request
      const chatHistory = messages
        .filter(msg => !msg.isLoading)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

      // Send request to API via parent component
      if (onSendMessage) {
        const response = await onSendMessage(input.trim(), sessionId, chatHistory);
        
        // Remove loading message and add real response
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading);
          const assistantMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: response.answer,
            sources: response.sources,
            timestamp: new Date(),
          };
          return [...withoutLoading, assistantMessage];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: 'Sorry, there was an error processing your request. Please try again.',
          timestamp: new Date(),
        };
        return [...withoutLoading, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExampleClick = (exampleText: string) => {
    // Create and send the message directly without updating input state
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: exampleText,
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create temporary loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      isLoading: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, loadingMessage]);

    // Process the message through API
    if (onSendMessage) {
      const history = messages.map(msg => ({ role: msg.type, content: msg.content }));
      history.push({ role: 'user', content: exampleText });
      
      onSendMessage(exampleText, sessionId, history).then(response => {
        // Remove loading message and add assistant response
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading);
          const assistantMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: response.answer,
            sources: response.sources,
            timestamp: new Date(),
          };
          return [...withoutLoading, assistantMessage];
        });
        setIsLoading(false);
      }).catch(error => {
        console.error('Error sending example question:', error);
        
        // Remove loading message and add error message
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading);
          const errorMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: 'Sorry, there was an error processing your request. Please try again.',
            timestamp: new Date(),
          };
          return [...withoutLoading, errorMessage];
        });
        setIsLoading(false);
      });
    }
  };

  const formatTimestamp = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-interface" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      maxHeight: '90vh',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      background: '#f9fafb',
    }}>
      <div className="messages-container" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {messages.length === 0 ? (
          <div className="empty-state" style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(to bottom right, #f0f9ff, #e0f2fe)',
            borderRadius: '8px',
            margin: '20px auto',
            maxWidth: '600px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '16px',
              color: '#1e40af',
            }}>Ask questions about the financial statement</h2>
            <p style={{
              marginBottom: '12px',
              fontSize: '1.1rem',
              color: '#334155',
            }}>Examples:</p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <li 
                onClick={() => handleExampleClick('What is the total revenue for 2025?')}
                className="example-question"
              >What is the total revenue for 2025?</li>
              <li 
                onClick={() => handleExampleClick('What is the year-over-year operating profit growth rate?')}
                className="example-question"
              >What is the year-over-year operating profit growth rate?</li>
              <li 
                onClick={() => handleExampleClick('What are the main cost items?')}
                className="example-question"
              >What are the main cost items?</li>
              <li 
                onClick={() => handleExampleClick('How is the cash flow situation?')}
                className="example-question"
              >How is the cash flow situation?</li>
              <li 
                onClick={() => handleExampleClick('What is the debt ratio?')}
                className="example-question"
              >What is the debt ratio?</li>
            </ul>
          </div>
        ) : (
          <div className="messages" style={{ width: '100%' }}>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.type} ${message.isLoading ? 'loading' : ''}`}
                style={{
                  background: message.type === 'user' ? '#e0f2fe' : 'white',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  maxWidth: '85%',
                  alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  float: message.type === 'user' ? 'right' : 'left',
                  clear: 'both',
                }}
              >
                <div className="message-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  alignItems: 'center',
                }}>
                  <span className="message-sender" style={{
                    fontWeight: 600,
                    color: message.type === 'user' ? '#1e40af' : '#4b5563',
                    fontSize: '0.9rem',
                  }}>
                    {message.type === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <span className="message-time" style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}>{formatTimestamp(message.timestamp)}</span>
                </div>
                <div className="message-content" style={{
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  wordBreak: 'break-word',
                }}>
                  {message.isLoading ? (
                    <div className="loading-indicator" style={{
                      display: 'flex',
                      gap: '4px',
                      justifyContent: 'center',
                      margin: '8px 0',
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#4b5563',
                        animation: 'pulse 1.5s infinite ease-in-out',
                        animationDelay: '0s',
                      }}></span>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#4b5563',
                        animation: 'pulse 1.5s infinite ease-in-out',
                        animationDelay: '0.2s',
                      }}></span>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#4b5563',
                        animation: 'pulse 1.5s infinite ease-in-out',
                        animationDelay: '0.4s',
                      }}></span>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
                {message.sources && message.sources.length > 0 && (
                  <div className="message-sources" style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '0.9rem',
                  }}>
                    <h4 style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: '#4b5563',
                    }}>Sources:</h4>
                    {message.sources.map((source, index) => (
                      <div key={index} className="source-item" style={{
                        padding: '8px 12px',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        fontSize: '0.85rem',
                      }}>
                        <span className="source-page" style={{
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          color: '#4b5563',
                          display: 'block',
                          marginBottom: '4px',
                        }}>Page {source.page}</span>
                        <p className="source-content" style={{
                          margin: '4px 0',
                          fontSize: '0.85rem',
                        }}>{source.content}</p>
                        <span className="source-score" style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          display: 'block',
                          marginTop: '4px',
                        }}>Relevance: {Math.round(source.score * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} style={{ clear: 'both' }} />
          </div>
        )}
      </div>

      <div className="input-area" style={{
        position: 'sticky',
        bottom: 0,
        width: '100%',
        padding: '16px',
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
      }}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about the financial statement..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: '30px',
            border: '1px solid #e5e7eb',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
          className="chat-input"
        />
        <button 
          onClick={handleSendMessage} 
          disabled={!input.trim() || isLoading}
          style={{
            background: '#2563eb',
            color: 'white',
            fontWeight: 500,
            padding: '14px 24px',
            borderRadius: '30px',
            border: 'none',
            cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
            opacity: !input.trim() || isLoading ? 0.7 : 1,
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '100px',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
          }}
          className="send-button"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}