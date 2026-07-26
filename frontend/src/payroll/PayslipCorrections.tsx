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
import Swal from 'sweetalert2';

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
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Compare',
        text: 'Need at least 2 versions to compare',
        confirmButtonColor: '#1E2258',
        confirmButtonText: 'OK'
      });
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
        <div className="p-6 pt-[90px] max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="correction-overview">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-2xl font-semibold text-gray-900 text-left">Payslip Corrections</h1>
              <p className="text-sm text-gray-600 mt-1 text-left">Manage payslip corrections and version history</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Payslip Selection with Filters */}
          <Card className="mb-6 border-2 border-blue-200 shadow-[0_-2px_4px_rgba(0,0,0,0.05),-2px_0_4px_rgba(0,0,0,0.05),2px_0_4px_rgba(0,0,0,0.05)]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" />
                <h2 className="text-lg font-semibold text-blue-900">Select Payslip</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* Search and Date Filters */}
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search by Employee Name</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search employee name..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => refetchPayslips()}
                      leftIcon={<Search className="w-4 h-4" />}
                      className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                      style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                    >
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Payslips List */}
          <Card data-tour="correction-payslips-list">
            <CardHeader>
              <div className="grid grid-cols-3 items-center">
                <div />
                <h2 className="text-lg font-semibold text-gray-900 text-center">Payslips</h2>
                <div />
              </div>
            </CardHeader>
            <CardBody>
              {isLoadingPayslips ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : payslipsData && payslipsData.length > 0 ? (
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[22%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Period</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Gross Salary</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Net Salary</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 truncate">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslipsData.map((payslip: any) => (
                      <tr key={payslip.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm font-medium text-left truncate">
                          {payslip.employee ? `${payslip.employee.nom} ${payslip.employee.prenom}` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-left truncate">
                          {new Date(payslip.pay_period_start).toLocaleDateString()} - {new Date(payslip.pay_period_end).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-left truncate">{Number(payslip.gross_salary || 0).toFixed(2)} TND</td>
                        <td className="py-3 px-4 text-sm font-medium text-left truncate">{Number(payslip.net_salary || 0).toFixed(2)} TND</td>
                        <td className="py-3 px-4 text-left">
                          <Badge variant={payslip.status === 'locked' ? 'success' : payslip.status === 'validated' ? 'default' : 'warning'}>
                            {payslip.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleViewHistory(payslip.id)}
                              leftIcon={<History className="w-4 h-4" />}
                              data-tour="correction-view-history-btn"
                              className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                              style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                            >
                              View History
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No payslips found
                </div>
              )}
            </CardBody>
          </Card>

          {/* Version History Modal */}
          <Modal
            isOpen={isHistoryModalOpen}
            onClose={handleCloseHistory}
            title="Version History"
            size="lg"
            headerClassName="bg-[#1E2258] border-[#1E2258]"
            titleClassName="text-white"
            containerClassName="border border-[#1E2258]"
          >
            <CardBody>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : versions && versions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        leftIcon={<FileText className="w-4 h-4" />}
                        data-tour="correction-create"
                        className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                        style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                      >
                        Create Correction
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCompareVersions}
                        leftIcon={<GitCompare className="w-4 h-4" />}
                        className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                        style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                      >
                        Compare Versions
                      </Button>
                    </div>
                  </div>
                  {versions.map((payslip: any, index: number) => (
                    <Card key={payslip.id} padding="sm" data-tour="correction-version-history" className="border border-[#1E225820]">
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
                              className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                              style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                            >
                              View Details
                            </Button>
                            {payslip.supersedes_payslip_id && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRevert(payslip.id, payslip.supersedes_payslip_id!)}
                                leftIcon={<RotateCcw className="w-4 h-4" />}
                                className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                                style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
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
            headerClassName="bg-[#1E2258] border-[#1E2258]"
            titleClassName="text-white"
            containerClassName="border border-[#1E2258]"
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
                <Button
                  type="submit"
                  variant="ghost"
                  isLoading={createCorrection.isPending}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
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
            headerClassName="bg-[#1E2258] border-[#1E2258]"
            titleClassName="text-white"
            containerClassName="border border-[#1E2258]"
          >
            <div className="space-y-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: '#1E225810', border: '1px solid #1E225840' }}>
                <p className="text-sm" style={{ color: '#1E2258' }}>
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
                <Button
                  onClick={handleExecuteCompare}
                  disabled={!comparePayslip1 || !comparePayslip2}
                  isLoading={compareVersions.isPending}
                  variant="ghost"
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
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