import React, { useState } from 'react';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { usePaymentStatistics, useAllPayments, usePayslipsByEmployee } from '../hooks/queries/useTunisianPayroll';
import { usePaymentMutations } from '../hooks/mutations/useTunisianPayrollMutations';
import { Card, CardHeader, CardBody, CardFooter } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import Modal from '../shared/components/ui/Modal';
import UserSelect from '../shared/components/ui/UserSelect';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import { CreditCard, TrendingUp, Calendar, Filter } from 'lucide-react';

const PaymentTracking: React.FC = () => {
  const { user, displayName } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedPayslip, setSelectedPayslip] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Build filter params - only include dates if they are set
  const filterParams: any = {};
  if (selectedEmployee) filterParams.employee_id = selectedEmployee;
  if (dateFrom) filterParams.date_from = dateFrom;
  if (dateTo) filterParams.date_to = dateTo;

  const { data: statistics, refetch: refetchStats } = usePaymentStatistics(filterParams);
  const { data: payments, isLoading, refetch } = useAllPayments(filterParams);
  const { data: payslips } = usePayslipsByEmployee(selectedEmployee);

  // Filter payslips to only show locked ones for payment recording
  const lockedPayslips = payslips?.filter((p: any) => p.status === 'locked') || [];

  const { record, update, deletePayment } = usePaymentMutations();

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      payslip_id: selectedPayslip,
      method: formData.get('method') as 'bank_transfer' | 'cash' | 'check',
      amount: Number(formData.get('amount')),
      paid_at: formData.get('paid_at') as string,
      reference: formData.get('reference') as string || undefined,
    };

    console.log('Sending payment recording request:', payload);

    try {
      await record.mutateAsync(payload);

      setIsRecordModalOpen(false);
      setSelectedPayslip('');
      refetch();
      refetchStats();
    } catch (error: any) {
      console.error('Payment recording error:', error.response?.data || error);
      alert(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await deletePayment.mutateAsync(id);
      refetch();
      refetchStats();
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="payment-overview">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-2xl font-semibold text-gray-900 text-left">Payment Tracking</h1>
              <p className="text-sm text-gray-600 mt-1 text-left">Record and track payments against payslips</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="shadow-md">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Paid</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Number(statistics?.total_paid || 0).toFixed(2)} TND
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card className="shadow-md">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pending</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Number(statistics?.total_pending || 0).toFixed(2)} TND
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card className="shadow-md">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Payment Count</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {statistics?.payment_count}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <UserSelect
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    placeholder="Select an employee"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-tour="payment-date"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-tour="payment-date"
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { refetch(); refetchStats(); }}
                  leftIcon={<Filter className="w-4 h-4" />}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
                  Filter
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsRecordModalOpen(true)}
                  leftIcon={<CreditCard className="w-4 h-4" />}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
                  Record Payment
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : payments && payments.length > 0 ? (
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[20%]" />
                    <col className="w-[13%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Period</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Method</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Paid Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Reference</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 truncate">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-sm font-medium text-left truncate">
                          {payment.payslip?.employee?.nom} {payment.payslip?.employee?.prenom}
                        </td>
                        <td className="py-3 px-4 text-sm text-left truncate">
                          {new Date(payment.payslip?.pay_period_start).toLocaleDateString()} - {new Date(payment.payslip?.pay_period_end).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-left truncate">
                          <Badge variant="default">
                            {payment.method.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-left truncate">{Number(payment.amount || 0).toFixed(2)} TND</td>
                        <td className="py-3 px-4 text-sm text-left truncate">{new Date(payment.paid_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-sm text-left truncate">{payment.reference || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(payment.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No payments found
                </div>
              )}
            </CardBody>
          </Card>

          {/* Record Payment Modal */}
          <Modal
            isOpen={isRecordModalOpen}
            onClose={() => setIsRecordModalOpen(false)}
            title="Record Payment"
            size="xl"
            headerClassName="bg-[#1E2258] border-[#1E2258]"
            titleClassName="text-white"
            containerClassName="border border-[#1E2258]"
          >
            <form onSubmit={handleRecordPayment} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Employee</label>
                  <UserSelect
                    value={selectedEmployee}
                    onChange={(value) => {
                      setSelectedEmployee(value);
                      setSelectedPayslip('');
                    }}
                    placeholder="Select an employee"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Payslip</label>
                  <select
                    name="payslip_id"
                    required
                    value={selectedPayslip}
                    onChange={(e) => setSelectedPayslip(e.target.value)}
                    disabled={!selectedEmployee || !lockedPayslips || lockedPayslips.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-tour="payment-link"
                  >
                    <option value="">Select a payslip (only locked payslips)</option>
                    {lockedPayslips.map((payslip: any) => {
                      const remainingBalance = Number(payslip.net_salary || 0) - (payslip.payments?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0);
                      return (
                        <option key={payslip.id} value={payslip.id}>
                          {new Date(payslip.pay_period_start).toLocaleDateString()} - {new Date(payslip.pay_period_end).toLocaleDateString()} ({Number(payslip.net_salary || 0).toFixed(2)} TND) - Remaining: {remainingBalance.toFixed(2)} TND
                        </option>
                      );
                    })}
                  </select>
                  {!selectedEmployee && (
                    <p className="text-xs text-gray-500 mt-1">Select an employee first</p>
                  )}
                  {selectedEmployee && (!lockedPayslips || lockedPayslips.length === 0) && (
                    <p className="text-xs text-gray-500 mt-1">No locked payslips available. Generate, validate, and lock a payslip first.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Payment Method</label>
                  <select
                    name="method"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-tour="payment-method"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Paid Date</label>
                  <input
                    type="date"
                    name="paid_at"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Reference (Optional)</label>
                  <input
                    type="text"
                    name="reference"
                    placeholder="Transaction reference"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsRecordModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  isLoading={record.isPending}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
                  Record Payment
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

export default PaymentTracking;