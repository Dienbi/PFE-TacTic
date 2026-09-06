import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import Sidebar from '../../../shared/components/Sidebar';
import Navbar from '../../../shared/components/Navbar';
import { RoleProfileChatbot } from '../../../components/role-profile/RoleProfileChatbot';
import { ChevronRight, Home, Briefcase } from 'lucide-react';

const RoleProfileChatbotPage: React.FC = () => {
  const { user, displayName } = useAuth();

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 pt-[90px] max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
            <a href="/" className="hover:text-gray-900 flex items-center">
              <Home className="w-4 h-4" />
            </a>
            <ChevronRight className="w-4 h-4" />
            <a href="/payroll" className="hover:text-gray-900">Payroll</a>
            <ChevronRight className="w-4 h-4" />
            <a href="/payroll/role-profiles" className="hover:text-gray-900 flex items-center">
              <Briefcase className="w-4 h-4 mr-1" />
              Role Profiles
            </a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">AI Assistant</span>
          </nav>

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Role Profile AI Assistant</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage role profiles using natural language commands
            </p>
          </div>

          {/* Chatbot */}
          <div className="h-[600px]">
            <RoleProfileChatbot />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleProfileChatbotPage;
