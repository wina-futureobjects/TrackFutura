import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Avatar, 
  Divider,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid as MuiGrid,
  Card,
  CardContent,
  Button,
  Collapse,
  Fade,
  Breadcrumbs,
  Link,
  Stack,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CompareIcon from '@mui/icons-material/Compare';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import FilterListIcon from '@mui/icons-material/FilterList';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import DeleteIcon from '@mui/icons-material/Delete';
import { chatService, type Message, type ChatThread } from '../services/chatService';
import ChatChart from '../components/ChatChart';

// Fix for MUI Grid type issues with 'item' prop
const Grid = (props: any) => <MuiGrid {...props} />;

// Follow-up suggestions component
const FollowUpSuggestions: React.FC<{ onSuggestionClick: (question: string) => void; messageContent: string }> = ({ onSuggestionClick, messageContent }) => {
  // Generate contextual suggestions based on the message content
  const getContextualSuggestions = () => {
    // Check which analysis was performed and suggest the other 3
    if (messageContent.toLowerCase().includes('engagement trends over time')) {
      return [
        {
          icon: <CompareIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Compare engagement with competitor",
        },
        {
          icon: <BarChartIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Show engagement breakdown by content type",
        },
        {
          icon: <MonetizationOnIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Analyze content performance by platform",
        }
      ];
    } else if (messageContent.toLowerCase().includes('competitor') || messageContent.toLowerCase().includes('compare engagement with competitor')) {
      return [
        {
          icon: <TrendingUpIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Analyze Engagement Trends Over Time",
        },
        {
          icon: <BarChartIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Show engagement breakdown by content type",
        },
        {
          icon: <MonetizationOnIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Analyze content performance by platform",
        }
      ];
    } else if (messageContent.toLowerCase().includes('content type') || messageContent.toLowerCase().includes('engagement breakdown')) {
      return [
        {
          icon: <TrendingUpIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Analyze Engagement Trends Over Time",
        },
        {
          icon: <CompareIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Compare engagement with competitor",
        },
        {
          icon: <MonetizationOnIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Analyze content performance by platform",
        }
      ];
    } else if (messageContent.toLowerCase().includes('content performance by platform') || messageContent.toLowerCase().includes('platform')) {
      return [
        {
          icon: <TrendingUpIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Analyze Engagement Trends Over Time",
        },
        {
          icon: <CompareIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Compare engagement with competitor",
        },
        {
          icon: <BarChartIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Show engagement breakdown by content type",
        }
      ];
    } else {
      // Default suggestions for other queries
      return [
        {
          icon: <TrendingUpIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Analyze Engagement Trends Over Time",
        },
        {
          icon: <CompareIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Compare engagement with competitor",
        },
        {
          icon: <BarChartIcon sx={{ fontSize: 20, color: 'primary.main' }} />,
          text: "Show engagement breakdown by content type",
        }
      ];
    }
  };

  const suggestions = getContextualSuggestions();

  return (
    <Box sx={{ mt: 3, p: 3, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}> {/* Made bigger with padding and background */}
      <Typography variant="body2" sx={{ color: '#475569', mb: 2, fontSize: '1rem', fontWeight: 600 }}> {/* Larger, more visible text */}
        💡 Continue exploring:
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap> {/* Increased spacing */}
        {suggestions.map((suggestion, index) => (
          <Chip
            key={index}
            icon={suggestion.icon}
            label={suggestion.text}
            variant="outlined"
            clickable
            onClick={() => onSuggestionClick(suggestion.text)}
            sx={{
              fontSize: '0.9rem', // Increased font size
              height: 'auto',
              py: 1.5, // Increased padding
              px: 2, // Increased padding
              borderColor: '#cbd5e1',
              bgcolor: '#ffffff',
              color: '#334155',
              fontWeight: 500,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', // Added subtle shadow
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: '#eff6ff',
                color: 'primary.main',
                transform: 'translateY(-1px)', // Subtle lift effect
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              },
              '& .MuiChip-icon': {
                fontSize: 20, // Larger icons
                ml: 0.5
              }
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};

const Analysis: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const hasAsked = messages.length > 0;

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, []);

  // Load messages when thread changes
  useEffect(() => {
    if (currentThread) {
      loadThreadMessages(currentThread.id);
    } else {
      setMessages([]);
    }
  }, [currentThread]);


  const loadThreads = async () => {
    try {
      const threadsData = await chatService.getThreads();
      setThreads(Array.isArray(threadsData) ? threadsData : []);
      // Set current thread to the most recent active thread if exists
      const activeThread = Array.isArray(threadsData) ? threadsData.find(t => t.is_active) : null;
      if (activeThread) {
        setCurrentThread(activeThread);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
      setThreads([]);
    }
  };

  const loadThreadMessages = async (threadId: string) => {
    try {
      const thread = await chatService.getThread(threadId);
      setMessages(thread.messages || []);
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      setMessages([]);
    }
  };

  const handleThreadSelect = async (thread: ChatThread) => {
    setCurrentThread(thread);
    setShowSuggestions(false);
  };

  const createNewThread = async () => {
    try {
      const newThread = await chatService.createThread();
      // Set a default title for new threads
      newThread.title = 'New Chat';
      setThreads(prev => [newThread, ...(Array.isArray(prev) ? prev : [])]);
      setCurrentThread(newThread);
      setMessages([]);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleDeleteThread = async (threadId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent thread selection when clicking delete
    
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      await chatService.deleteThread(threadId);
      // Remove thread from local state
      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      // If the deleted thread was current, clear current thread and messages
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
        setMessages([]);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // Function to parse and render a table from markdown-like text
  const renderTable = (tableText: string) => {
    const lines = tableText.trim().split('\n');
    if (lines.length < 3) return null; // Need at least header, separator, and one row
    
    // Parse header row
    const headers = lines[0].split('|').map(cell => cell.trim()).filter(cell => cell);
    
    // Skip separator row (line[1])
    
    // Parse data rows
    const rows = lines.slice(2).map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell)
    );
    
    return (
      <TableContainer component={Paper} sx={{ my: 2, boxShadow: 'none', border: '1px solid rgba(0,0,0,0.1)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
              {headers.map((header, index) => (
                <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Function to generate a chart description summary (MVP, static for now)
  const getChartDescription = () => (
    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
      <Typography component="span" sx={{ fontSize: '0.9rem', bgcolor: '#f1f5f9', px: 2, py: 0.75, borderRadius: 1, mr: 1 }}>
        Measuring <b>number of unique Users</b>
      </Typography>
      <Typography component="span" sx={{ fontSize: '0.9rem', bgcolor: '#f1f5f9', px: 2, py: 0.75, borderRadius: 1, mr: 1 }}>
        that perform <b>Any Active Event</b>
      </Typography>
      <Typography component="span" sx={{ fontSize: '0.9rem', bgcolor: '#f1f5f9', px: 2, py: 0.75, borderRadius: 1, mr: 1 }}>
        for <b>All Users</b>
      </Typography>
      <Typography component="span" sx={{ fontSize: '0.9rem', bgcolor: '#f1f5f9', px: 2, py: 0.75, borderRadius: 1, mr: 1 }}>
        grouped by <b>Country</b> <b>weekly</b>
      </Typography>
      <Typography component="span" sx={{ fontSize: '0.9rem', bgcolor: '#f1f5f9', px: 2, py: 0.75, borderRadius: 1 }}>
        over the <b>Last 12 weeks</b>
      </Typography>
    </Stack>
  );

  // Function to convert markdown-like text to formatted content
  const formatMessageText = (text: string, sender: string) => {
    // Check if the text contains a chart data
    const chartDataMatch = text.match(/```chart\n([\s\S]*?)\n```/);
    
    if (chartDataMatch) {
      try {
        const chartData = JSON.parse(chartDataMatch[1]);
        const beforeChart = text.substring(0, chartDataMatch.index);
        const afterChart = text.substring((chartDataMatch.index || 0) + chartDataMatch[0].length);
        return (
          <>
            {sender === 'ai' && (
              <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 1, fontWeight: 600 }}>
                Here's the chart you requested.
              </Typography>
            )}
            {renderFormattedText(beforeChart)}
            <ChatChart
              type={chartData.type}
              data={chartData.data}
              title={chartData.title}
              description={getChartDescription()}
            />
            {renderFormattedText(afterChart)}
          </>
        );
      } catch (error) {
        console.error('Failed to parse chart data:', error);
        return text;
      }
    }
    
    // Check if the text contains a table
    const tableRegex = /^([^|]+\|[^|]+\|.+\n)([-|]+\n)([^|]+\|[^|]+\|.+\n)+/m;
    const tableMatch = text.match(tableRegex);
    
    if (tableMatch) {
      // Split text into parts: before table, table, and after table
      const tableStart = tableMatch.index || 0;
      const tableEnd = tableStart + tableMatch[0].length;
      
      const beforeTable = text.substring(0, tableStart);
      const tableText = text.substring(tableStart, tableEnd);
      const afterTable = text.substring(tableEnd);
      
      return (
        <>
          {renderFormattedText(beforeTable)}
          {renderTable(tableText)}
          {renderFormattedText(afterTable)}
        </>
      );
    }
    
    // If no chart or table, format text normally with improved formatting
    return renderFormattedText(text);
  };

  // Helper function to render formatted text with markdown support
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, lineIndex) => (
      <React.Fragment key={lineIndex}>
        {line.trim().startsWith('##') ? (
          <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
            {line.trim().replace(/^##\s*/, '')}
          </Typography>
        ) : line.startsWith('**') && line.endsWith('**') ? (
          // Handle lines that are entirely bold (like section headers)
          <Typography component="div" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>
            {line.replace(/^\*\*(.*)\*\*$/, '$1')}
          </Typography>
        ) : (
          // Handle inline formatting within lines
          <Typography component="div" sx={{ mb: 0.5 }}>
            {renderInlineFormatting(line)}
          </Typography>
        )}
      </React.Fragment>
    ));
  };

  // Helper function to handle inline formatting like **bold**
  const renderInlineFormatting = (text: string) => {
    if (!text.trim()) return <br />;
    
    // Split by **bold** patterns while preserving the delimiters
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // This is bold text
        return (
          <Typography 
            key={index} 
            component="span" 
            sx={{ fontWeight: 700 }}
          >
            {part.slice(2, -2)}
          </Typography>
        );
      } else {
        // Regular text
        return part;
      }
    });
  };

  // Updated suggested questions with social media focus
  const suggestedQuestions = [
    {
      icon: <TrendingUpIcon sx={{ fontSize: 24, color: 'primary.main' }} />,
      text: "Analyze Engagement Trends Over Time",
      description: "Track how your social media engagement evolves across platforms"
    },
    {
      icon: <CompareIcon sx={{ fontSize: 24, color: 'primary.main' }} />,
      text: "Compare engagement with competitor",
      description: "Benchmark your performance against competitors"
    },
    {
      icon: <BarChartIcon sx={{ fontSize: 24, color: 'primary.main' }} />,
      text: "Show engagement breakdown by content type",
      description: "Analyze which content types drive the most engagement"
    },
    {
      icon: <MonetizationOnIcon sx={{ fontSize: 24, color: 'primary.main' }} />,
      text: "Analyze content performance by platform",
      description: "Compare how content performs across different social platforms"
    }
  ];

  // Handle sending a message
  const handleSendMessage = async () => {
    if (input.trim() === '' || !currentThread) return;
    
    try {
      setIsLoading(true);
      setShowSuggestions(false);
      
      const inputContent = input;
      setInput(''); // Clear input immediately for better UX
      
      // Add message and get AI response
      const result = await chatService.addMessage(currentThread.id, inputContent, 'user');
      
      // Handle the response which includes both user and AI messages
      if ('user_message' in result && 'ai_message' in result) {
        setMessages(prev => [...prev, result.user_message!, result.ai_message!]);
      } else {
        // Fallback for single message response
        setMessages(prev => [...prev, result as Message]);
      }
      
      // Refresh current thread to get latest state
      try {
        const updatedThread = await chatService.getThread(currentThread.id);
        setCurrentThread(updatedThread);
      } catch (refreshError) {
        console.warn('Failed to refresh thread state:', refreshError);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        is_error: true
      };
      setMessages(prev => [...prev, errorMessage]);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle clicking a suggested question
  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  // Handle clicking a follow-up suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const toggleSuggestions = () => {
    setShowSuggestions(!showSuggestions);
  };

  // Component to show data context for AI responses
  const DataContextDisplay: React.FC<{ dataContext: any }> = ({ dataContext }) => {
    if (!dataContext) return null;

    return (
      <Box sx={{ 
        mt: 1, 
        p: 2, 
        bgcolor: '#f8fafc', 
        borderRadius: 1, 
        border: '1px solid #e2e8f0',
        fontSize: '0.85rem'
      }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}>
          📊 Analysis based on your data:
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Chip 
            size="small" 
            label={`${dataContext.total_posts_analyzed?.toLocaleString() || 0} posts analyzed`}
            sx={{ fontSize: '0.75rem', height: 'auto', py: 0.5 }}
          />
          {dataContext.platforms_covered && dataContext.platforms_covered.length > 0 && (
            <Chip 
              size="small" 
              label={`${dataContext.platforms_covered.length} platforms: ${dataContext.platforms_covered.join(', ')}`}
              sx={{ fontSize: '0.75rem', height: 'auto', py: 0.5 }}
            />
          )}
          {dataContext.total_engagement && (
            <Chip 
              size="small" 
              label={`${dataContext.total_engagement.toLocaleString()} total engagement`}
              sx={{ fontSize: '0.75rem', height: 'auto', py: 0.5 }}
            />
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: 270,
          bgcolor: '#fff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          p: 0,
          minHeight: '100vh',
          height: '100vh',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
            Ask Track Futura
          </Typography>
          <Button
            variant="contained"
            onClick={createNewThread}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              width: '100%',
              mb: 2,
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            + New Chat
          </Button>
        </Box>
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto', minHeight: 0 }}>
          <Stack spacing={2}>
            <Typography variant="overline" sx={{ color: '#64748b', letterSpacing: 1 }}>
              Today
            </Typography>
            {threads.map((thread) => (
              <Box
                key={thread.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: currentThread?.id === thread.id ? '#f1f5f9' : 'transparent',
                  '&:hover': { 
                    bgcolor: '#f1f5f9',
                    '& .delete-button': { opacity: 1 }
                  }
                }}
              >
                <Button
                  variant="text"
                  onClick={() => handleThreadSelect(thread)}
                  sx={{
                    flex: 1,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    textTransform: 'none',
                    color: '#1e293b',
                    minWidth: 0,
                    p: 0
                  }}
                >
                  <Typography noWrap sx={{ fontSize: '0.875rem' }}>
                    {thread.title || (thread.last_message?.content ? thread.last_message.content.split('\n')[0].substring(0, 35) + '...' : null) || 'New Chat'}
                  </Typography>
                </Button>
                <IconButton
                  className="delete-button"
                  size="small"
                  onClick={(event) => handleDeleteThread(thread.id, event)}
                  sx={{
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    color: '#64748b',
                    '&:hover': { 
                      color: '#ef4444',
                      bgcolor: 'rgba(239, 68, 68, 0.1)'
                    }
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Main content area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative', 
        height: '100vh', 
        minHeight: 0,
        width: 'calc(100% - 270px)', // Add fixed width based on sidebar
        transition: 'width 0.2s ease-in-out' // Add smooth transition
      }}>
        {/* Initial view with suggestions */}
        {!hasAsked && showSuggestions && (
          <>
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 4 }}>
                What do you want to learn today?
              </Typography>
              <Box sx={{ maxWidth: 800, mx: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                {suggestedQuestions.map((question, index) => (
                  <Paper
                    key={index}
                    onClick={() => handleSuggestedQuestion(question.text)}
                    sx={{
                      p: 3,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    {question.icon}
                    <Typography variant="h6" sx={{ mt: 2, mb: 1, color: '#1e293b', fontWeight: 600 }}>
                      {question.text}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {question.description}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          </>
        )}
        {/* Chat area */}
        {(hasAsked || !showSuggestions) && (
          <Box sx={{ 
            width: '100%', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            pt: 8, 
            pb: 0, 
            minHeight: 0,
            position: 'relative' // Add position relative
          }}>
            {/* Messages - scrollable area */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                pb: 2,
                minHeight: 0,
                maxHeight: 'calc(100vh - 110px - 48px)',
                width: '100%', // Ensure full width
                position: 'relative' // Add position relative
              }}
            >
              <Box sx={{ 
                width: '100%', 
                maxWidth: 1200, // Reduced from 1400px to lessen horizontal space
                mx: 'auto',
                px: 4 // Increased padding for better spacing
              }}>
                {messages.map((message) => (
                  <Fade in={true} key={message.id}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                        gap: 2,
                        maxWidth: '100%',
                        alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                        mb: 3
                      }}
                    >
                      {/* User avatar only for user messages */}
                      {message.sender === 'user' && (
                        <Avatar
                          sx={{
                            width: 36, // Increased from 32px
                            height: 36, // Increased from 32px
                            bgcolor: 'primary.main',
                            color: 'white'
                          }}
                        >
                          <PersonIcon />
                        </Avatar>
                      )}
                      <Box sx={{ flex: 1, maxWidth: message.sender === 'ai' ? 1100 : 700 }}> {/* Reduced AI max width from 1300 to 1100 */}
                        {/* Remove Paper for AI, keep for user */}
                        {message.sender === 'user' ? (
                          <Paper
                            elevation={0}
                            sx={{
                              p: 2.5, // Increased padding
                              borderRadius: 2,
                              bgcolor: '#f1f5f9', // Changed from blue to light gray
                              color: '#1e293b', // Changed from white to dark text
                              border: '1px solid #e2e8f0', // Added subtle border
                              fontSize: '1.1rem', // Increased from 1rem
                              lineHeight: 1.7
                            }}
                          >
                            {message.content}
                          </Paper>
                        ) : (
                          <Box
                            sx={{
                              fontSize: '1.05rem', // Reduced from 1.15rem to lower by 1 level
                              lineHeight: 1.8,
                              color: '#1e293b',
                              px: 0,
                              py: 0.5,
                              background: 'none',
                              borderRadius: 0,
                              fontWeight: 400
                            }}
                          >
                            {formatMessageText(message.content, message.sender)}
                            {/* Add data context display for AI messages */}
                            {message.sender === 'ai' && message.data_context && (
                              <DataContextDisplay dataContext={message.data_context} />
                            )}
                            {/* Add follow-up suggestions for AI messages */}
                            {message.sender === 'ai' && (
                              <FollowUpSuggestions onSuggestionClick={handleSuggestionClick} messageContent={message.content} />
                            )}
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5, textAlign: message.sender === 'user' ? 'right' : 'left', fontSize: '0.8rem' }}> {/* Increased caption font size */}
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                ))}
                {isLoading && (
                  <Box sx={{ display: 'flex', gap: 2, maxWidth: '80%' }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: '#f1f5f9', color: 'primary.main' }}> {/* Increased avatar size */}
                      <SmartToyIcon />
                    </Avatar>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5, // Increased padding
                        borderRadius: 2,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <CircularProgress size={18} sx={{ color: 'primary.main' }} /> {/* Increased from 16 */}
                      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.95rem' }}> {/* Increased font size */}
                        Analyzing...
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}
        {/* Input bar at the bottom */}
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, bgcolor: 'transparent', zIndex: 10, px: 0, pb: 3 }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', px: 4 }}>
            <Paper elevation={2} sx={{ borderRadius: 99, px: 3, py: 1.5, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  placeholder="Ask a question"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  variant="standard"
                  InputProps={{
                    disableUnderline: true,
                    sx: { fontSize: '1.1rem', pl: 1, bgcolor: 'transparent' }
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={input.trim() === '' || isLoading || !currentThread}
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    ml: 1,
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: '#94a3b8', color: 'white' },
                    width: 42,
                    height: 42
                  }}
                >
                  <SendIcon sx={{ fontSize: 22 }} />
                </IconButton>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Analysis;