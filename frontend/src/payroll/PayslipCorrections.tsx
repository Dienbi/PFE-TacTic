import React, { useState } from 'react';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useCorrectionHistory, useAllPayslips } from '../hooks/queries/useTunisianPayroll';
import { useCorrectionMutations } from '../hooks/mutations/useTunisianPayrollMutations';
import { Card, CardHeader, CardBody, CardFooter } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import Modal from '../shared/components/ui/Modal';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import { History, GitCompare, RotateCcw, FileText, Search, Calendar } from 'lucide-react';

const PayslipCorrections: React.FC = () => {
  const { user, displayName } = useAuth();
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [comparePayslip1, setComparePayslip1] = useState<string>('');
  const [comparePayslip2, setComparePayslip2] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const { data: history, isLoading, refetch } = useCorrectionHistory(selectedPayslipId);
  const versions = history?.versions || [];
  const { data: payslipsData, isLoading: isLoadingPayslips, refetch: refetchPayslips } = useAllPayslips({
    search: searchTerm,
    date_from: dateFrom,
    date_to: dateTo,
  });
  
  const { createCorrection, revert, compareVersions } = useCorrectionMutations();

  const handleViewHistory = (payslipId: string) => {
    setSelectedPayslipId(payslipId);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistory = () => {
    setIsHistoryModalOpen(false);
    setSelectedPayslipId('');
  };

  const handleCompareVersions = async () => {
    if (versions.length >= 2) {
      // Auto-detect: compare latest version with previous version
      const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
      setComparePayslip1(sortedVersions[0].id);
      setComparePayslip2(sortedVersions[1].id);
      setIsCompareModalOpen(true);
    } else {
      alert('Need at least 2 versions to compare');
    }
  };

  const handleExecuteCompare = async () => {
    if (!comparePayslip1 || !comparePayslip2) return;
    
    try {
      const result = await compareVersions.mutateAsync({ payslipId1: comparePayslip1, payslipId2: comparePayslip2 });
      console.log('Comparison result:', result);
      alert('Comparison executed. Check console for details.');
    } catch (error: any) {
      console.error('Comparison failed:', error);
      alert('Failed to compare versions. Please try again.');
    }
  };

  const handleCreateCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      const result = await createCorrection.mutateAsync({
        originalPayslipId: selectedPayslipId,
        data: {
          reason: formData.get('reason') as string,
          base_salary: formData.get('base_salary') ? Number(formData.get('base_salary')) : undefined,
        },
      });
      
      if (result.data.success === false) {
        alert(result.data.message || 'Failed to create correction');
      } else {
        setIsCreateModalOpen(false);
        refetch();
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Failed to create correction. Please try again.');
      }
    }
  };

  const handleRevert = async (currentPayslipId: string, targetVersionId: string) => {
    if (window.confirm('Are you sure you want to revert to this version?')) {
      try {
        const result = await revert.mutateAsync({ currentPayslipId, targetVersionId });
        
        if (result.data.success === false) {
          alert(result.data.message || 'Failed to revert payslip');
        } else {
          refetch();
        }
      } catch (error: any) {
        if (error.response?.data?.message) {
          alert(error.response.data.message);
        } else {
          alert('Failed to revert payslip. Please try again.');
        }
      }
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="correction-overview">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Payslip Corrections</h1>
              <p className="text-sm text-gray-600 mt-1">Manage payslip corrections and version history</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Payslip Selection with Filters */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Select Payslip</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* Search and Date Filters */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search by Employee Name</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search employee name..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => refetchPayslips()} leftIcon={<Search className="w-4 h-4" />}>
                      Search
                    </Button>
                  </div>
                </div>

                {/* Payslips List */}
                {isLoadingPayslips ? (
                  <div className="text-center py-8 text-gray-500">Loading payslips...</div>
                ) : payslipsData && payslipsData.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {payslipsData.map((payslip: any) => (
                          <tr key={payslip.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{payslip.employee?.nom} {payslip.employee?.prenom}</div>
                              <div className="text-sm text-gray-500">{payslip.employee?.matricule}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(payslip.pay_period_start).toLocaleDateString()} - {new Date(payslip.pay_period_end).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {payslip.net_salary != null ? Number(payslip.net_salary).toFixed(2) : 'N/A'} TND
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={payslip.status === 'locked' ? 'success' : payslip.status === 'validated' ? 'default' : 'warning'}>
                                {payslip.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleViewHistory(payslip.id)}
                                leftIcon={<History className="w-4 h-4" />}
                              >
                                View History
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No payslips found. Adjust your filters or search terms.
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Version History Modal */}
          <Modal
            isOpen={isHistoryModalOpen}
            onClose={handleCloseHistory}
            title="Version History"
            size="lg"
          >
            <CardBody>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : versions && versions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(true)} leftIcon={<FileText className="w-4 h-4" />} data-tour="correction-create">
                        Create Correction
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCompareVersions} leftIcon={<GitCompare className="w-4 h-4" />}>
                        Compare Versions
                      </Button>
                    </div>
                  </div>
                  {versions.map((payslip: any, index: number) => (
                    <Card key={payslip.id} padding="sm" data-tour="correction-version-history">
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Badge variant={payslip.status === 'locked' ? 'success' : payslip.status === 'validated' ? 'default' : 'warning'} data-tour="correction-superseded">
                                {payslip.status}
                              </Badge>
                              <span className="text-sm font-medium text-gray-900">Version {payslip.version}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Created: {new Date(payslip.generated_at).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              Employee: {payslip.employee?.nom} {payslip.employee?.prenom}
                            </div>
                            <div className="text-sm text-gray-600">
                              Net Salary: {payslip.net_salary != null ? Number(payslip.net_salary).toFixed(2) : 'N/A'} TND
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => window.location.href = `/payroll/payslips/${payslip.id}`}
                              leftIcon={<FileText className="w-4 h-4" />}
                            >
                              View Details
                            </Button>
                            {payslip.supersedes_payslip_id && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRevert(payslip.id, payslip.supersedes_payslip_id!)}
                                leftIcon={<RotateCcw className="w-4 h-4" />}
                              >
                                Revert
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No version history found for this payslip
                </div>
              )}
            </CardBody>
          </Modal>

          {/* Create Correction Modal */}
          <Modal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Create Correction"
            size="md"
          >
            <form onSubmit={handleCreateCorrection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Correction</label>
                <textarea
                  name="reason"
                  required
                  rows={3}
                  placeholder="Explain why this correction is needed"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Base Salary (Optional)</label>
                <input
                  type="number"
                  name="base_salary"
                  step="0.01"
                  min="0"
                  placeholder="Leave empty to keep current salary"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createCorrection.isPending}>
                  Create Correction
                </Button>
              </div>
            </form>
          </Modal>

          {/* Compare Versions Modal */}
          <Modal
            isOpen={isCompareModalOpen}
            onClose={() => setIsCompareModalOpen(false)}
            title="Compare Versions"
            size="md"
          >
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Auto-detected versions: Comparing latest version (Version {versions.find((v: any) => v.id === comparePayslip1)?.version}) with previous version (Version {versions.find((v: any) => v.id === comparePayslip2)?.version})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latest Version ID</label>
                <input
                  type="text"
                  value={comparePayslip1}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Previous Version ID</label>
                <input
                  type="text"
                  value={comparePayslip2}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsCompareModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleExecuteCompare} disabled={!comparePayslip1 || !comparePayslip2} isLoading={compareVersions.isPending}>
                  Compare
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

export default PayslipCorrections;
