import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, AlertCircle, Download, Eye, User, Calendar } from 'lucide-react';
import {
  PersonalInfoChangeRequest,
  ChangeRequestDocument,
  getChangeRequestsForHR,
  verifyChangeRequestDocument,
  approveChangeRequest,
  rejectChangeRequest,
  requestMoreInfoForChangeRequest,
} from '../../api/familyInfo';

const HRChangeRequestReview: React.FC = () => {
  const [requests, setRequests] = useState<PersonalInfoChangeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PersonalInfoChangeRequest | null>(null);
  const [filter, setFilter] = useState<'pending' | 'needs_more_info' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMoreInfoModal, setShowMoreInfoModal] = useState(false);
  const [moreInfoReason, setMoreInfoReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? undefined : filter;
      const data = await getChangeRequestsForHR(status);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load change requests', err);
      setError('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId: string) => {
    try {
      await verifyChangeRequestDocument(documentId);
      setSuccess('Document verified successfully');
      await loadRequests();
      if (selectedRequest) {
        const updated = await getChangeRequestsForHR(filter === 'all' ? undefined : filter);
        setSelectedRequest(updated.find(r => r.id === selectedRequest.id) || null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify document');
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      const result = await approveChangeRequest(selectedRequest.id);
      setSuccess(`Change request approved. Fiscal profile reassigned: ${result.assignment?.fiscalProfileGroup?.label || 'N/A'}`);
      await loadRequests();
      setSelectedRequest(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;

    try {
      await rejectChangeRequest(selectedRequest.id, rejectReason);
      setSuccess('Change request rejected');
      setShowRejectModal(false);
      setRejectReason('');
      await loadRequests();
      setSelectedRequest(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!selectedRequest || !moreInfoReason.trim()) return;

    try {
      await requestMoreInfoForChangeRequest(selectedRequest.id, moreInfoReason);
      setSuccess('Request marked as needs more info');
      setShowMoreInfoModal(false);
      setMoreInfoReason('');
      await loadRequests();
      setSelectedRequest(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update request');
    }
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

  const canApprove = (request: PersonalInfoChangeRequest) => {
    if (!request.documents || request.documents.length === 0) return false;
    return request.documents.every(doc => doc.verified_by_hr);
  };

  return (
    <div className="hr-change-request-review" style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Personal Info Change Requests</h2>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setFilter('pending')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: filter === 'pending' ? '2px solid #4F46E5' : '1px solid #D1D5DB',
              backgroundColor: filter === 'pending' ? '#EEF2FF' : 'white',
              cursor: 'pointer',
            }}
          >
            Pending ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('needs_more_info')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: filter === 'needs_more_info' ? '2px solid #4F46E5' : '1px solid #D1D5DB',
              backgroundColor: filter === 'needs_more_info' ? '#EEF2FF' : 'white',
              cursor: 'pointer',
            }}
          >
            Needs More Info ({requests.filter(r => r.status === 'needs_more_info').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: filter === 'all' ? '2px solid #4F46E5' : '1px solid #D1D5DB',
              backgroundColor: filter === 'all' ? '#EEF2FF' : 'white',
              cursor: 'pointer',
            }}
          >
            All
          </button>
        </div>
      </div>

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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: selectedRequest ? '1fr 2fr' : '1fr' }}>
          {/* Request List */}
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {requests.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                No change requests found
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  style={{
                    padding: '1rem',
                    backgroundColor: selectedRequest?.id === request.id ? '#EEF2FF' : 'white',
                    border: selectedRequest?.id === request.id ? '2px solid #4F46E5' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={16} />
                      <span style={{ fontWeight: '500' }}>
                        {request.employee?.prenom} {request.employee?.nom}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                      }}
                      className={getStatusColor(request.status)}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                      <Calendar size={14} />
                      {new Date(request.submitted_at).toLocaleDateString()}
                    </div>
                    {request.requested_marital_status && (
                      <div>Marital Status: {request.requested_marital_status}</div>
                    )}
                    {request.requested_children_count !== undefined && (
                      <div>Children: {request.requested_children_count}</div>
                    )}
                  </div>

                  {request.documents && request.documents.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
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
                          {doc.verified_by_hr && <CheckCircle size={12} style={{ color: '#059669' }} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Request Detail */}
          {selectedRequest && (
            <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>
                  {selectedRequest.employee?.prenom} {selectedRequest.employee?.nom}
                </h3>
                <div style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                  {selectedRequest.employee?.matricule} • {selectedRequest.employee?.email}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>Requested Changes</h4>
                <div style={{ fontSize: '0.875rem' }}>
                  {selectedRequest.requested_marital_status && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: '#6B7280' }}>Marital Status:</span>{' '}
                      <span style={{ fontWeight: '500' }}>{selectedRequest.requested_marital_status}</span>
                      {selectedRequest.employee?.marital_status && (
                        <span style={{ color: '#6B7280' }}> (from {selectedRequest.employee.marital_status})</span>
                      )}
                    </div>
                  )}
                  {selectedRequest.requested_children_count !== undefined && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: '#6B7280' }}>Children Count:</span>{' '}
                      <span style={{ fontWeight: '500' }}>{selectedRequest.requested_children_count}</span>
                      {selectedRequest.employee?.children_count !== undefined && (
                        <span style={{ color: '#6B7280' }}> (from {selectedRequest.employee.children_count})</span>
                      )}
                    </div>
                  )}
                  {selectedRequest.requested_disabled_children_count !== undefined && selectedRequest.requested_disabled_children_count > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: '#6B7280' }}>Disabled Children:</span>{' '}
                      <span style={{ fontWeight: '500' }}>{selectedRequest.requested_disabled_children_count}</span>
                    </div>
                  )}
                  {selectedRequest.requested_student_children_count !== undefined && selectedRequest.requested_student_children_count > 0 && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: '#6B7280' }}>Student Children:</span>{' '}
                      <span style={{ fontWeight: '500' }}>{selectedRequest.requested_student_children_count}</span>
                    </div>
                  )}
                  {selectedRequest.computed_head_of_family_preview && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: '#6B7280' }}>Head of Family:</span>{' '}
                      <span style={{ fontWeight: '500', color: '#059669' }}>Yes</span>
                    </div>
                  )}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#6B7280' }}>Effective Date:</span>{' '}
                    <span style={{ fontWeight: '500' }}>{new Date(selectedRequest.claimed_effective_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>Documents</h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {selectedRequest.documents.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '1rem',
                          backgroundColor: doc.verified_by_hr ? '#F0FDF4' : '#F9FAFB',
                          borderRadius: '6px',
                          border: doc.verified_by_hr ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} />
                            <span style={{ fontWeight: '500' }}>{getDocumentTypeLabel(doc.document_type)}</span>
                          </div>
                          {doc.verified_by_hr ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#059669', fontSize: '0.875rem' }}>
                              <CheckCircle size={16} />
                              Verified
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#D97706', fontSize: '0.875rem' }}>
                              <AlertCircle size={16} />
                              Pending
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => window.open(`http://backend.test/storage/${doc.file_path}`, '_blank')}
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '4px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Eye size={14} />
                            View
                          </button>
                          {!doc.verified_by_hr && (
                            <button
                              onClick={() => handleVerifyDocument(doc.id)}
                              style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#059669',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                              }}
                            >
                              Verify
                            </button>
                          )}
                        </div>
                        {doc.verification_notes && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6B7280' }}>
                            Notes: {doc.verification_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.review_notes && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#991B1B' }}>Review Notes</h4>
                  <p style={{ fontSize: '0.875rem', color: '#7F1D1D' }}>{selectedRequest.review_notes}</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleApprove}
                    disabled={!canApprove(selectedRequest)}
                    style={{
                      padding: '0.5rem 1.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: canApprove(selectedRequest) ? '#059669' : '#9CA3AF',
                      color: 'white',
                      cursor: canApprove(selectedRequest) ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    style={{
                      padding: '0.5rem 1.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#DC2626',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => setShowMoreInfoModal(true)}
                    style={{
                      padding: '0.5rem 1.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#D97706',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    Request More Info
                  </button>
                </div>
              )}

              {!canApprove(selectedRequest) && selectedRequest.status === 'pending' && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#D97706' }}>
                  <AlertCircle size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  All documents must be verified before approval
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ marginBottom: '1rem' }}>Reject Change Request</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                marginBottom: '1rem',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: rejectReason.trim() ? '#DC2626' : '#9CA3AF',
                  color: 'white',
                  cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* More Info Modal */}
      {showMoreInfoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ marginBottom: '1rem' }}>Request Additional Information</h3>
            <textarea
              value={moreInfoReason}
              onChange={(e) => setMoreInfoReason(e.target.value)}
              placeholder="Please describe what additional information is needed..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                marginBottom: '1rem',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowMoreInfoModal(false);
                  setMoreInfoReason('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestMoreInfo}
                disabled={!moreInfoReason.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: moreInfoReason.trim() ? '#D97706' : '#9CA3AF',
                  color: 'white',
                  cursor: moreInfoReason.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRChangeRequestReview;
