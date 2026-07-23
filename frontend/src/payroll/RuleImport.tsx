import React, { useState } from 'react';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { usePendingRuleImports, useRuleImportHistory, useRuleImportById, useFiscalRules } from '../hooks/queries/useTunisianPayroll';
import { useRuleImportMutations } from '../hooks/mutations/useTunisianPayrollMutations';
import { Card, CardHeader, CardBody, CardFooter } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import Modal from '../shared/components/ui/Modal';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertTriangle, ArrowRight, Edit2 } from 'lucide-react';

const RuleImport: React.FC = () => {
  const { user, displayName } = useAuth();
  const [selectedImport, setSelectedImport] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editedData, setEditedData] = useState<any>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const { data: pendingImports, refetch: refetchPending } = usePendingRuleImports();
  const { data: history, refetch: refetchHistory } = useRuleImportHistory();
  const { data: selectedImportData } = useRuleImportById(selectedImport || '');
  const { data: existingRules } = useFiscalRules();
  
  const { uploadPdf, reviewAndConfirm, reject } = useRuleImportMutations();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const pdfFile = formData.get('pdf_file') as File;
    if (!pdfFile) {
      alert('Please select a PDF file');
      return;
    }
    
    try {
      await uploadPdf.mutateAsync(formData);
      setIsUploadModalOpen(false);
      refetchPending();
      refetchHistory();
      alert('PDF uploaded successfully! Check the Pending Review section.');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload PDF. Please try again.');
    }
  };

  const handleReview = (importId: string) => {
    setSelectedImport(importId);
    setEditedData(null);
    setEditingField(null);
    setIsReviewModalOpen(true);
  };

  const handleEditField = (field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getExistingRuleForYear = (year: number) => {
    return existingRules?.find((r: any) => r.year === year);
  };

  const renderComparisonRow = (label: string, oldValue: any, newValue: any, field: string, unit?: string) => {
    const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
    const editedValue = editedData?.[field] !== undefined ? editedData[field] : newValue;
    const isEdited = editedData?.[field] !== undefined;
    const isEditing = editingField === field;
    
    return (
      <div className={`flex items-center justify-between py-3 border-b ${hasChanged && !isEdited ? 'border-yellow-200 bg-yellow-50' : isEdited ? 'border-blue-200 bg-blue-50' : 'border-gray-100'}`}>
        <span className="text-sm font-medium text-gray-700 w-1/3">{label}</span>
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1">
            <span className="text-xs text-gray-500 block mb-1">Current</span>
            <span className="text-sm text-gray-600">{oldValue !== null && oldValue !== undefined ? `${oldValue}${unit || ''}` : 'N/A'}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className="flex-1">
            <span className="text-xs text-gray-500 block mb-1">Extracted {isEdited && '(Edited)'}</span>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  step={field.includes('rate') ? '0.0001' : '0.01'}
                  min="0"
                  max={field.includes('rate') ? '1' : undefined}
                  value={editedValue !== null && editedValue !== undefined ? String(editedValue) : ''}
                  onChange={(e) => handleEditField(field, Number(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingField(null)}
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${hasChanged ? 'text-green-600' : 'text-gray-900'}`}>
                  {editedValue !== null && editedValue !== undefined ? `${editedValue}${unit || ''}` : 'N/A'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingField(field)}
                  leftIcon={<Edit2 className="w-3 h-3" />}
                >
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleConfirm = async () => {
    if (!selectedImport) return;
    
    await reviewAndConfirm.mutateAsync({
      importLogId: selectedImport,
      reviewDecisions: editedData || {},
    });
    
    setIsReviewModalOpen(false);
    refetchPending();
    refetchHistory();
  };

  const handleReject = async () => {
    if (!selectedImport || !rejectReason) return;
    
    await reject.mutateAsync({
      importLogId: selectedImport,
      reason: rejectReason,
    });
    
    setIsRejectModalOpen(false);
    setRejectReason('');
    refetchPending();
    refetchHistory();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
      pending_review: 'warning',
      confirmed: 'success',
      rejected: 'danger',
    };
    return variants[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      pending_review: <Clock className="w-4 h-4" />,
      confirmed: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
    };
    return icons[status] || <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="import-overview">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Rule Import (AI)</h1>
              <p className="text-sm text-gray-600 mt-1">Upload PDF for AI extraction and review fiscal rule changes</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-4 mb-6">
            <Button onClick={() => setIsUploadModalOpen(true)} leftIcon={<Upload className="w-4 h-4" />} data-tour="import-upload">
              Upload PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Imports */}
            <Card data-tour="import-ai-extraction">
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Pending Review</h2>
              </CardHeader>
              <CardBody>
                {pendingImports && pendingImports.length > 0 ? (
                  <div className="space-y-3">
                    {pendingImports.map((importLog: any) => (
                      <Card key={importLog.id} padding="sm" hover>
                        <CardBody>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-yellow-50 rounded-lg">
                                <Clock className="w-4 h-4 text-yellow-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Year {importLog.proposed_changes_json?.year || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {new Date(importLog.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleReview(importLog.id)}
                                data-tour="import-review"
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No pending imports to review
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Import History */}
            <Card data-tour="import-comparison">
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Import History</h2>
              </CardHeader>
              <CardBody>
                {history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((importLog: any) => (
                      <Card key={importLog.id} padding="sm" hover>
                        <CardBody>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                importLog.status === 'confirmed' ? 'bg-green-50' : 
                                importLog.status === 'rejected' ? 'bg-red-50' : 'bg-yellow-50'
                              }`}>
                                {getStatusIcon(importLog.status)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Year {importLog.proposed_changes_json?.year || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {new Date(importLog.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant={getStatusBadge(importLog.status)}>
                              {importLog.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No import history
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Upload Modal */}
          <Modal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            title="Upload PDF for AI Extraction"
            size="md"
          >
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
                <input
                  type="file"
                  name="pdf_file"
                  required
                  accept=".pdf"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Select a PDF file containing fiscal rules</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year</label>
                <input
                  type="number"
                  name="year"
                  required
                  min="2020"
                  max="2100"
                  defaultValue={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsUploadModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={uploadPdf.isPending}>
                  Upload & Extract
                </Button>
              </div>
            </form>
          </Modal>

          {/* Review Modal */}
          <Modal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            title="Review AI Extracted Rules"
            size="xl"
          >
            {selectedImportData && (
              <div className="space-y-6">
                <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <h3 className="text-base font-semibold text-gray-900">Fiscal Year {selectedImportData.proposed_changes_json?.year}</h3>
                      </CardHeader>
                      <CardBody>
                        {(() => {
                          const existingRule = getExistingRuleForYear(selectedImportData.proposed_changes_json?.year);
                          const extracted = selectedImportData.proposed_changes_json || {};
                          
                          return (
                            <div className="space-y-0">
                              {renderComparisonRow('CNSS Employee Rate', existingRule?.cnss_employee_rate, extracted.cnss_employee_rate, 'cnss_employee_rate', '')}
                              {renderComparisonRow('CNSS Employer Rate', existingRule?.cnss_employer_rate, extracted.cnss_employer_rate, 'cnss_employer_rate', '')}
                              {renderComparisonRow('CNSS Monthly Ceiling', existingRule?.cnss_monthly_ceiling, extracted.cnss_monthly_ceiling, 'cnss_monthly_ceiling', ' TND')}
                              {renderComparisonRow('CSS Rate', existingRule?.css_rate, extracted.css_rate, 'css_rate', '')}
                              {renderComparisonRow('CSS Exempt Threshold', existingRule?.css_exempt_annual_net_threshold, extracted.css_exempt_annual_net_threshold, 'css_exempt_annual_net_threshold', ' TND')}
                              {renderComparisonRow('Professional Expense Rate', existingRule?.prof_expense_rate, extracted.prof_expense_rate, 'prof_expense_rate', '')}
                              {renderComparisonRow('Professional Expense Cap', existingRule?.prof_expense_annual_cap, extracted.prof_expense_annual_cap, 'prof_expense_annual_cap', ' TND')}
                              {renderComparisonRow('Minimum Annual Tax', existingRule?.min_annual_tax, extracted.min_annual_tax, 'min_annual_tax', ' TND')}
                            </div>
                          );
                        })()}
                      </CardBody>
                    </Card>

                    <Card>
                      <CardHeader>
                        <h3 className="text-base font-semibold text-gray-900">IRPP Brackets</h3>
                      </CardHeader>
                      <CardBody>
                        <div className="space-y-2">
                          {selectedImportData.proposed_changes_json?.irpp_brackets?.map((bracket: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                              <div className="text-sm font-medium text-gray-700 mb-2">Bracket {idx + 1}</div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Min:</span> {bracket.min} TND
                                </div>
                                <div>
                                  <span className="text-gray-500">Max:</span> {bracket.max || '∞'} TND
                                </div>
                                <div>
                                  <span className="text-gray-500">Rate:</span> {(bracket.rate * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                    <Card>
                      <CardHeader>
                        <h3 className="text-base font-semibold text-gray-900">Family Deductions</h3>
                      </CardHeader>
                      <CardBody>
                        <div className="space-y-2">
                          {selectedImportData.proposed_changes_json?.family_deductions?.map((deduction: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                              <div className="text-sm font-medium text-gray-700 mb-2 capitalize">
                                {deduction.type.replace(/_/g, ' ')}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Amount:</span> {deduction.amount} TND
                                </div>
                                <div>
                                  <span className="text-gray-500">Max Count:</span> {deduction.max_count || 'Unlimited'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      setIsReviewModalOpen(false);
                      setIsRejectModalOpen(true);
                    }}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    isLoading={reviewAndConfirm.isPending}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    Confirm & Apply
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          {/* Reject Modal */}
          <Modal
            isOpen={isRejectModalOpen}
            onClose={() => setIsRejectModalOpen(false)}
            title="Reject Import"
            size="md"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Explain why you're rejecting this import"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  isLoading={reject.isPending}
                >
                  Reject Import
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
      <PayrollTourTooltip />
    </div>
  );
};

export default RuleImport;
