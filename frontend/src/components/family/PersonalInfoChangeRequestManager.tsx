import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  PersonalInfoChangeRequest,
  ChangeRequestDocument,
  getChangeRequests,
  createChangeRequest,
  uploadChangeRequestDocument,
  CreateChangeRequestRequest,
  UploadDocumentRequest,
} from '../../api/familyInfo';

interface PersonalInfoChangeRequestManagerProps {
  currentMaritalStatus?: string;
  currentChildrenCount?: number;
  employeeGender?: 'male' | 'female';
  readonly?: boolean;
}

const PersonalInfoChangeRequestManager: React.FC<PersonalInfoChangeRequestManagerProps> = ({
  currentMaritalStatus = 'single',
  currentChildrenCount = 0,
  employeeGender = 'male',
  readonly = false,
}) => {
  const [requests, setRequests] = useState<PersonalInfoChangeRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState<CreateChangeRequestRequest>({
    claimed_effective_date: new Date().toISOString().split('T')[0],
  });

  const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getChangeRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load change requests', err);
    }
  };

  const handleInputChange = (field: keyof CreateChangeRequestRequest, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
      setDocumentFiles({ ...documentFiles, [docType]: file });
      setError('');
    }
  };

  const getRequiredDocumentTypes = (): string[] => {
    const required: string[] = [];
    
    // Marital status changes
    if (formData.requested_marital_status && formData.requested_marital_status !== currentMaritalStatus) {
      if (currentMaritalStatus === 'single' && formData.requested_marital_status === 'married') {
        required.push('marriage_certificate');
      } else if (currentMaritalStatus === 'married' && formData.requested_marital_status === 'divorced') {
        required.push('divorce_judgment');
      } else if (currentMaritalStatus === 'married' && formData.requested_marital_status === 'widowed') {
        required.push('death_certificate');
      }
    }

    // Children count increase
    if (formData.requested_children_count !== undefined && 
        formData.requested_children_count > currentChildrenCount) {
      const newChildren = formData.requested_children_count - currentChildrenCount;
      for (let i = 0; i < newChildren; i++) {
        required.push('birth_certificate');
      }
    }

    // Disabled children
    if (formData.requested_disabled_children_count && formData.requested_disabled_children_count > 0) {
      required.push('disability_certificate');
    }

    // Student children
    if (formData.requested_student_children_count && formData.requested_student_children_count > 0) {
      required.push('school_enrollment_certificate');
    }

    return required;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setUploading(true);
      
      // Create the change request
      const result = await createChangeRequest(formData);
      setCurrentRequestId(result.id);
      
      // Upload required documents
      const requiredDocs = getRequiredDocumentTypes();
      for (const docType of requiredDocs) {
        const file = documentFiles[docType];
        if (file) {
          const uploadData: UploadDocumentRequest = {
            document_type: docType as any,
            document: file,
          };
          await uploadChangeRequestDocument(result.id, uploadData);
        }
      }

      setSuccess('Change request submitted successfully!');
      await loadRequests();
      resetForm();
    } catch (err: any) {
      console.error('Error submitting change request:', err);
      setError(err.response?.data?.message || 'Failed to submit change request. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      claimed_effective_date: new Date().toISOString().split('T')[0],
    });
    setDocumentFiles({});
    setCurrentRequestId(null);
    setShowForm(false);
    setError('');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'needs_more_info': return 'Needs More Info';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'approved': return <CheckCircle size={16} />;
      case 'rejected': return <XCircle size={16} />;
      case 'needs_more_info': return <AlertCircle size={16} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'needs_more_info': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'marriage_certificate': return 'Marriage Certificate';
      case 'divorce_judgment': return 'Divorce Judgment';
      case 'death_certificate': return 'Death Certificate';
      case 'birth_certificate': return 'Birth Certificate';
      case 'disability_certificate': return 'Disability Certificate';
      case 'school_enrollment_certificate': return 'School Enrollment Certificate';
      default: return type;
    }
  };

  const hasActiveRequest = requests.some(r => r.status === 'pending' || r.status === 'needs_more_info');

  return (
    <div className="personal-info-change-request-manager">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Personal Info Changes</h3>
        {!readonly && !hasActiveRequest && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            style={{
              backgroundColor: '#4F46E5',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {showForm ? 'Cancel' : 'Request Change'}
          </button>
        )}
      </div>

      {hasActiveRequest && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid #F59E0B',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E' }}>
            <Clock size={20} />
            <span>You have an active change request under review. Please wait for it to be processed before submitting a new one.</span>
          </div>
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

      {showForm && !readonly && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '1rem' }}>Request Personal Info Change</h4>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Marital Status
              <span style={{ color: '#6B7280', fontWeight: 'normal' }}> (Optional)</span>
            </label>
            <select
              value={formData.requested_marital_status || ''}
              onChange={(e) => handleInputChange('requested_marital_status', e.target.value || undefined)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
              }}
            >
              <option value="">No change</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Number of Children
              <span style={{ color: '#6B7280', fontWeight: 'normal' }}> (Optional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.requested_children_count !== undefined ? formData.requested_children_count : ''}
              onChange={(e) => handleInputChange('requested_children_count', e.target.value ? parseInt(e.target.value) : undefined)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Disabled Children Count
              <span style={{ color: '#6B7280', fontWeight: 'normal' }}> (Optional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.requested_disabled_children_count || 0}
              onChange={(e) => handleInputChange('requested_disabled_children_count', parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Student (Non-Scholarship) Children Count
              <span style={{ color: '#6B7280', fontWeight: 'normal' }}> (Optional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.requested_student_children_count || 0}
              onChange={(e) => handleInputChange('requested_student_children_count', parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Effective Date
              <span style={{ color: '#6B7280', fontWeight: 'normal' }}> (When should this change take effect?)</span>
            </label>
            <input
              type="date"
              value={formData.claimed_effective_date}
              onChange={(e) => handleInputChange('claimed_effective_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
              }}
            />
          </div>

          {/* Document Upload Section */}
          {getRequiredDocumentTypes().length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
              <h5 style={{ marginBottom: '0.75rem', color: '#6B7280' }}>Required Documents</h5>
              {getRequiredDocumentTypes().map((docType) => (
                <div key={docType} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    {getDocumentTypeLabel(docType)}
                    <span style={{ color: '#EF4444', fontWeight: 'normal' }}> *</span>
                  </label>
                  <div style={{ border: '2px dashed #D1D5DB', borderRadius: '8px', padding: '1rem', textAlign: 'center', backgroundColor: '#F9FAFB' }}>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(docType, e)}
                      style={{ display: 'none' }}
                      id={`doc-${docType}`}
                    />
                    <label
                      htmlFor={`doc-${docType}`}
                      style={{
                        display: 'block',
                        padding: '0.75rem',
                        cursor: 'pointer',
                        color: '#6B7280',
                      }}
                    >
                      <Upload size={20} style={{ marginBottom: '0.25rem' }} />
                      <div>{documentFiles[docType] ? documentFiles[docType].name : 'Click to upload'}</div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={uploading}
              style={{
                backgroundColor: uploading ? '#9CA3AF' : '#4F46E5',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '6px',
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? 'Submitting...' : 'Submit Request'}
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
        </form>
      )}

      {requests.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>Request History</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {requests.map((request) => (
              <div
                key={request.id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      className={getStatusColor(request.status)}
                    >
                      {getStatusIcon(request.status)}
                      {getStatusLabel(request.status)}
                    </span>
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                      {new Date(request.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>
                  {request.requested_marital_status && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ color: '#6B7280' }}>Marital Status:</span> {request.requested_marital_status}
                    </div>
                  )}
                  {request.requested_children_count !== undefined && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ color: '#6B7280' }}>Children:</span> {request.requested_children_count}
                    </div>
                  )}
                  {request.computed_head_of_family_preview && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ color: '#6B7280' }}>Head of Family:</span> Yes
                    </div>
                  )}
                </div>

                {request.documents && request.documents.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Documents:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {request.documents.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: doc.verified_by_hr ? '#D1FAE5' : '#F3F4F6',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                          }}
                        >
                          <FileText size={12} />
                          {getDocumentTypeLabel(doc.document_type)}
                          {doc.verified_by_hr && <CheckCircle size={12} style={{ color: '#059669' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {request.review_notes && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#F3F4F6', borderRadius: '4px', fontSize: '0.875rem' }}>
                    <span style={{ color: '#6B7280' }}>HR Notes:</span> {request.review_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalInfoChangeRequestManager;
