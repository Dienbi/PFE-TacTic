import React, { useState } from 'react';
import Sidebar from '../../../shared/components/Sidebar';
import Navbar from '../../../shared/components/Navbar';
import { useAuth } from '../../../hooks/useAuth';
import { ChangeRequestForm } from '../../../components/fiscal-profile/ChangeRequestForm';
import { ChangeRequestReview } from '../../../components/fiscal-profile/ChangeRequestReview';
import { FiscalProfileGroups } from '../../../components/fiscal-profile/FiscalProfileGroups';
import { AiChatbot } from '../../../components/fiscal-profile/AiChatbot';
import Button from '../../../shared/components/ui/Button';

export default function FiscalProfilePage() {
  const { user, displayName } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'groups' | 'chatbot'>('requests');
  const [showRequestForm, setShowRequestForm] = useState(false);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Fiscal Profile Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage employee fiscal profiles, change requests, and AI-assisted operations</p>
            <Button onClick={() => setShowRequestForm(true)}>
              + Submit Change Request
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Change Requests
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'groups'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Fiscal Profile Groups
              </button>
              <button
                onClick={() => setActiveTab('chatbot')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'chatbot'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                AI Assistant
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {showRequestForm && (
                <ChangeRequestForm
                  onSuccess={() => setShowRequestForm(false)}
                  onCancel={() => setShowRequestForm(false)}
                />
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-3">Pending Requests</h3>
                  <ChangeRequestReview status="pending" />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-3">Approved Requests</h3>
                  <ChangeRequestReview status="approved" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'groups' && <FiscalProfileGroups />}

          {activeTab === 'chatbot' && (
            <div className="h-[600px]">
              <AiChatbot />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
