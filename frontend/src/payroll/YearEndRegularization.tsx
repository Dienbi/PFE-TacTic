import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useRegularizationSummary, useEmployeesWithRegularizations } from '../hooks/queries/useTunisianPayroll';
import { useRegularizationMutations } from '../hooks/mutations/useTunisianPayrollMutations';
import { Card, CardHeader, CardBody, CardFooter } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import Modal from '../shared/components/ui/Modal';
import UserSelect from '../shared/components/ui/UserSelect';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import { Calendar, Calculator, Users, FileText, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const YearEndRegularization: React.FC = () => {
  const { user, displayName } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: summary, isLoading, refetch } = useRegularizationSummary(selectedEmployee, selectedYear);
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployeesWithRegularizations(selectedYear, searchTerm);

  const { calculateRegularization, createRegularizationPayslip, batchCalculate } = useRegularizationMutations();

  // Reset to page 1 whenever the filtered dataset changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, searchTerm]);

  const employeesList = employeesData?.employees || [];
  const totalItems = employeesList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Clamp currentPage if data shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return employeesList.slice(start, start + itemsPerPage);
  }, [employeesList, currentPage, itemsPerPage]);

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

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedEmployee('');
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const result = await calculateRegularization.mutateAsync({
      employeeId: formData.get('employee_id') as string,
      year: Number(formData.get('year')),
    });

    setCalculationResult(result.data);
    setIsCalculateModalOpen(false);
  };

  const handleCreatePayslip = async () => {
    if (!selectedEmployee || !selectedYear) return;

    try {
      const result = await createRegularizationPayslip.mutateAsync({
        employeeId: selectedEmployee,
        year: selectedYear,
      });

      if (result.data.success === false) {
        alert(result.data.message || 'No regularization needed');
      } else {
        refetch();
        handleCloseDetails();
      }
    } catch (error) {
      console.error('Failed to create regularization payslip:', error);
      alert('Failed to create regularization payslip. Please try again.');
    }
  };

  const handleBatchCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    await batchCalculate.mutateAsync(Number(formData.get('year')));

    setIsBatchModalOpen(false);
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="regularization-overview">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-2xl font-semibold text-gray-900 text-left">Year-End Regularization</h1>
              <p className="text-sm text-gray-600 mt-1 text-left">Calculate annual tax regularization and create correction payslips</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Employee/Year Selection */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    min="2020"
                    max="2100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsBatchModalOpen(true)}
                  leftIcon={<Users className="w-4 h-4" />}
                  data-tour="regularization-recalculation"
                  className="!bg-[#1E2258] text-white hover:!bg-[#1E2258]/90 border-[#1E2258]"
                >
                  Batch Calculate
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Employees with Regularizations List */}
          <Card className="mb-6" data-tour="regularization-list">
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Employees with Regularizations - {selectedYear}</h2>
                <div className="flex items-center gap-3">
                  {totalItems > 0 && (
                    <div className="flex items-center gap-2">
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
                  )}
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#1E2258', opacity: 0.5 }} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1E2258'; e.currentTarget.style.boxShadow = '0 0 0 2px #1E225840'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {isLoadingEmployees ? (
                <div className="text-center py-12 text-gray-500">Loading employees...</div>
              ) : paginatedEmployees.length > 0 ? (
                <>
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[16%]" />
                      <col className="w-[14%]" />
                      <col className="w-[18%]" />
                      <col className="w-[14%]" />
                      <col className="w-[16%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Employee</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Matricule</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Payslip Count</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Total Net Salary</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Regularization</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 truncate">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEmployees.map((employee: any) => (
                        <tr
                          key={employee.id}
                          className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSelectEmployee(employee.id)}
                        >
                          <td className="py-3 px-4 text-sm font-medium text-left truncate">
                            {employee.nom} {employee.prenom}
                          </td>
                          <td className="py-3 px-4 text-sm text-left truncate">{employee.matricule}</td>
                          <td className="py-3 px-4 text-sm text-left truncate">{employee.payslip_count}</td>
                          <td className="py-3 px-4 text-sm text-left truncate">
                            {employee.total_net_salary != null ? Number(employee.total_net_salary).toFixed(2) : 'N/A'} TND
                          </td>
                          <td className="py-3 px-4 text-left truncate">
                            <Badge variant={employee.has_regularization ? 'success' : 'warning'}>
                              {employee.has_regularization ? 'Created' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectEmployee(employee.id);
                                }}
                                leftIcon={<FileText className="w-4 h-4" />}
                                style={{ color: '#1E2258' }}
                              >
                                View Details
                              </Button>
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
                  No employees found for this year. Try batch calculation first.
                </div>
              )}
            </CardBody>
          </Card>

          {/* Calculation Result */}
          {calculationResult && (
            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-lg font-semibold" style={{ color: '#1E2258' }}>Calculation Result</h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Annual Tax Paid</p>
                    <p className="text-xl font-bold text-gray-900">{calculationResult.total_annual_tax_paid != null ? Number(calculationResult.total_annual_tax_paid).toFixed(2) : 'N/A'} TND</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Actual Annual Tax</p>
                    <p className="text-xl font-bold text-gray-900">{calculationResult.actual_annual_tax != null ? Number(calculationResult.actual_annual_tax).toFixed(2) : 'N/A'} TND</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Regularization Amount</p>
                    <p className={`text-xl font-bold ${calculationResult.regularization_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculationResult.regularization_amount != null ? Number(calculationResult.regularization_amount).toFixed(2) : 'N/A'} TND
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <Badge variant={calculationResult.regularization_type === 'refund' ? 'success' : 'danger'}>
                      {calculationResult.regularization_type}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => setCalculationResult(null)}
                    className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
                  >
                    Close
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Yearly Summary Modal */}
          <Modal
            isOpen={isDetailsModalOpen}
            onClose={handleCloseDetails}
            title={`Yearly Summary - ${selectedYear}`}
            size="lg"
          >
            <CardBody>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : summary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour="regularization-comparison">
                    <div>
                      <p className="text-sm text-gray-600">Total Gross Salary</p>
                      <p className="text-lg font-bold text-gray-900">{summary?.total_gross_salary != null ? Number(summary?.total_gross_salary).toFixed(2) : 'N/A'} TND</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total CNSS Paid</p>
                      <p className="text-lg font-bold text-gray-900">{summary?.total_cnss_paid != null ? Number(summary?.total_cnss_paid).toFixed(2) : 'N/A'} TND</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total IRPP Paid</p>
                      <p className="text-lg font-bold text-gray-900">{summary?.total_irpp_paid != null ? Number(summary?.total_irpp_paid).toFixed(2) : 'N/A'} TND</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total CSS Paid</p>
                      <p className="text-lg font-bold text-gray-900">{summary?.total_css_paid != null ? Number(summary?.total_css_paid).toFixed(2) : 'N/A'} TND</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Net Salary</p>
                      <p className="text-lg font-bold text-gray-900">{summary?.total_net_salary != null ? Number(summary?.total_net_salary).toFixed(2) : 'N/A'} TND</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payslip Count</p>
                      <p className="text-lg font-bold text-gray-900">{summary?.payslip_count ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Regularization Amount</p>
                      <p className={`text-lg font-bold ${summary?.regularization_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary?.regularization_amount != null ? Number(summary?.regularization_amount).toFixed(2) : 'N/A'} TND
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {Math.abs(summary?.regularization_amount || 0) < 0.001 ? (
                      <div className="rounded-lg p-4" style={{ backgroundColor: '#1E225810', border: '1px solid #1E225840' }}>
                        <p className="text-sm" style={{ color: '#1E2258' }}>
                          No regularization needed - the difference between annual tax paid and actual annual tax is negligible.
                        </p>
                      </div>
                    ) : (
                      <Button
                        onClick={handleCreatePayslip}
                        leftIcon={<FileText className="w-4 h-4" />}
                        data-tour="regularization-payslip"
                        className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
                      >
                        Create Regularization Payslip
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No summary data available for this employee and year
                </div>
              )}
            </CardBody>
          </Modal>

          {/* Calculate Modal */}
          <Modal
            isOpen={isCalculateModalOpen}
            onClose={() => setIsCalculateModalOpen(false)}
            title="Calculate Regularization"
            size="md"
          >
            <form onSubmit={handleCalculate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  name="employee_id"
                  required
                  placeholder="EMP00001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
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
                <Button variant="secondary" onClick={() => setIsCalculateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={calculateRegularization.isPending}
                  className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
                >
                  Calculate
                </Button>
              </div>
            </form>
          </Modal>

          {/* Batch Calculate Modal */}
          <Modal
            isOpen={isBatchModalOpen}
            onClose={() => setIsBatchModalOpen(false)}
            title="Batch Calculate Regularization"
            size="md"
          >
            <form onSubmit={handleBatchCalculate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
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
                <Button variant="secondary" onClick={() => setIsBatchModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={batchCalculate.isPending}
                  className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] text-white"
                >
                  Calculate for All Employees
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

export default YearEndRegularization;