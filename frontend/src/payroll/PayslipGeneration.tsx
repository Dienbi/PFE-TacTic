import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { Calculator, Users, CheckCircle, Lock, Trash2, Eye, Search, Filter, ChevronLeft, ChevronRight, Printer, Download, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PayslipGeneration: React.FC = () => {
  const { user, displayName } = useAuth();
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // --- Preview modal state ---
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('payslip.pdf');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewDocRef = useRef<jsPDF | null>(null);

  const { generateSingle, generateBatch, validate, lock, deleteDraft } = usePayslipMutations();

  // Reset to page 1 whenever the filtered dataset changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmployee, selectedStatus, periodStart, periodEnd, searchQuery]);

  const totalItems = payslips?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Clamp currentPage if data shrinks (e.g. after delete)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPayslips = useMemo(() => {
    if (!payslips) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return payslips.slice(start, start + itemsPerPage);
  }, [payslips, currentPage, itemsPerPage]);

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

  // Builds the jsPDF document for a given payslip. Returns a Promise
  // because the logo image loads asynchronously.
  const buildPayslipPdf = (payslip: any): Promise<jsPDF> => {
    return new Promise((resolve) => {
      const doc = new jsPDF();
      const primaryColor = '#1E2258';

      const employeeName = payslip.employee ? `${payslip.employee.nom} ${payslip.employee.prenom}` : 'N/A';
      const period = `${new Date(payslip.pay_period_start).toLocaleDateString()} - ${new Date(payslip.pay_period_end).toLocaleDateString()}`;

      const drawBody = () => {
        doc.setFontSize(18);
        doc.setTextColor(primaryColor);
        doc.text('Payslip', 15, 55);

        doc.setFontSize(11);
        doc.setTextColor('#333333');

        autoTable(doc, {
          startY: 65,
          head: [['Field', 'Value']],
          body: [
            ['Employee', employeeName],
            ['Matricule', payslip.employee?.matricule || 'N/A'],
            ['Period', period],
            ['Gross Salary', `${Number(payslip.gross_salary || 0).toFixed(2)} TND`],
            ['Net Salary', `${Number(payslip.net_salary || 0).toFixed(2)} TND`],
            ['Status', payslip.status],
            ['Created At', new Date(payslip.created_at).toLocaleDateString()],
          ],
          theme: 'grid',
          headStyles: {
            fillColor: [30, 34, 88],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 10,
            cellPadding: 5,
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 100 },
          },
        });

        const pageCount = doc.internal.pages.length - 1;
        doc.setFontSize(9);
        doc.setTextColor('#999999');
        doc.text(`Page ${pageCount}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10);

        resolve(doc);
      };

      const logo = new Image();
      logo.src = '/assets/logo TacTic.png';

      logo.onload = () => {
        doc.addImage(logo, 'PNG', 15, 10, 30, 30);

        doc.setFontSize(24);
        doc.setTextColor(primaryColor);
        doc.text('TacTic', 50, 25);

        doc.setFontSize(12);
        doc.setTextColor('#666666');
        doc.text('HR Management System', 50, 32);

        drawBody();
      };

      logo.onerror = () => {
        doc.setFontSize(24);
        doc.setTextColor(primaryColor);
        doc.text('TacTic', 15, 25);

        doc.setFontSize(12);
        doc.setTextColor('#666666');
        doc.text('HR Management System', 15, 32);

        drawBody();
      };
    });
  };

  // Opens the in-app preview modal instead of a new browser tab/print dialog
  const handlePreviewPayslip = async (id: string) => {
    const payslip = payslips?.find((p: any) => p.id === id);
    if (!payslip) return;

    setIsPreviewLoading(true);
    setIsPreviewModalOpen(true);

    try {
      const doc = await buildPayslipPdf(payslip);
      previewDocRef.current = doc;

      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);

      const employeeName = payslip.employee ? `${payslip.employee.nom}_${payslip.employee.prenom}` : 'payslip';
      setPreviewFileName(`Payslip_${employeeName}_${payslip.pay_period_start}.pdf`);
      setPreviewPdfUrl(url);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
    previewDocRef.current = null;
    setIsPreviewModalOpen(false);
  };

  const handleDownloadFromPreview = () => {
    if (previewDocRef.current) {
      previewDocRef.current.save(previewFileName);
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

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Generate page numbers with ellipsis for large sets
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="payslip-overview">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-2xl font-semibold text-gray-900 text-left">Payslip Generation</h1>
              <p className="text-sm text-gray-600 mt-1 text-left">Generate and manage employee payslips</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Filters */}
          <Card className="mb-6 border-2 border-blue-200 shadow-[0_-2px_4px_rgba(0,0,0,0.05),-2px_0_4px_rgba(0,0,0,0.05),2px_0_4px_rgba(0,0,0,0.05)]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-blue-900">Filters</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
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

          {/* Quick Actions - aligned right */}
          <div className="flex justify-end gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => setIsSingleModalOpen(true)}
              leftIcon={<Calculator className="w-4 h-4" />}
              data-tour="payslip-generate-single"
              className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
              style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
            >
              Generate Single Payslip
            </Button>
            <Button variant="secondary" onClick={() => setIsBatchModalOpen(true)} leftIcon={<Users className="w-4 h-4" />} data-tour="payslip-batch-generation">
              Generate Batch Payslips
            </Button>
          </div>

          {/* Payslips List */}
          <Card data-tour="payslip-existing-list">
            <CardHeader>
              <div className="grid grid-cols-3 items-center">
                <div />
                <h2 className="text-lg font-semibold text-gray-900 text-center">Payslips</h2>
                {totalItems > 0 ? (
                  <div className="flex items-center gap-2 justify-self-end">
                    <label className="text-sm" style={{ color: '#1E2258' }}>Rows per page</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-sm rounded-lg focus:outline-none focus:ring-2"
                      style={{ border: '1px solid #1E2258', color: '#1E2258' }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                ) : (
                  <div />
                )}
              </div>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : payslips && payslips.length > 0 ? (
                <>
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
                      {paginatedPayslips.map((payslip: any) => (
                        <tr key={payslip.id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm font-medium text-left truncate">
                            {payslip.employee ? `${payslip.employee.nom} ${payslip.employee.prenom}` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-left truncate">
                            {new Date(payslip.pay_period_start).toLocaleDateString()} - {new Date(payslip.pay_period_end).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-left truncate">{Number(payslip.gross_salary || 0).toFixed(2)} TND</td>
                          <td className="py-3 px-4 text-sm font-medium text-left truncate">{Number(payslip.net_salary || 0).toFixed(2)} TND</td>
                          <td className="py-3 px-4 text-left" data-tour="payslip-draft-status">
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
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePreviewPayslip(payslip.id)}
                                title="Preview"
                                data-tour="payslip-print"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              {payslip.status === 'draft' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleValidate(payslip.id)}
                                    title="Validate"
                                    data-tour="payslip-confirm"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleDelete(payslip.id)}
                                    title="Delete"
                                    data-tour="payslip-delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {payslip.status === 'validated' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleLock(payslip.id)}
                                  title="Lock"
                                  data-tour="payslip-lock"
                                >
                                  <Lock className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination controls */}
                  <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #1E225820' }}>
                    <p className="text-sm" style={{ color: '#1E2258' }}>
                      Showing {(currentPage - 1) * itemsPerPage + 1}
                      {' '}-{' '}
                      {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ border: '1px solid #1E2258', color: '#1E2258' }}
                        onMouseEnter={(e) => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#1E225815'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {getPageNumbers().map((page, idx) =>
                        page === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-sm" style={{ color: '#1E225880' }}>
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => goToPage(page as number)}
                            className="min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium"
                            style={
                              currentPage === page
                                ? { backgroundColor: '#1E2258', border: '1px solid #1E2258', color: '#fff' }
                                : { border: '1px solid #1E2258', color: '#1E2258' }
                            }
                            onMouseEnter={(e) => { if (currentPage !== page) e.currentTarget.style.backgroundColor = '#1E225815'; }}
                            onMouseLeave={(e) => { if (currentPage !== page) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            {page}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ border: '1px solid #1E2258', color: '#1E2258' }}
                        onMouseEnter={(e) => { if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = '#1E225815'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
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
            headerClassName="bg-[#1E2258] border-[#1E2258]"
            titleClassName="text-white"
            containerClassName="border border-[#1E2258]"
          >
            <form onSubmit={handleGenerateSingle} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Employee</label>
                <UserSelect
                  value={selectedEmployeeForGeneration}
                  onChange={setSelectedEmployeeForGeneration}
                  placeholder="Select an employee"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Period Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Period End</label>
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
                <Button
                  type="submit"
                  variant="ghost"
                  isLoading={generateSingle.isPending}
                  disabled={!selectedEmployeeForGeneration || !periodStart || !periodEnd}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
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
            headerClassName="bg-[#1E2258] border-[#1E2258]"
            titleClassName="text-white"
            containerClassName="border border-[#1E2258]"
          >
            <form onSubmit={handleGenerateBatch} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Employees</label>
                <MultiUserSelect
                  value={selectedEmployees}
                  onChange={setSelectedEmployees}
                  placeholder="Select employees"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Period Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Period End</label>
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
                <Button
                  type="submit"
                  variant="ghost"
                  isLoading={generateBatch.isPending}
                  disabled={selectedEmployees.length === 0 || !periodStart || !periodEnd}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
                  Generate Batch
                </Button>
              </div>
            </form>
          </Modal>

          {/* Payslip Preview Modal — replaces the old new-tab print window */}
          <Modal
            isOpen={isPreviewModalOpen}
            onClose={handleClosePreview}
            title="Payslip Preview"
            size="lg"
            headerClassName="bg-[#1E2258] border-[#1E2258]"
            titleClassName="text-white"
            containerClassName="border border-[#1E2258]"
          >
            <div className="flex flex-col" style={{ height: '75vh' }}>
              <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {isPreviewLoading || !previewPdfUrl ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                    Generating preview...
                  </div>
                ) : (
                  <iframe
                    src={previewPdfUrl}
                    title="Payslip preview"
                    className="w-full h-full"
                    style={{ border: 'none' }}
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={handleClosePreview} leftIcon={<X className="w-4 h-4" />}>
                  Close
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDownloadFromPreview}
                  disabled={!previewPdfUrl}
                  leftIcon={<Download className="w-4 h-4" />}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
                  Download
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

export default PayslipGeneration;