import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Check, X as XIcon, Plus, Search, MessageSquare } from 'lucide-react';
import { roleProfileChatbotApi, ChatMessage } from '../../api/roleProfileChatbot';
import { roleProfileApi } from '../../api/fiscalProfile';
import apiClient from '../../api/client';

const NAVY = '#1E2258';

interface RoleProfileChatbotProps {
  className?: string;
}

export const RoleProfileChatbot: React.FC<RoleProfileChatbotProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('roleProfileChatbotConversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }
    
    // Load current conversation if exists
    const savedCurrentId = localStorage.getItem('roleProfileChatbotCurrentId');
    if (savedCurrentId) {
      setCurrentConversationId(savedCurrentId);
      const conv = JSON.parse(savedConversations || '[]').find((c: any) => c.id === savedCurrentId);
      if (conv) {
        setMessages(conv.messages);
      }
    } else {
      // Start new conversation with welcome message
      startNewConversation();
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('roleProfileChatbotConversations', JSON.stringify(conversations));
  }, [conversations]);

  // Save current conversation ID
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('roleProfileChatbotCurrentId', currentConversationId);
    }
  }, [currentConversationId]);

  const startNewConversation = () => {
    const newId = 'conv-' + Date.now();
    const welcomeMessage: ChatMessage = {
      role: 'ai',
      content: 'Hello! I can help you manage role profiles. Here are some things you can ask:\n\n'
        + '- "Create a role profile for full-time employees with 40 hours"\n'
        + '- "Create a developer role with hourly salary and overtime"\n'
        + '- "Assign John to the manager role profile"\n'
        + '- "Reassign Ahmed from developer to senior developer"\n'
        + '- "Show all employees with the manager role profile"\n'
        + '- "List employees in the developer profile"',
    };
    
    const newConversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      messages: [welcomeMessage]
    };
    
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newId);
    setMessages([welcomeMessage]);
    setShowConversationList(false);
  };

  const loadConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setCurrentConversationId(id);
      setMessages(conv.messages);
      setShowConversationList(false);
    }
  };

  const updateCurrentConversation = (newMessages: ChatMessage[]) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? { ...conv, messages: newMessages, title: generateConversationTitle(newMessages) }
          : conv
      )
    );
  };

  const generateConversationTitle = (msgs: ChatMessage[]): string => {
    const firstUserMessage = msgs.find((m) => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
    }
    return 'New Conversation';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateCurrentConversation(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await roleProfileChatbotApi.sendMessage({
        message: input,
        session_id: currentConversationId || 'new',
      });

      const aiMessage: ChatMessage = {
        role: 'ai',
        content: response.ai_message.content,
        proposed_action: response.ai_message.proposed_action,
      };

      console.log('AI response:', response);
      console.log('AI proposed action:', response.ai_message.proposed_action);
      console.log('Requires confirmation:', response.ai_message.proposed_action?.requires_confirmation);

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      updateCurrentConversation(updatedMessages);

      if (response.ai_message.proposed_action?.requires_confirmation) {
        console.log('Setting pending action');
        setPendingAction(response.ai_message.proposed_action);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      updateCurrentConversation(updatedMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (action?: any) => {
    const actionToExecute = action || pendingAction;
    
    console.log('handleConfirmAction called');
    console.log('actionToExecute:', actionToExecute);
    
    if (!actionToExecute) {
      console.log('No action to execute, returning');
      return;
    }

    const confirmMessage: ChatMessage = {
      role: 'user',
      content: 'Yes, proceed',
    };

    let newMessages = [...messages, confirmMessage];
    setMessages(newMessages);
    updateCurrentConversation(newMessages);
    setPendingAction(null);

    try {
      console.log('Executing action type:', actionToExecute.type);
      // Execute the actual action based on type
      let success = false;
      let resultMessage = '';

      if (actionToExecute.type === 'create_profile') {
        const params = actionToExecute.params;
        try {
          console.log('Creating role profile with params:', params);
          const response = await roleProfileApi.createRoleProfile({
            name: params.name || 'Untitled Profile',
            horaire_type: params.horaire_type || 'fixed',
            salary_type: params.salary_type || 'fixed_monthly',
            weekly_hours: params.weekly_hours || 40,
            overtime_eligible: params.overtime_eligible !== undefined ? params.overtime_eligible : false,
            overtime_rate_multiplier: params.overtime_rate_multiplier || 1.5,
            base_salary_min: params.base_salary_min,
            base_salary_max: params.base_salary_max,
            cnss_regime: params.cnss_regime,
          });
          console.log('Profile created successfully:', response.data);
          success = true;
          resultMessage = `Role profile "${params.name || 'Untitled'}" created successfully!`;
        } catch (error: any) {
          console.error('Failed to create role profile:', error);
          const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
          resultMessage = `Failed to create role profile: ${errorMsg}`;
        }
      } else if (actionToExecute.type === 'assign_profile') {
        try {
          const employeeIdentifier = actionToExecute.employee_identifier;
          const profileName = actionToExecute.role_profile_name;
          const effectiveFrom = actionToExecute.effective_from || new Date().toISOString().split('T')[0];
          
          console.log('Assigning employee:', employeeIdentifier, 'to profile:', profileName);
          
          // Search for the role profile by name
          const profilesResponse = await roleProfileApi.searchRoleProfiles(profileName);
          const profiles = profilesResponse.data;
          if (!profiles || profiles.length === 0) {
            resultMessage = `Role profile "${profileName}" not found. Please check the name and try again.`;
          } else {
            const profile = profiles[0];
            const profileId = profile.id;
            
            // Search for employee by name or matricule
            const employeesResponse = await roleProfileApi.getAllEmployees();
            const employees = employeesResponse.data;
            const employee = employees.find((emp: any) => {
              const fullName = `${emp.nom} ${emp.prenom}`.toLowerCase();
              const reversedName = `${emp.prenom} ${emp.nom}`.toLowerCase();
              const searchLower = employeeIdentifier.toLowerCase();
              return emp.matricule.toLowerCase() === searchLower ||
                     fullName.includes(searchLower) ||
                     reversedName.includes(searchLower) ||
                     emp.email?.toLowerCase().includes(searchLower);
            });
            
            if (!employee) {
              resultMessage = `Employee "${employeeIdentifier}" not found. Please check the name or matricule and try again.`;
            } else {
              // Perform the assignment
              await roleProfileApi.assignRole(employee.id, {
                role_profile_id: profileId,
                effective_from: effectiveFrom,
              });
              success = true;
              resultMessage = `Successfully assigned ${employee.nom} ${employee.prenom} (${employee.matricule}) to the "${profile.name}" role profile.`;
            }
          }
        } catch (error: any) {
          console.error('Failed to assign employee:', error);
          const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
          resultMessage = `Failed to assign employee: ${errorMsg}`;
        }
      } else if (actionToExecute.type === 'reassign_profile') {
        resultMessage = 'Reassignment feature requires employee and profile resolution. Please use the role profile management page for reassignments.';
      } else {
        resultMessage = 'Action confirmed. Please use the role profile management page to complete this action.';
      }

      const aiMessage: ChatMessage = {
        role: 'ai',
        content: resultMessage,
      };

      newMessages = [...newMessages, aiMessage];
      setMessages(newMessages);
      updateCurrentConversation(newMessages);
    } catch (error) {
      console.error('Error in handleConfirmAction:', error);
      const errorMessage: ChatMessage = {
        role: 'ai',
        content: 'Error executing action. Please try again.',
      };
      newMessages = [...newMessages, errorMessage];
      setMessages(newMessages);
      updateCurrentConversation(newMessages);
    }
  };

  const handleRejectAction = () => {
    const rejectMessage: ChatMessage = {
      role: 'user',
      content: 'No, cancel',
    };

    const newMessages = [...messages, rejectMessage];
    setMessages(newMessages);
    updateCurrentConversation(newMessages);
    setPendingAction(null);

    const aiMessage: ChatMessage = {
      role: 'ai',
      content: 'Action cancelled. How else can I help you with role profile management?',
    };

    const updatedMessages = [...newMessages, aiMessage];
    setMessages(updatedMessages);
    updateCurrentConversation(updatedMessages);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex h-full bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Conversation Sidebar */}
      <div className={`w-64 border-r border-gray-200 flex flex-col ${showConversationList ? 'block' : 'hidden'} md:block`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Conversations</h3>
            <button
              onClick={startNewConversation}
              className="p-1.5 rounded-lg bg-[#1E2258] text-white hover:bg-[#1E2258]/90 transition-colors"
              title="New conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No conversations found</div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  currentConversationId === conv.id ? 'bg-blue-50 border-l-4 border-l-[#1E2258]' : ''
                }`}
              >
                <div className="font-medium text-sm text-gray-900 truncate">{conv.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(conv.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConversationList(!showConversationList)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <MessageSquare className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="font-semibold text-gray-900">Role Profile AI Assistant</h3>
          </div>
          <button
            onClick={startNewConversation}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div key={index}>
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#1E2258] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                </div>
              </div>
              
              {/* Inline action buttons for AI messages with proposed actions */}
              {message.role === 'ai' && message.proposed_action && (
                <div className="flex gap-2 mt-2 ml-2">
                  <button
                    onClick={() => {
                      setPendingAction(message.proposed_action);
                      handleConfirmAction();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={handleRejectAction}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <XIcon className="w-4 h-4" />
                    Refuse
                  </button>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about role profiles..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-[#1E2258] text-white rounded-lg hover:bg-[#1E2258]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
