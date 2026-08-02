import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { SocialStatusProof, getSocialStatusHistory, updateSocialStatus, CreateSocialStatusRequest } from '../../api/familyInfo';

interface SocialStatusManagerProps {
  currentStatus?: string;
  readonly?: boolean;
}

const SocialStatusManager: React.FC<SocialStatusManagerProps> = ({ currentStatus, readonly = false }) => {
  const [history, setHistory] = useState<SocialStatusProof[]>([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<CreateSocialStatusRequest>({
    social_status: 'single',
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getSocialStatusHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load social status history', err);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, social_status: e.target.value as any });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        return;
      }
      if (!file.type.match(/^(image\/(jpeg|jpg|png)|application\/pdf)$/)) {
        setError('Only PDF, JPG, JPEG, and PNG files are supported');
        return;
      }
      setDocumentFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    console.log('Submitting social status:', formData.social_status);
    console.log('Document file:', documentFile);

    try {
      const submitData: CreateSocialStatusRequest = {
        social_status: formData.social_status,
        document: documentFile || undefined,
      };

      console.log('Submit data:', submitData);
      const result = await updateSocialStatus(submitData);
      console.log('Update result:', result);
      
      setSuccess('Social status updated successfully!');
      
      await loadHistory();
      resetForm();
    } catch (err: any) {
      console.error('Error updating social status:', err);
      setError(err.response?.data?.message || 'Failed to update social status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      social_status: currentStatus as any || 'single',
    });
    setDocumentFile(null);
    setShowUpdateForm(false);
    setError('');
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

  const requiresDocument = formData.social_status !== 'single';

  return (
    <div className="social-status-manager">
      <div className="section-header">
        <h3>Social Status</h3>
        {!readonly && (
          <button
            type="button"
            onClick={() => setShowUpdateForm(!showUpdateForm)}
            className="edit-profile-btn"
            style={{
              backgroundColor: '#4F46E5',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {showUpdateForm ? 'Cancel' : 'Update Status'}
          </button>
        )}
      </div>

      {currentStatus && (
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6B7280', marginRight: '0.5rem' }}>Current Status:</span>
          <span
            style={{
              fontSize: '0.875rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontWeight: '500',
            }}
            className={getStatusColor(currentStatus)}
          >
            {getStatusLabel(currentStatus)}
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            color: '#EF4444',
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#FEE2E2',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            color: '#065F46',
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#D1FAE5',
            borderRadius: '8px',
          }}
        >
          {success}
        </div>
      )}

      {showUpdateForm && !readonly && (
        <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '1rem' }}>Update Social Status</h4>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Social Status</label>
            <select
              name="social_status"
              value={formData.social_status}
              onChange={handleStatusChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
              }}
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>

          {requiresDocument && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Proof Document 
                <span style={{ color: '#6B7280', fontWeight: 'normal' }}> (Required for married, divorced, widowed)</span>
              </label>
              <div style={{ border: '2px dashed #D1D5DB', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', backgroundColor: 'white' }}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="status-document-input"
                />
                <label
                  htmlFor="status-document-input"
                  style={{
                    display: 'block',
                    padding: '1rem',
                    cursor: 'pointer',
                    color: '#6B7280',
                  }}
                >
                  <Upload size={24} style={{ marginBottom: '0.5rem' }} />
                  <div>{documentFile ? documentFile.name : 'Click to upload or drag and drop'}</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>PDF, JPG, JPEG, PNG (max 5MB)</div>
                </label>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                backgroundColor: '#4F46E5',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Update Status
            </button>
            <button
              type="button"
              onClick={resetForm}
              style={{
                backgroundColor: '#EF4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>Status History</h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {history.slice(0, 3).map((record) => (
              <div
                key={record.id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px',
                      fontWeight: '500',
                    }}
                    className={getStatusColor(record.social_status)}
                  >
                    {getStatusLabel(record.social_status)}
                  </span>
                  <span style={{ color: '#9CA3AF' }}>
                    {new Date(record.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  {record.status === 'pending' && (
                    <span style={{ color: '#D97706', fontSize: '0.75rem', fontWeight: '500' }}>⏳ Pending Verification</span>
                  )}
                  {record.status === 'verified' && (
                    <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: '500' }}>✓ Verified</span>
                  )}
                  {record.status === 'rejected' && (
                    <span style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: '500' }}>✕ Rejected</span>
                  )}
                  {record.rejection_reason && (
                    <span style={{ color: '#6B7280', fontSize: '0.7rem', maxWidth: '150px', textAlign: 'right' }}>
                      {record.rejection_reason}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialStatusManager;
