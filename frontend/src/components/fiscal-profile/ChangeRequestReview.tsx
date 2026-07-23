import React, { useState, useEffect } from 'react';
import { fiscalProfileApi, PersonalInfoChangeRequest } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';
import Modal from '../../shared/components/ui/Modal';

interface ChangeRequestReviewProps {
  status?: 'pending' | 'approved' | 'rejected' | 'needs_more_info';
}

export const ChangeRequestReview: React.FC<ChangeRequestReviewProps> = ({ status = 'pending' }) => {
  const [requests, setRequests] = useState<PersonalInfoChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PersonalInfoChangeRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadRequests();
  }, [status, page]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await fiscalProfileApi.getChangeRequests({ status, page });
      // Handle both direct array and paginated response
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setRequests(data);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fiscalProfileApi.approveChangeRequest(id);
      loadRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await fiscalProfileApi.rejectChangeRequest(selectedRequest.id, rejectNotes);
      setShowRejectModal(false);
      setRejectNotes('');
      loadRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const handleVerifyDocument = async (requestId: string, docId: string) => {
    try {
      await fiscalProfileApi.verifyDocument(requestId, docId, true);
      loadRequests();
    } catch (err) {
      console.error('Failed to verify document:', err);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'needs_more_info': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">
            Change Requests - {status.charAt(0).toUpperCase() + status.slice(1)}
          </h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No requests found</div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {request.employee?.nom} {request.employee?.prenom}
                      </p>
                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="text-sm space-y-1 mb-3">
                    {request.requested_marital_status && (
                      <p>Marital Status: {request.requested_marital_status}</p>
                    )}
                    {request.requested_children_count !== null && (
                      <p>Children: {request.requested_children_count}</p>
                    )}
                    <p>Effective Date: {new Date(request.claimed_effective_date).toLocaleDateString()}</p>
                    {request.computed_head_of_family_preview && (
                      <p className="text-green-600">Head of Family: Yes</p>
                    )}
                  </div>

                  {request.documents && request.documents.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Documents:</p>
                      {request.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-sm mb-1">
                          <span>{doc.document_type.replace(/_/g, ' ')}</span>
                          {doc.verified_by_hr ? (
                            <span className="text-green-600">✓ Verified</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVerifyDocument(request.id, doc.id)}
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApprove(request.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectModal(true);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="ghost"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="py-2">Page {page}</span>
                <Button
                  variant="ghost"
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title="Change Request Details"
        >
          <div className="space-y-4">
            <div>
              <p className="font-medium">Employee:</p>
              <p>{selectedRequest.employee?.nom} {selectedRequest.employee?.prenom}</p>
            </div>
            <div>
              <p className="font-medium">Requested Changes:</p>
              <ul className="list-disc list-inside">
                {selectedRequest.requested_marital_status && (
                  <li>Marital Status: {selectedRequest.requested_marital_status}</li>
                )}
                {selectedRequest.requested_children_count !== null && (
                  <li>Children: {selectedRequest.requested_children_count}</li>
                )}
                {selectedRequest.requested_disabled_children_count !== null && (
                  <li>Disabled Children: {selectedRequest.requested_disabled_children_count}</li>
                )}
                {selectedRequest.requested_student_children_count !== null && (
                  <li>Student Children: {selectedRequest.requested_student_children_count}</li>
                )}
              </ul>
            </div>
            <div>
              <p className="font-medium">Effective Date:</p>
              <p>{new Date(selectedRequest.claimed_effective_date).toLocaleDateString()}</p>
            </div>
            {selectedRequest.review_notes && (
              <div>
                <p className="font-medium">Review Notes:</p>
                <p>{selectedRequest.review_notes}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setSelectedRequest(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {showRejectModal && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Request"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rejection Reason:</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={4}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Please provide a reason for rejection..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReject}>
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
