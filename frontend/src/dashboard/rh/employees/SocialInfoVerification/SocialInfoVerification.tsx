import React, { useState, useEffect } from 'react';
import { usePendingChanges, useVerificationActions } from '../../../../hooks/useVerification';
import { ChangeItemCard } from './ChangeItemCard';
import { SocialStatusProof, Child } from '../../../../api/familyInfo';

interface SocialInfoVerificationProps {
  employeeId?: number;
}

export const SocialInfoVerification: React.FC<SocialInfoVerificationProps> = ({ employeeId }) => {
  const [activeTab, setActiveTab] = useState<'social' | 'children'>('social');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: 'social' | 'child' } | null>(null);

  const { socialStatusChanges, childrenChanges, loading, error, loadPendingChanges } = usePendingChanges(employeeId);
  const {
    verifySocialStatusChange,
    rejectSocialStatusChange,
    verifyChildChange,
    rejectChildChange,
    loading: actionLoading,
  } = useVerificationActions();

  useEffect(() => {
    loadPendingChanges();
  }, [loadPendingChanges]);

  const handleVerify = async (id: number, type: 'social' | 'child') => {
    let success = false;
    if (type === 'social') {
      success = await verifySocialStatusChange(id);
    } else {
      success = await verifyChildChange(id);
    }

    if (success) {
      loadPendingChanges();
    }
  };

  const handleRejectClick = (id: number, type: 'social' | 'child') => {
    setSelectedItem({ id, type });
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedItem || !rejectReason.trim()) return;

    let success = false;
    if (selectedItem.type === 'social') {
      success = await rejectSocialStatusChange(selectedItem.id, rejectReason);
    } else {
      success = await rejectChildChange(selectedItem.id, rejectReason);
    }

    if (success) {
      loadPendingChanges();
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedItem(null);
    }
  };

  const renderSocialStatusChanges = () => {
    if (socialStatusChanges.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No pending social status changes
        </div>
      );
    }

    return socialStatusChanges.map((change: SocialStatusProof) => (
      <ChangeItemCard
        key={change.id}
        title={`${change.utilisateur?.nom} ${change.utilisateur?.prenom}`}
        subtitle={`Status change: ${change.social_status}`}
        status={change.status}
        documentPath={change.document_path}
        onVerify={() => handleVerify(change.id, 'social')}
        onReject={() => handleRejectClick(change.id, 'social')}
        loading={actionLoading}
      />
    ));
  };

  const renderChildrenChanges = () => {
    if (childrenChanges.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No pending children changes
        </div>
      );
    }

    return childrenChanges.map((change: Child) => (
      <ChangeItemCard
        key={change.id}
        title={`${change.utilisateur?.nom} ${change.utilisateur?.prenom}`}
        subtitle={`Child: ${change.prenom} ${change.nom} (${change.status})`}
        documentPath={change.document_path}
        onVerify={() => handleVerify(change.id, 'child')}
        onReject={() => handleRejectClick(change.id, 'child')}
        loading={actionLoading}
      />
    ));
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Social Info Verification</h2>
        <button
          onClick={loadPendingChanges}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'social'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Social Status Changes ({socialStatusChanges.length})
        </button>
        <button
          onClick={() => setActiveTab('children')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'children'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Children Changes ({childrenChanges.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <>
          {activeTab === 'social' ? renderSocialStatusChanges() : renderChildrenChanges()}
        </>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Change</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full p-3 border border-gray-300 rounded-md mb-4 h-32 resize-none"
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedItem(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
