import React, { useState } from 'react';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useAllPayslips } from '../hooks/queries/useTunisianPayroll';
import { usePayslipMutations } from '../hooks/mutations/useTunisianPayrollMutations';
import { Card, CardHeader, CardBody, CardFooter } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import Modal from '../shared/components/ui/Modal';
import UserSelect from '../shared/components/ui/UserSelect';
import MultiUserSelect from '../shared/components/ui/MultiUserSelect';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import { Calculator, Users, CheckCircle, Lock, Trash2, Eye, Search, Filter } from 'lucide-react';

const PayslipGeneration: React.FC = () => {
  const { user, displayName } = useAuth();
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Build filter params - only include filters if they are set
  const filterParams: any = {};
  if (selectedEmployee) filterParams.employee_id = selectedEmployee;
  if (selectedStatus) filterParams.status = selectedStatus;
  if (periodStart) filterParams.date_from = periodStart;
  if (periodEnd) filterParams.date_to = periodEnd;
  if (searchQuery) filterParams.search = searchQuery;
  
  const { data: payslips, isLoading, refetch } = useAllPayslips(filterParams);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);
  const [selectedEmployeeForGeneration, setSelectedEmployeeForGeneration] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  const { generateSingle, generateBatch, validate, lock, deleteDraft } = usePayslipMutations();

  const handleGenerateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      employee_id: selectedEmployeeForGeneration,
      pay_period_start: periodStart,
      pay_period_end: periodEnd,
    };
    
    console.log('Sending payslip generation request:', payload);
    
    try {
      await generateSingle.mutateAsync(payload);
      
      setIsSingleModalOpen(false);
      setSelectedEmployeeForGeneration('');
      refetch();
    } catch (error: any) {
      console.error('Payslip generation error:', error.response?.data || error);
      alert(error.response?.data?.message || 'Failed to generate payslip');
    }
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await generateBatch.mutateAsync({
        employee_ids: selectedEmployees,
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
      });
      
      console.log('Batch generation result:', result);
      
      setIsBatchModalOpen(false);
      setSelectedEmployees([]);
      refetch();
    } catch (error) {
      console.error('Batch generation failed:', error);
    }
  };

  const handleValidate = async (id: string) => {
    await validate.mutateAsync(id);
    refetch();
  };

  const handleLock = async (id: string) => {
    await lock.mutateAsync(id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this draft payslip?')) {
      await deleteDraft.mutateAsync(id);
      refetch();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
      draft: 'warning',
      validated: 'success',
      locked: 'danger',
      superseded: 'default',
    };
    return variants[status] || 'default';
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="payslip-overview">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Payslip Generation</h1>
              <p className="text-sm text-gray-600 mt-1">Generate and manage employee payslips</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or matricule"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        refetch();
                      }}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <UserSelect
                    value={selectedEmployee}
                    onChange={(value) => {
                      setSelectedEmployee(value);
                      refetch();
                    }}
                    placeholder="All employees"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      refetch();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="validated">Validated</option>
                    <option value="locked">Locked</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => {
                      setPeriodStart(e.target.value);
                      refetch();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => {
                      setPeriodEnd(e.target.value);
                      refetch();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedEmployee('');
                    setSelectedStatus('');
                    setPeriodStart('');
                    setPeriodEnd('');
                    setSearchQuery('');
                    refetch();
                  }}
                >
                  Clear
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <div className="flex gap-4 mb-6">
            <Button onClick={() => setIsSingleModalOpen(true)} leftIcon={<Calculator className="w-4 h-4" />} data-tour="payslip-generate-single">
              Generate Single Payslip
            </Button>
            <Button variant="secondary" onClick={() => setIsBatchModalOpen(true)} leftIcon={<Users className="w-4 h-4" />} data-tour="payslip-batch-generation">
              Generate Batch Payslips
            </Button>
          </div>

          {/* Payslips List */}
          <Card data-tour="payslip-existing-list">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Payslips</h2>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : payslips && payslips.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Period</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Gross Salary</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Net Salary</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.map((payslip: any) => (
                      <tr key={payslip.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm font-medium">
                          {payslip.employee ? `${payslip.employee.nom} ${payslip.employee.prenom}` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(payslip.pay_period_start).toLocaleDateString()} - {new Date(payslip.pay_period_end).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">{Number(payslip.gross_salary || 0).toFixed(2)} TND</td>
                        <td className="py-3 px-4 text-sm font-medium">{Number(payslip.net_salary || 0).toFixed(2)} TND</td>
                        <td className="py-3 px-4" data-tour="payslip-draft-status">
                          <Badge variant={getStatusBadge(payslip.status)}>
                            {payslip.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedPayslip(payslip.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {payslip.status === 'draft' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleValidate(payslip.id)}
                                  leftIcon={<CheckCircle className="w-4 h-4" />}
                                  data-tour="payslip-confirm"
                                >
                                  Validate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleDelete(payslip.id)}
                                  leftIcon={<Trash2 className="w-4 h-4" />}
                                  data-tour="payslip-delete"
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                            {payslip.status === 'validated' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleLock(payslip.id)}
                                leftIcon={<Lock className="w-4 h-4" />}
                                data-tour="payslip-lock"
                              >
                                Lock
                              </Button>
                            )}
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

          {/* Single Generation Modal */}
          <Modal
            isOpen={isSingleModalOpen}
            onClose={() => setIsSingleModalOpen(false)}
            title="Generate Single Payslip"
            size="md"
          >
            <form onSubmit={handleGenerateSingle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <UserSelect
                  value={selectedEmployeeForGeneration}
                  onChange={setSelectedEmployeeForGeneration}
                  placeholder="Select an employee"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsSingleModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={generateSingle.isPending} disabled={!selectedEmployeeForGeneration || !periodStart || !periodEnd}>
                  Generate
                </Button>
              </div>
            </form>
          </Modal>

          {/* Batch Generation Modal */}
          <Modal
            isOpen={isBatchModalOpen}
            onClose={() => setIsBatchModalOpen(false)}
            title="Generate Batch Payslips"
            size="md"
          >
            <form onSubmit={handleGenerateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employees</label>
                <MultiUserSelect
                  value={selectedEmployees}
                  onChange={setSelectedEmployees}
                  placeholder="Select employees"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsBatchModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={generateBatch.isPending} disabled={selectedEmployees.length === 0 || !periodStart || !periodEnd}>
                  Generate Batch
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </div>
      <PayrollTourTooltip />
    </div>
  );
};

export default PayslipGeneration;
