import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress,
  IconButton,
  Paper,
  useMediaQuery,
  useTheme,
  Tooltip,
  Fade,
  Zoom,
  Avatar,
  Badge,
  Button,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import VideocamIcon from '@mui/icons-material/Videocam';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Enhanced message text with markdown support
const MessageText = ({ text }) => {
  // Check if text contains code blocks
  const hasCodeBlock = text.includes('```');
  
  if (hasCodeBlock) {
    return (
      <ReactMarkdown
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={atomDark}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {text}
      </ReactMarkdown>
    );
  }
  
  return (
    <Typography variant="body2" sx={{
      lineHeight: 1.6,
      '& a': {
        color: '#9c27b0',
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline'
        }
      }
    }}>
      {text}
    </Typography>
  );
};

const ChatBox = ({ messages, onSendMessage, isWaiting, onNewChat }) => {
  const [input, setInput] = useState('');
  const [typingDots, setTypingDots] = useState(1);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Typing indicator animation
  useEffect(() => {
    if (isWaiting) {
      const interval = setInterval(() => {
        setTypingDots(prev => prev < 3 ? prev + 1 : 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isWaiting]);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Send message function
  const handleSend = () => {
    if (input.trim() && !isWaiting) {
      onSendMessage(input.trim());
      setInput('');
      // Focus back on input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle new chat
  const handleNewChat = () => {
    // Clear the messages in the parent component
    if (onNewChat) {
      onNewChat();
    }
  };
  
  return (
    <div className="chat-container">
      {/* Chat Header */}
      <div className="chat-header">
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          width: '100%',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ 
              bgcolor: '#9c27b0', 
              width: isSmallMobile ? 32 : 36, 
              height: isSmallMobile ? 32 : 36 
            }}>
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Typography variant="h6" sx={{ 
              fontWeight: 500,
              fontSize: isSmallMobile ? '0.95rem' : '1.1rem',
              color: 'rgba(255,255,255,0.9)'
            }}>
              AI Assistant
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleNewChat}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.9)',
              borderColor: 'rgba(255,255,255,0.25)',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.5)',
                backgroundColor: 'rgba(255,255,255,0.05)'
              }
            }}
          >
            New Chat
          </Button>
        </Box>
      </div>
      
      {/* Chat Messages */}
      <div className="chat-messages" style={{
        padding: isSmallMobile ? '10px' : '16px',
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%', 
            flex: 1
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'rgba(156, 39, 176, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3
            }}>
              <VideocamIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
            </Box>
            <Typography variant="h6" sx={{ 
              textAlign: 'center', 
              fontWeight: 500, 
              mb: 1,
              color: 'rgba(255,255,255,0.9)'
            }}>
              AI Video Assistant
            </Typography>
            <Typography variant="body2" sx={{ 
              textAlign: 'center', 
              px: 2, 
              color: 'rgba(255,255,255,0.7)',
              maxWidth: '300px',
              mb: 4
            }}>
              Ask me anything about editing your videos. I'm here to help.
            </Typography>
          </Box>
        ) : (
          // Filter out duplicate messages based on content and role
          messages.filter((msg, idx, self) => {
            // Keep this message if it's the first occurrence or if it's from a different sender than the previous one
            if (idx === 0) return true;
            
            // Check if this exact same message (by content and sender) appears earlier in the chat
            const prevSameContentIdx = self.findIndex((m, i) => {
              return i < idx && m.role === msg.role && m.content === msg.content;
            });
            
            // If we found an earlier occurrence, filter this one out
            return prevSameContentIdx === -1;
          }).map((msg, idx, filteredMessages) => {
            const isLastMessage = idx === filteredMessages.length - 1;
            const showAvatar = idx === 0 || filteredMessages[idx-1].role !== msg.role;
            
            return (
              <div 
                key={idx} 
                className={`chat-message ${msg.role}`}
                style={{
                  padding: isSmallMobile ? '8px 12px' : '10px 16px',
                  borderRadius: '14px',
                  backgroundColor: msg.role === 'user' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(156, 39, 176, 0.05)',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: isSmallMobile ? '85%' : '75%',
                  opacity: 1,
                  transform: 'translateY(0)',
                  animation: isLastMessage ? 'fadeIn 0.3s ease-out' : 'none'
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  {showAvatar && msg.role === 'assistant' && (
                    <Avatar 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        bgcolor: '#9c27b0',
                        mt: 0.5,
                        display: isSmallMobile ? 'none' : 'flex'
                      }}
                    >
                      <SmartToyIcon sx={{ fontSize: 14 }} />
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <MessageText text={msg.content} />
                  </Box>
                </Box>
              </div>
            );
          })
        )}
        
        {isWaiting && (
          <div className="chat-message assistant" style={{
            padding: '10px 16px',
            borderRadius: '14px',
            backgroundColor: 'rgba(156, 39, 176, 0.05)',
            alignSelf: 'flex-start',
            maxWidth: isSmallMobile ? '85%' : '75%'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {!isSmallMobile && (
                <Avatar 
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    bgcolor: '#9c27b0',
                    mt: 0.5
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 14 }} />
                </Avatar>
              )}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                height: 24
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span className="typing-dot" style={{ 
                    animationDelay: '0s',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#9c27b0',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'pulse 1.5s infinite'
                  }}></span>
                  <span className="typing-dot" style={{ 
                    animationDelay: '0.2s',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#9c27b0',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'pulse 1.5s infinite'
                  }}></span>
                  <span className="typing-dot" style={{ 
                    animationDelay: '0.4s',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#9c27b0',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'pulse 1.5s infinite'
                  }}></span>
                </Box>
              </Box>
            </Box>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>
      
      {/* Chat Input Area */}
      <div className="chat-input" style={{
        padding: isSmallMobile ? '12px' : '16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <input 
          ref={inputRef}
          type="text" 
          className="message-input" 
          placeholder="Message AI assistant..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isWaiting}
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: '20px',
            padding: isSmallMobile ? '10px 16px' : '12px 18px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxShadow: input ? '0 0 0 2px rgba(156, 39, 176, 0.3)' : 'none'
          }}
        />
        
        <IconButton
          onClick={handleSend}
          disabled={!input.trim() || isWaiting}
          sx={{
            backgroundColor: input.trim() ? '#9c27b0' : 'rgba(255,255,255,0.1)',
            width: isSmallMobile ? '38px' : '42px',
            height: isSmallMobile ? '38px' : '42px',
            color: '#fff',
            '&:hover': {
              backgroundColor: input.trim() ? '#b52cc7' : 'rgba(255,255,255,0.15)'
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)'
            },
            transition: 'all 0.2s ease'
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
};

export default ChatBox;
