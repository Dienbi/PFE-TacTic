import React, { useState, useEffect, useMemo } from 'react';
import { fiscalProfileApi, PersonalInfoChangeRequest } from '../../api/fiscalProfile';
import Button from '../../shared/components/ui/Button';
import Badge from '../../shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../shared/components/ui/Card';
import Modal from '../../shared/components/ui/Modal';
import { ChevronLeft, ChevronRight, FileCheck2 } from 'lucide-react';

const NAVY = '#1E2258';

interface ChangeRequestReviewProps {
  status?: 'pending' | 'approved' | 'rejected' | 'needs_more_info';
}

interface PageMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export const ChangeRequestReview: React.FC<ChangeRequestReviewProps> = ({ status = 'pending' }) => {
  const [requests, setRequests] = useState<PersonalInfoChangeRequest[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PersonalInfoChangeRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, itemsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [status, itemsPerPage]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await fiscalProfileApi.getChangeRequests({ status, page, per_page: itemsPerPage } as any);
      const isPaginated = !Array.isArray(response.data);
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setRequests(data);
      if (isPaginated && response.data?.meta) {
        setMeta(response.data.meta as PageMeta);
      } else if (isPaginated && response.data?.current_page) {
        setMeta({
          current_page: response.data.current_page,
          last_page: response.data.last_page,
          total: response.data.total,
          per_page: response.data.per_page,
        });
      } else {
        setMeta(null);
      }
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

  const getStatusVariant = (s: string): 'default' | 'success' | 'danger' | 'warning' => {
    switch (s) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'needs_more_info': return 'warning';
      default: return 'default';
    }
  };

  // Pagination controls — falls back gracefully if the API doesn't return meta
  const totalPages = meta?.last_page ?? (requests.length < itemsPerPage && page === 1 ? 1 : undefined);
  const totalItems = meta?.total;

  const getPageNumbers = () => {
    if (!totalPages) return [];
    const pages: (number | string)[] = [];
    const delta = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const goToPage = (p: number) => {
    if (p < 1) return;
    if (totalPages && p > totalPages) return;
    setPage(p);
  };

  const canGoNext = totalPages ? page < totalPages : requests.length === itemsPerPage;

  return (
    <div className="space-y-4">
      <Card className="shadow-md border border-gray-200 bg-gradient-to-br from-white to-gray-50">
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-left" style={{ color: NAVY }}>
              Change Requests · {status.charAt(0).toUpperCase() + status.slice(1)}
            </h2>
            {requests.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm" style={{ color: NAVY }}>Rows per page</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 text-sm rounded-lg focus:outline-none focus:ring-2"
                  style={{ border: `1px solid ${NAVY}`, color: NAVY }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No requests found</div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 text-left hover:border-[#1E225830] hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-left">
                      <p className="font-medium text-gray-900">
                        {request.employee?.nom} {request.employee?.prenom}
                      </p>
                      <p className="text-sm text-gray-500">
                        Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                  </div>

                  <div className="text-sm space-y-1 mb-3 text-left text-gray-700">
                    {request.requested_marital_status && (
                      <p>Marital Status: <span className="font-medium">{request.requested_marital_status}</span></p>
                    )}
                    {request.requested_children_count !== null && (
                      <p>Children: <span className="font-medium">{request.requested_children_count}</span></p>
                    )}
                    <p>Effective Date: <span className="font-medium">{new Date(request.claimed_effective_date).toLocaleDateString()}</span></p>
                    {request.computed_head_of_family_preview && (
                      <p style={{ color: '#16A34A' }} className="font-medium">Head of Family: Yes</p>
                    )}
                  </div>

                  {request.documents && request.documents.length > 0 && (
                    <div className="mb-3 rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-sm font-medium mb-1.5 text-left" style={{ color: NAVY }}>Documents</p>
                      {request.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                          {doc.verified_by_hr ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                              <FileCheck2 className="w-3.5 h-3.5" /> Verified
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleVerifyDocument(request.id, doc.id)}
                              style={{ borderColor: NAVY, color: NAVY }}
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
                        variant="secondary"
                        onClick={() => setSelectedRequest(request)}
                        style={{ borderColor: NAVY, color: NAVY }}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
                      >
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectModal(true);
                      }}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination — same visual language as the rest of the app */}
              <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: `1px solid ${NAVY}20` }}>
                <p className="text-sm" style={{ color: NAVY }}>
                  {totalItems !== undefined
                    ? <>Showing {(page - 1) * itemsPerPage + 1}-{Math.min(page * itemsPerPage, totalItems)} of {totalItems}</>
                    : <>Page {page}</>}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border transition-colors"
                    style={{ borderColor: NAVY, color: NAVY }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {totalPages ? (
                    getPageNumbers().map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-sm" style={{ color: `${NAVY}80` }}>...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p as number)}
                          className="min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium border transition-colors"
                          style={
                            page === p
                              ? { backgroundColor: NAVY, borderColor: NAVY, color: '#fff' }
                              : { borderColor: NAVY, color: NAVY }
                          }
                        >
                          {p}
                        </button>
                      )
                    )
                  ) : (
                    <span
                      className="min-w-[2.25rem] h-9 px-3 flex items-center justify-center rounded-lg text-sm font-medium border"
                      style={{ backgroundColor: NAVY, borderColor: NAVY, color: '#fff' }}
                    >
                      {page}
                    </span>
                  )}

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={!canGoNext}
                    className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border transition-colors"
                    style={{ borderColor: NAVY, color: NAVY }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={<span style={{ color: NAVY }}>Change Request Details</span>}
        >
          <div className="space-y-4 text-left">
            <div>
              <p className="font-medium text-gray-700">Employee</p>
              <p className="text-gray-900">{selectedRequest.employee?.nom} {selectedRequest.employee?.prenom}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Requested Changes</p>
              <ul className="list-disc list-inside text-gray-900 space-y-0.5">
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
              <p className="font-medium text-gray-700">Effective Date</p>
              <p className="text-gray-900">{new Date(selectedRequest.claimed_effective_date).toLocaleDateString()}</p>
            </div>
            {selectedRequest.review_notes && (
              <div>
                <p className="font-medium text-gray-700">Review Notes</p>
                <p className="text-gray-900">{selectedRequest.review_notes}</p>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button
                onClick={() => setSelectedRequest(null)}
                className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showRejectModal && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title={<span style={{ color: NAVY }}>Reject Request</span>}
        >
          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium mb-1 text-gray-700">Rejection Reason</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Please provide a reason for rejection..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
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