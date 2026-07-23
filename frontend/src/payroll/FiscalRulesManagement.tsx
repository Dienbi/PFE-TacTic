import React, { useState } from 'react';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useFiscalRules, useFiscalRuleById } from '../hooks/queries/useTunisianPayroll';
import { useFiscalRulesMutations } from '../hooks/mutations/useTunisianPayrollMutations';
import { Card, CardHeader, CardBody, CardFooter } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import Modal from '../shared/components/ui/Modal';
import Tabs from '../shared/components/ui/Tabs';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import { Plus, Edit, Trash2, Check, X, FileText, Settings } from 'lucide-react';

const FiscalRulesManagement: React.FC = () => {
  const { user, displayName } = useAuth();
  const { data: fiscalRules, isLoading, refetch } = useFiscalRules();
  const [selectedRuleSet, setSelectedRuleSet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('rule-sets');
  const { data: selectedRuleSetData, refetch: refetchRuleSet } = useFiscalRuleById(selectedRuleSet || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBracketModalOpen, setIsBracketModalOpen] = useState(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  
  const {
    createDraft,
    updateDraft,
    confirm,
    supersede,
    deleteDraft,
    addIrppBracket,
    updateIrppBracket,
    deleteIrppBracket,
    addFamilyDeduction,
    updateFamilyDeduction,
    deleteFamilyDeduction,
  } = useFiscalRulesMutations();

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    await createDraft.mutateAsync({
      year: Number(formData.get('year')),
      effective_from: formData.get('effective_from') as string,
      effective_to: formData.get('effective_to') as string || undefined,
      cnss_employee_rate: Number(formData.get('cnss_employee_rate')),
      cnss_employer_rate: Number(formData.get('cnss_employer_rate')),
      cnss_monthly_ceiling: formData.get('cnss_monthly_ceiling') ? Number(formData.get('cnss_monthly_ceiling')) : undefined,
      css_rate: Number(formData.get('css_rate')),
      css_exempt_annual_net_threshold: Number(formData.get('css_exempt_annual_net_threshold')),
      prof_expense_rate: Number(formData.get('prof_expense_rate')),
      prof_expense_annual_cap: Number(formData.get('prof_expense_annual_cap')),
      min_annual_tax: Number(formData.get('min_annual_tax')),
    });
    
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleConfirm = async (id: string) => {
    const ruleSet = fiscalRules?.find((r: any) => r.id === id);
    if (!ruleSet?.irpp_brackets || ruleSet.irpp_brackets.length === 0) {
      alert('Rule set must have at least one IRPP bracket before confirmation');
      return;
    }
    await confirm.mutateAsync(id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this draft rule set?')) {
      await deleteDraft.mutateAsync(id);
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Navbar userName={displayName || ''} userRole={user?.role || ''} />
          <div className="p-6">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="fiscal-overview">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Fiscal Rules Management</h1>
              <p className="text-sm text-gray-600 mt-1">Manage Tunisian tax rules, IRPP brackets, and family deductions</p>
            </div>
            <PayrollGuideButton />
          </div>

          <Tabs
            defaultTab="rule-sets"
            onTabChange={setActiveTab}
            tabs={[
              {
                id: 'rule-sets',
                label: 'Rule Sets',
                icon: <Settings className="w-4 h-4" />,
                content: (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">Fiscal Rule Sets</h2>
                      <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} data-tour="fiscal-create">
                        Create Draft
                      </Button>
                    </div>
                    
                    <div className="grid gap-4">
                      {fiscalRules?.map((ruleSet: any) => (
                        <Card key={ruleSet.id} hover>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-gray-900">{ruleSet.year} Fiscal Rules</h3>
                                  <Badge variant={ruleSet.is_confirmed ? 'success' : 'warning'}>
                                    {ruleSet.is_confirmed ? 'Confirmed' : 'Draft'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  Effective: {new Date(ruleSet.effective_from).toLocaleDateString()} - 
                                  {ruleSet.effective_to ? new Date(ruleSet.effective_to).toLocaleDateString() : 'Present'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRuleSet(ruleSet.id);
                                    setActiveTab('brackets');
                                  }}
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                {ruleSet.status === 'draft' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleConfirm(ruleSet.id)}
                                      leftIcon={<Check className="w-4 h-4" />}
                                      data-tour="fiscal-apply"
                                    >
                                      Confirm
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => handleDelete(ruleSet.id)}
                                      leftIcon={<Trash2 className="w-4 h-4" />}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardBody data-tour="fiscal-variables">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">CNSS Employee Rate</p>
                                <p className="font-medium">{(Number(ruleSet.cnss_employee_rate || 0) * 100).toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-600">CNSS Employer Rate</p>
                                <p className="font-medium">{(Number(ruleSet.cnss_employer_rate || 0) * 100).toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-600">CSS Rate</p>
                                <p className="font-medium">{(Number(ruleSet.css_rate || 0) * 100).toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-600">IRPP Brackets</p>
                                <p className="font-medium">{ruleSet.irpp_brackets?.length || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Family Deductions</p>
                                <p className="font-medium">{ruleSet.family_deductions?.length || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Min Annual Tax</p>
                                <p className="font-medium">{Number(ruleSet.min_annual_tax || 0).toFixed(2)} TND</p>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                id: 'brackets',
                label: 'IRPP Brackets',
                icon: <FileText className="w-4 h-4" />,
                content: (
                  <div className="space-y-4" data-tour="fiscal-irpp">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">
                        IRPP Brackets {selectedRuleSetData && `- ${selectedRuleSetData.year}`}
                      </h2>
                      <Button 
                        onClick={() => {
                          const ruleSet = fiscalRules?.find((r: any) => r.id === selectedRuleSet);
                          if (ruleSet?.status !== 'draft') {
                            alert('IRPP brackets can only be added to draft rule sets');
                            return;
                          }
                          setIsBracketModalOpen(true);
                        }} 
                        leftIcon={<Plus className="w-4 h-4" />}
                        disabled={!selectedRuleSet || fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status !== 'draft'}
                      >
                        Add Bracket
                      </Button>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        Select a rule set below to manage IRPP brackets:
                      </p>
                      <select
                        value={selectedRuleSet || ''}
                        onChange={(e) => {
                          setSelectedRuleSet(e.target.value);
                        }}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a rule set</option>
                        {fiscalRules?.map((ruleSet: any) => (
                          <option key={ruleSet.id} value={ruleSet.id}>
                            {ruleSet.year} Fiscal Rules ({ruleSet.status}) {ruleSet.status !== 'draft' && '- Cannot add brackets'}
                          </option>
                        ))}
                      </select>
                      {selectedRuleSet && (
                        <div className="mt-2">
                          {fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status !== 'draft' ? (
                            <p className="text-sm text-red-600">
                              This rule set is {fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status}. Only draft rule sets can have brackets added.
                            </p>
                          ) : (
                            <p className="text-sm text-green-600">
                              Draft rule set selected. You can add brackets.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Card>
                      <CardBody>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Order</th>
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Min Amount</th>
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Max Amount</th>
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Rate</th>
                              <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRuleSetData?.brackets?.map((bracket: any) => (
                              <tr key={bracket.id} className="border-b border-gray-100">
                                <td className="py-3 px-4 text-sm">{bracket.bracket_order}</td>
                                <td className="py-3 px-4 text-sm">{Number(bracket.min_annual_amount || 0).toFixed(2)} TND</td>
                                <td className="py-3 px-4 text-sm">
                                  {bracket.max_annual_amount ? Number(bracket.max_annual_amount).toFixed(2) + ' TND' : '∞'}
                                </td>
                                <td className="py-3 px-4 text-sm">{(Number(bracket.rate || 0) * 100).toFixed(2)}%</td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => deleteIrppBracket.mutateAsync(bracket.id)}
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                  >
                                    Delete
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardBody>
                    </Card>
                  </div>
                ),
              },
              {
                id: 'deductions',
                label: 'Family Deductions',
                icon: <FileText className="w-4 h-4" />,
                content: (
                  <div className="space-y-4" data-tour="fiscal-family">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Family Deductions {selectedRuleSetData && `- ${selectedRuleSetData.year}`}
                      </h2>
                      <Button 
                        onClick={() => {
                          const ruleSet = fiscalRules?.find((r: any) => r.id === selectedRuleSet);
                          if (ruleSet?.status !== 'draft') {
                            alert('Family deductions can only be added to draft rule sets');
                            return;
                          }
                          setIsDeductionModalOpen(true);
                        }} 
                        leftIcon={<Plus className="w-4 h-4" />}
                        disabled={!selectedRuleSet || fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status !== 'draft'}
                      >
                        Add Deduction
                      </Button>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        Select a rule set below to manage family deductions:
                      </p>
                      <select
                        value={selectedRuleSet || ''}
                        onChange={(e) => {
                          setSelectedRuleSet(e.target.value);
                        }}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a rule set</option>
                        {fiscalRules?.map((ruleSet: any) => (
                          <option key={ruleSet.id} value={ruleSet.id}>
                            {ruleSet.year} Fiscal Rules ({ruleSet.status}) {ruleSet.status !== 'draft' && '- Cannot add deductions'}
                          </option>
                        ))}
                      </select>
                      {selectedRuleSet && (
                        <div className="mt-2">
                          {fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status !== 'draft' ? (
                            <p className="text-sm text-red-600">
                              This rule set is {fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status}. Only draft rule sets can have deductions added.
                            </p>
                          ) : (
                            <p className="text-sm text-green-600">
                              Draft rule set selected. You can add deductions.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Card>
                      <CardBody>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Type</th>
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Annual Amount</th>
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Max Count</th>
                              <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRuleSetData?.deductions?.map((deduction: any) => (
                              <tr key={deduction.id} className="border-b border-gray-100">
                                <td className="py-3 px-4 text-sm capitalize">{deduction.deduction_type.replace(/_/g, ' ')}</td>
                                <td className="py-3 px-4 text-sm">{Number(deduction.annual_amount || 0).toFixed(2)} TND</td>
                                <td className="py-3 px-4 text-sm">{deduction.max_count || 'Unlimited'}</td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => deleteFamilyDeduction.mutateAsync(deduction.id)}
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                  >
                                    Delete
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardBody>
                    </Card>
                  </div>
                ),
              },
            ]}
          />
          {/* Create Draft Modal */}
          <Modal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Create Draft Rule Set"
            size="lg"
          >
            <form onSubmit={handleCreateDraft} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    name="year"
                    required
                    min="2020"
                    max="2100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                  <input
                    type="date"
                    name="effective_from"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    name="effective_to"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNSS Employee Rate</label>
                  <input
                    type="number"
                    name="cnss_employee_rate"
                    required
                    step="0.0001"
                    min="0"
                    max="1"
                    placeholder="0.0975"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNSS Employer Rate</label>
                  <input
                    type="number"
                    name="cnss_employer_rate"
                    required
                    step="0.0001"
                    min="0"
                    max="1"
                    placeholder="0.1625"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNSS Monthly Ceiling (Optional)</label>
                  <input
                    type="number"
                    name="cnss_monthly_ceiling"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CSS Rate</label>
                  <input
                    type="number"
                    name="css_rate"
                    required
                    step="0.0001"
                    min="0"
                    max="1"
                    placeholder="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CSS Exempt Annual Net Threshold</label>
                  <input
                    type="number"
                    name="css_exempt_annual_net_threshold"
                    required
                    step="0.01"
                    min="0"
                    placeholder="5000.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional Expense Rate</label>
                  <input
                    type="number"
                    name="prof_expense_rate"
                    required
                    step="0.0001"
                    min="0"
                    max="1"
                    placeholder="0.10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional Expense Annual Cap</label>
                  <input
                    type="number"
                    name="prof_expense_annual_cap"
                    required
                    step="0.01"
                    min="0"
                    placeholder="2000.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Annual Tax</label>
                  <input
                    type="number"
                    name="min_annual_tax"
                    required
                    step="0.01"
                    min="0"
                    placeholder="25.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createDraft.isPending}>
                  Create Draft
                </Button>
              </div>
            </form>
          </Modal>

          {/* Add IRPP Bracket Modal */}
          <Modal
            isOpen={isBracketModalOpen}
            onClose={() => setIsBracketModalOpen(false)}
            title="Add IRPP Bracket"
            size="md"
          >
            <form onSubmit={async (e) => {
              e.preventDefault();
              console.log('Submitting bracket form, selectedRuleSet:', selectedRuleSet);
              try {
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const bracketData = {
                  ruleSetId: selectedRuleSet!,
                  data: {
                    bracket_order: Number(formData.get('bracket_order')),
                    min_annual_amount: Number(formData.get('min_annual_amount')),
                    max_annual_amount: formData.get('max_annual_amount') ? Number(formData.get('max_annual_amount')) : null,
                    rate: Number(formData.get('rate')),
                  },
                };
                console.log('Bracket data:', bracketData);
                await addIrppBracket.mutateAsync(bracketData);
                console.log('Bracket added successfully');
                setIsBracketModalOpen(false);
                refetch();
                refetchRuleSet();
              } catch (error) {
                console.error('Error adding bracket:', error);
                alert('Failed to add bracket. Please try again.');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bracket Order</label>
                <input
                  type="number"
                  name="bracket_order"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Annual Amount (TND)</label>
                <input
                  type="number"
                  name="min_annual_amount"
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Annual Amount (TND, Optional)</label>
                <input
                  type="number"
                  name="max_annual_amount"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (0-1)</label>
                <input
                  type="number"
                  name="rate"
                  required
                  step="0.0001"
                  min="0"
                  max="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsBracketModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={addIrppBracket.isPending}>
                  Add Bracket
                </Button>
              </div>
            </form>
          </Modal>

          {/* Add Family Deduction Modal */}
          <Modal
            isOpen={isDeductionModalOpen}
            onClose={() => setIsDeductionModalOpen(false)}
            title="Add Family Deduction"
            size="md"
          >
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                await addFamilyDeduction.mutateAsync({
                  ruleSetId: selectedRuleSet!,
                  data: {
                    deduction_type: formData.get('deduction_type') as string,
                    annual_amount: Number(formData.get('annual_amount')),
                    max_count: formData.get('max_count') ? Number(formData.get('max_count')) : null,
                  },
                });
                setIsDeductionModalOpen(false);
                refetch();
                refetchRuleSet();
              } catch (error) {
                console.error('Error adding deduction:', error);
                alert('Failed to add deduction. Please try again.');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deduction Type</label>
                <select
                  name="deduction_type"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="dependent">Dependent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Amount (TND)</label>
                <input
                  type="number"
                  name="annual_amount"
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Count (Optional)</label>
                <input
                  type="number"
                  name="max_count"
                  step="1"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setIsDeductionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={addFamilyDeduction.isPending}>
                  Add Deduction
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

export default FiscalRulesManagement;
