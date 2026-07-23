import React, { useState } from 'react';
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
import { Calendar, Calculator, Users, FileText, TrendingUp, TrendingDown, Search } from 'lucide-react';

const YearEndRegularization: React.FC = () => {
  const { user, displayName } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const { data: summary, isLoading, refetch } = useRegularizationSummary(selectedEmployee, selectedYear);
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployeesWithRegularizations(selectedYear, searchTerm);
  
  const { calculateRegularization, createRegularizationPayslip, batchCalculate } = useRegularizationMutations();

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
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Year-End Regularization</h1>
              <p className="text-sm text-gray-600 mt-1">Calculate annual tax regularization and create correction payslips</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Employee/Year Selection */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    min="2020"
                    max="2100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <Button variant="secondary" onClick={() => setIsBatchModalOpen(true)} leftIcon={<Users className="w-4 h-4" />} data-tour="regularization-recalculation">
                  Batch Calculate
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Employees with Regularizations List */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Employees with Regularizations - {selectedYear}</h2>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {isLoadingEmployees ? (
                <div className="text-center py-12 text-gray-500">Loading employees...</div>
              ) : employeesData?.employees && employeesData.employees.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payslip Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Net Salary</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Regularization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employeesData.employees.map((employee: any) => (
                        <tr key={employee.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectEmployee(employee.id)}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{employee.nom} {employee.prenom}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{employee.matricule}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.payslip_count}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.total_net_salary != null ? Number(employee.total_net_salary).toFixed(2) : 'N/A'} TND</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={employee.has_regularization ? 'success' : 'warning'}>
                              {employee.has_regularization ? 'Created' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEmployee(employee.id);
                              }}
                              leftIcon={<FileText className="w-4 h-4" />}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                <h2 className="text-lg font-semibold text-gray-900">Calculation Result</h2>
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
                  <Button onClick={() => setCalculationResult(null)}>Close</Button>
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
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          No regularization needed - the difference between annual tax paid and actual annual tax is negligible.
                        </p>
                      </div>
                    ) : (
                      <Button onClick={handleCreatePayslip} leftIcon={<FileText className="w-4 h-4" />} data-tour="regularization-payslip">
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
                <Button type="submit" isLoading={calculateRegularization.isPending}>
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
                <Button type="submit" isLoading={batchCalculate.isPending}>
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
