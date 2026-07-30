import React, { useState, useEffect } from 'react';
import { SocialStatusProof, Child } from '../../../../api/familyInfo';
import client from '../../../../api/client';
import { Users, FileText, Calendar, AlertCircle } from 'lucide-react';

interface SocialInfoDisplayProps {
  employeeId: number;
}

export const SocialInfoDisplay: React.FC<SocialInfoDisplayProps> = ({ employeeId }) => {
  const [socialStatusHistory, setSocialStatusHistory] = useState<SocialStatusProof[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSocialInfo();
  }, [employeeId]);

  const loadSocialInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.get(`/utilisateurs/${employeeId}/social-info`);
      setSocialStatusHistory(response.data.social_status || []);
      setChildren(response.data.children || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load social information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'single': return 'Single';
      case 'married': return 'Married';
      case 'divorced': return 'Divorced';
      case 'widowed': return 'Widowed';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'single': return 'bg-gray-100 text-gray-800';
      case 'married': return 'bg-pink-100 text-pink-800';
      case 'divorced': return 'bg-orange-100 text-orange-800';
      case 'widowed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatusColor = (status?: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getChildStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'disabled': return 'Disabled';
      case 'university': return 'University Student';
      default: return status;
    }
  };

  const getChildStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'disabled': return 'bg-yellow-100 text-yellow-800';
      case 'university': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      </div>
    );
  }

  const latestStatus = socialStatusHistory[0];

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Social Information</h2>
      </div>

      {/* Social Status Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} />
          Social Status
        </h3>

        {latestStatus ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <span
                className={`px-3 py-1 rounded-full font-medium ${getStatusColor(latestStatus.social_status)}`}
              >
                {getStatusLabel(latestStatus.social_status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVerificationStatusColor(latestStatus.status)}`}>
                {latestStatus.status ? latestStatus.status.charAt(0).toUpperCase() + latestStatus.status.slice(1) : 'Unknown'}
              </span>
            </div>

            {latestStatus.document_path && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText size={16} />
                <span>Document uploaded on {new Date(latestStatus.created_at).toLocaleDateString()}</span>
              </div>
            )}

            {latestStatus.rejection_reason && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>Rejection Reason:</strong> {latestStatus.rejection_reason}
                </p>
              </div>
            )}

            {socialStatusHistory.length > 1 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Status History</h4>
                <div className="space-y-2">
                  {socialStatusHistory.slice(1).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full ${getStatusColor(record.social_status)}`}>
                          {getStatusLabel(record.social_status)}
                        </span>
                        <span className="text-gray-500">
                          {new Date(record.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getVerificationStatusColor(record.status)}`}>
                        {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">No social status information available</div>
        )}
      </div>

      {/* Children Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} />
          Children Information
        </h3>

        {children.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No children information available</div>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="p-4 bg-gray-50 rounded-md border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {child.prenom} {child.nom}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Calendar size={14} />
                      <span>Born: {new Date(child.date_naissance).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChildStatusColor(child.status)}`}>
                      {getChildStatusLabel(child.status)}
                    </span>
                    {child.verified && (
                      <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                    )}
                    {child.rejected && (
                      <span className="text-xs text-red-600 font-medium">✕ Rejected</span>
                    )}
                    {!child.verified && !child.rejected && (
                      <span className="text-xs text-yellow-600 font-medium">⏳ Pending</span>
                    )}
                  </div>
                </div>

                {child.document_path && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <FileText size={16} />
                    <span>Document uploaded</span>
                  </div>
                )}

                {child.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-800">
                      <strong>Rejection Reason:</strong> {child.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
