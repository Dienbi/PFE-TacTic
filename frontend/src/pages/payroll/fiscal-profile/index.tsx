import React, { useState } from 'react';
import Sidebar from '../../../shared/components/Sidebar';
import Navbar from '../../../shared/components/Navbar';
import { useAuth } from '../../../hooks/useAuth';
import { FiscalProfileGroups } from '../../../components/fiscal-profile/FiscalProfileGroups';
import { AiChatbot } from '../../../components/fiscal-profile/AiChatbot';
import Button from '../../../shared/components/ui/Button';
import PayrollGuideButton from '../../../guide/PayrollGuideButton';
import { Layers, Bot } from 'lucide-react';

const NAVY = '#1E2258';

type ProfileTab = 'groups' | 'chatbot';

export default function FiscalProfilePage() {
  const { user, displayName } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('groups');

  const tabItems: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'groups', label: 'Fiscal Profile Groups', icon: <Layers className="w-4 h-4" /> },
    { id: 'chatbot', label: 'AI Assistant', icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 pt-[90px] max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-6" data-tour="fiscal-profile-overview">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-2xl font-semibold text-gray-900 text-left">Fiscal Profile Management</h1>
              <p className="text-sm text-gray-600 mt-1 text-left">
                Manage employee fiscal profiles and AI-assisted operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <PayrollGuideButton />
            </div>
          </div>

          {/* Agenda-style tab bar (matches FiscalRulesManagement) */}
          <div
            className="flex items-center gap-2 p-1.5 rounded-xl mb-6 w-fit"
            style={{ backgroundColor: `${NAVY}0D`, border: `1px solid ${NAVY}20` }}
          >
            {tabItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={
                    isActive
                      ? { backgroundColor: NAVY, color: '#fff', boxShadow: '0 1px 3px rgba(30,34,88,0.35)' }
                      : { backgroundColor: 'transparent', color: NAVY }
                  }
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
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