import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, GitCommit, Lock, Unlock, 
         Send, UserPlus, Settings, AlertCircle, CheckCircle, 
         X, Menu, ChevronDown, ChevronUp, Map } from 'lucide-react';

const CollaborativeEditingInterface = () => {
  // State for panels visibility
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showChanges, setShowChanges] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Mock data for demonstration
  const activeUsers = [
    { userId: 'user-456', name: 'Alice Cooper', color: '#FF0000', permission: 'admin', isOwner: true },
    { userId: 'user-789', name: 'Bob Johnson', color: '#00FF00', permission: 'editor', isOwner: false }
  ];
  
  const messages = [
    { id: 'msg1', userId: 'user-456', timestamp: new Date(Date.now() - 60000), type: 'chat', content: 'Hi everyone! I just added a new sound to the fountain area.' },
    { id: 'msg2', userId: 'system', timestamp: new Date(Date.now() - 30000), type: 'system', content: 'Bob Johnson joined the session' },
    { id: 'msg3', userId: 'user-789', timestamp: new Date(Date.now() - 15000), type: 'chat', content: 'I love what you did with the central plaza audio!' }
  ];
  
  const changes = [
    { id: 'change1', userId: 'user-456', timestamp: new Date(Date.now() - 120000), changeType: 'addBoundary', targetId: 'boundary-1', status: 'applied' },
    { id: 'change2', userId: 'user-789', timestamp: new Date(Date.now() - 90000), changeType: 'updateAudio', targetId: 'audio-1', status: 'applied' }
  ];
  
  // UI state
  const [chatMessage, setChatMessage] = useState('');
  const [notification, setNotification] = useState(null);
  const chatContainerRef = useRef(null);
  
  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };
  
  // Send a chat message
  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    showNotification('Message sent', 'success');
    setChatMessage('');
  };
  
  // Render user avatar with color
  const renderUserAvatar = (user) => (
    <div 
      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
      style={{ backgroundColor: user.color || '#CCCCCC' }}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg w-80 md:w-96 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 dark:bg-blue-800 p-3 text-white flex items-center justify-between">
        <h3 className="font-semibold text-lg">Collaborative Editing</h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-1 rounded hover:bg-blue-700"
          >
            <Menu size={18} />
          </button>
          <button
            onClick={() => showNotification('Closing collaboration panel', 'info')}
            className="p-1 rounded hover:bg-blue-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <button
            className="w-full py-2 px-3 text-left text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={() => {
              setShowCollaborators(true);
              setShowChat(false);
              setShowChanges(false);
              setShowMobileMenu(false);
            }}
          >
            <Users size={16} className="inline mr-2" />
            Collaborators
          </button>
          <button
            className="w-full py-2 px-3 text-left text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={() => {
              setShowCollaborators(false);
              setShowChat(true);
              setShowChanges(false);
              setShowMobileMenu(false);
            }}
          >
            <MessageSquare size={16} className="inline mr-2" />
            Chat
          </button>
          <button
            className="w-full py-2 px-3 text-left text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={() => {
              setShowCollaborators(false);
              setShowChat(false);
              setShowChanges(true);
              setShowMobileMenu(false);
            }}
          >
            <GitCommit size={16} className="inline mr-2" />
            Changes
          </button>
        </div>
      )}
      
      {/* Notification */}
      {notification && (
        <div className={`p-2 text-sm ${
          notification.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          notification.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        } flex items-start`}>
          {notification.type === 'error' && <AlertCircle size={16} className="mr-1 flex-shrink-0 mt-0.5" />}
          {notification.type === 'success' && <CheckCircle size={16} className="mr-1 flex-shrink-0 mt-0.5" />}
          <span>{notification.message}</span>
        </div>
      )}
      
      {/* Connection status */}
      <div className="px-3 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <span>Connected to session: Washington Square Park Composition</span>
      </div>
      
      {/* Content area */}
      <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700 h-96 md:h-80 overflow-hidden">
        {/* Collaborators panel */}
        {showCollaborators && (
          <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-gray-800 min-h-16">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm">
                Collaborators ({activeUsers.length})
              </h4>
              <button
                onClick={() => showNotification('Invite feature would open here', 'info')}
                className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 rounded flex items-center"
              >
                <UserPlus size={12} className="mr-1" />
                Invite
              </button>
            </div>
            
            <div className="space-y-2">
              {activeUsers.map(user => (
                <div key={user.userId} className="flex items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  {renderUserAvatar(user)}
                  <div className="ml-2 flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="font-medium text-sm truncate">{user.name}</span>
                      {user.isOwner && (
                        <span className="ml-1 px-1 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                          Owner
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.permission}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Chat panel */}
        {showChat && (
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 min-h-16">
            <div className="flex-1 overflow-y-auto p-2" ref={chatContainerRef}>
              <div className="space-y-3">
                {messages.map((message) => {
                  // Find user info
                  const sender = message.userId === 'system' 
                    ? { name: 'System', color: '#888888' } 
                    : activeUsers.find(u => u.userId === message.userId) || 
                      { name: 'Unknown User', color: '#CCCCCC' };
                  
                  // System messages
                  if (message.type === 'system') {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400">
                          {message.content}
                        </div>
                      </div>
                    );
                  }
                  
                  // Regular chat messages
                  return (
                    <div key={message.id} className="flex items-start">
                      {renderUserAvatar(sender)}
                      <div className="ml-2 max-w-[85%]">
                        <div className="flex items-baseline">
                          <span className="font-medium text-sm mr-2">{sender.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 py-2 px-3 text-sm bg-white dark:bg-gray-800 border-none focus:outline-none"
                />
                <button
                  onClick={sendChatMessage}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Changes panel */}
        {showChanges && (
          <div className="flex-1 overflow-y-auto p-2 bg-white dark:bg-gray-800 min-h-16">
            <h4 className="font-medium text-sm mb-2">Recent Changes</h4>
            
            <div className="space-y-2">
              {changes.map((change) => {
                // Find user info
                const author = activeUsers.find(u => u.userId === change.userId) || 
                  { name: 'Unknown User', color: '#CCCCCC' };
                
                // Format change type
                const changeType = change.changeType.replace(/([A-Z])/g, ' $1')
                  .toLowerCase().replace(/^./, str => str.toUpperCase());
                
                return (
                  <div key={change.id} className="p-2 rounded border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        {renderUserAvatar(author)}
                        <div className="ml-2">
                          <div className="text-sm font-medium">{author.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(change.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {change.status}
                      </div>
                    </div>
                    
                    <div className="mt-1 text-sm">
                      {changeType} - {change.targetId}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer with tabs - visible on desktop */}
      <div className="md:flex hidden border-t border-gray-200 dark:border-gray-700">
        <button
          className={`flex-1 py-2 text-sm flex justify-center items-center ${
            showCollaborators 
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => setShowCollaborators(!showCollaborators)}
        >
          <Users size={16} className="mr-1" />
          Collaborators
        </button>
        <button
          className={`flex-1 py-2 text-sm flex justify-center items-center ${
            showChat 
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare size={16} className="mr-1" />
          Chat
        </button>
        <button
          className={`flex-1 py-2 text-sm flex justify-center items-center ${
            showChanges 
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={() => setShowChanges(!showChanges)}
        >
          <GitCommit size={16} className="mr-1" />
          Changes
        </button>
        <button
          className="py-2 px-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => showNotification('Settings would open here', 'info')}
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};

export default CollaborativeEditingInterface;
