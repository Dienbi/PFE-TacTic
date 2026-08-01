import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useFiscalRules, useFiscalRuleById } from '../hooks/queries/useTunisianPayroll';
import { useFiscalRulesMutations } from '../hooks/mutations/useTunisianPayrollMutations';
import { Card, CardHeader, CardBody, CardFooter } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import Modal from '../shared/components/ui/Modal';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import { Plus, Edit, Trash2, Check, X, FileText, Settings, Layers, Users2, ChevronLeft, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';

type FiscalTab = 'rule-sets' | 'brackets' | 'deductions';

const NAVY = '#1E2258';

const FiscalRulesManagement: React.FC = () => {
  const { user, displayName } = useAuth();
  const { data: fiscalRules, isLoading, refetch } = useFiscalRules();
  const [selectedRuleSet, setSelectedRuleSet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FiscalTab>('rule-sets');
  const { data: selectedRuleSetData, refetch: refetchRuleSet } = useFiscalRuleById(selectedRuleSet || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBracketModalOpen, setIsBracketModalOpen] = useState(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPageBrackets, setCurrentPageBrackets] = useState(1);
  const [itemsPerPageBrackets, setItemsPerPageBrackets] = useState(10);
  const [currentPageDeductions, setCurrentPageDeductions] = useState(1);
  const [itemsPerPageDeductions, setItemsPerPageDeductions] = useState(10);

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

  // Pagination logic
  const rulesList = fiscalRules || [];
  const totalItems = rulesList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Reset to page 1 whenever the data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [fiscalRules]);

  // Clamp currentPage if data shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return rulesList.slice(start, start + itemsPerPage);
  }, [rulesList, currentPage, itemsPerPage]);

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

  // Pagination for IRPP brackets
  const bracketsList = selectedRuleSetData?.brackets || [];
  const totalBrackets = bracketsList.length;
  const totalPagesBrackets = Math.max(1, Math.ceil(totalBrackets / itemsPerPageBrackets));

  useEffect(() => {
    setCurrentPageBrackets(1);
  }, [selectedRuleSetData?.brackets]);

  useEffect(() => {
    if (currentPageBrackets > totalPagesBrackets) {
      setCurrentPageBrackets(totalPagesBrackets);
    }
  }, [totalPagesBrackets, currentPageBrackets]);

  const paginatedBrackets = useMemo(() => {
    const start = (currentPageBrackets - 1) * itemsPerPageBrackets;
    return bracketsList.slice(start, start + itemsPerPageBrackets);
  }, [bracketsList, currentPageBrackets, itemsPerPageBrackets]);

  const goToPageBrackets = (page: number) => {
    if (page < 1 || page > totalPagesBrackets) return;
    setCurrentPageBrackets(page);
  };

  const getPageNumbersBrackets = () => {
    const pages: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPagesBrackets; i++) {
      if (
        i === 1 ||
        i === totalPagesBrackets ||
        (i >= currentPageBrackets - delta && i <= currentPageBrackets + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  // Pagination for family deductions
  const deductionsList = selectedRuleSetData?.deductions || [];
  const totalDeductions = deductionsList.length;
  const totalPagesDeductions = Math.max(1, Math.ceil(totalDeductions / itemsPerPageDeductions));

  useEffect(() => {
    setCurrentPageDeductions(1);
  }, [selectedRuleSetData?.deductions]);

  useEffect(() => {
    if (currentPageDeductions > totalPagesDeductions) {
      setCurrentPageDeductions(totalPagesDeductions);
    }
  }, [totalPagesDeductions, currentPageDeductions]);

  const paginatedDeductions = useMemo(() => {
    const start = (currentPageDeductions - 1) * itemsPerPageDeductions;
    return deductionsList.slice(start, start + itemsPerPageDeductions);
  }, [deductionsList, currentPageDeductions, itemsPerPageDeductions]);

  const goToPageDeductions = (page: number) => {
    if (page < 1 || page > totalPagesDeductions) return;
    setCurrentPageDeductions(page);
  };

  const getPageNumbersDeductions = () => {
    const pages: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPagesDeductions; i++) {
      if (
        i === 1 ||
        i === totalPagesDeductions ||
        (i >= currentPageDeductions - delta && i <= currentPageDeductions + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

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
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Confirm',
        text: 'Rule set must have at least one IRPP bracket before confirmation',
        confirmButtonColor: '#1E2258',
      });
      return;
    }
    await confirm.mutateAsync(id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You want to delete this draft rule set?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E2258',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });
    if (result.isConfirmed) {
      await deleteDraft.mutateAsync(id);
      refetch();
    }
  };

  const tabItems: { id: FiscalTab; label: string; icon: React.ReactNode }[] = [
    { id: 'rule-sets', label: 'Rule Sets', icon: <Settings className="w-4 h-4" /> },
    { id: 'brackets', label: 'IRPP Brackets', icon: <Layers className="w-4 h-4" /> },
    { id: 'deductions', label: 'Family Deductions', icon: <Users2 className="w-4 h-4" /> },
  ];

  const currentRuleSetStatus = fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status;

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
        <div className="p-6 pt-[90px] max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="fiscal-overview">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-2xl font-semibold text-gray-900 text-left">Fiscal Rules Management</h1>
              <p className="text-sm text-gray-600 mt-1 text-left">Manage Tunisian tax rules, IRPP brackets, and family deductions</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Agenda-style tab bar */}
          <div
            className="flex items-center gap-2 p-1.5 rounded-xl mb-6 w-fit"
            style={{ backgroundColor: `${NAVY}0D`, border: `1px solid ${NAVY}20` }}
          >
            {tabItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={
                    isActive
                      ? { backgroundColor: NAVY, color: '#fff', boxShadow: '0 1px 3px rgba(30,34,88,0.35)' }
                      : { backgroundColor: 'transparent', color: NAVY }
                  }
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Rule Sets Tab */}
          {activeTab === 'rule-sets' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Fiscal Rule Sets</h2>
                <div className="flex items-center gap-3">
                  {totalItems > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#1E2258]">Rows per page</label>
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
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    data-tour="fiscal-create"
                    variant="primary"
                    className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258]"
                  >
                    Create Draft
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {paginatedRules.map((ruleSet: any) => (
                  <Card
                    key={ruleSet.id}
                    hover
                    className="shadow-md border border-gray-200 hover:shadow-xl hover:border-[#1E225830] transition-all duration-300 bg-gradient-to-br from-white to-gray-50"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold" style={{ color: NAVY }}>{ruleSet.year} Fiscal Rules</h3>
                            <Badge variant={ruleSet.is_confirmed ? 'success' : 'warning'}>
                              {ruleSet.is_confirmed ? 'Confirmed' : 'Draft'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Effective: {new Date(ruleSet.effective_from).toLocaleDateString()} -{' '}
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
                            style={{ color: NAVY }}
                            title="View brackets"
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
                                style={{ borderColor: NAVY, color: NAVY }}
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
                          <p className="text-gray-500">CNSS Employee Rate</p>
                          <p className="font-semibold text-gray-900">{(Number(ruleSet.cnss_employee_rate || 0) * 100).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">CNSS Employer Rate</p>
                          <p className="font-semibold text-gray-900">{(Number(ruleSet.cnss_employer_rate || 0) * 100).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">CSS Rate</p>
                          <p className="font-semibold text-gray-900">{(Number(ruleSet.css_rate || 0) * 100).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">IRPP Brackets</p>
                          <p className="font-semibold text-gray-900">{ruleSet.irpp_brackets?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Family Deductions</p>
                          <p className="font-semibold text-gray-900">{ruleSet.family_deductions?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Min Annual Tax</p>
                          <p className="font-semibold text-gray-900">{Number(ruleSet.min_annual_tax || 0).toFixed(2)} TND</p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {(!fiscalRules || fiscalRules.length === 0) && (
                <Card className="shadow-sm">
                  <CardBody>
                    <div className="text-center py-12 text-gray-500">No fiscal rule sets found. Create one to get started.</div>
                  </CardBody>
                </Card>
              )}

              {/* Pagination controls */}
              {totalItems > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #1E225820' }}>
                  <p className="text-sm text-[#1E2258]">
                    Showing {(currentPage - 1) * itemsPerPage + 1}
                    {' '}-{' '}
                    {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E2258] text-[#1E2258] hover:bg-[#1E2258] hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {getPageNumbers().map((page, idx) => (
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-sm" style={{ color: '#1E225880' }}>
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page as number)}
                          className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium border border-[#1E2258] transition-colors ${currentPage === page ? 'bg-[#1E2258] text-white' : 'text-[#1E2258] hover:bg-[#1E2258] hover:text-white'}`}
                        >
                          {page}
                        </button>
                      )
                    ))}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E2258] text-[#1E2258] hover:bg-[#1E2258] hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* IRPP Brackets Tab */}
          {activeTab === 'brackets' && (
            <div className="space-y-4" data-tour="fiscal-irpp">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  IRPP Brackets {selectedRuleSetData && `- ${selectedRuleSetData.year}`}
                </h2>
                <div className="flex items-center gap-3">
                  {totalBrackets > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#1E2258]">Rows per page</label>
                      <select
                        value={itemsPerPageBrackets}
                        onChange={(e) => {
                          setItemsPerPageBrackets(Number(e.target.value));
                          setCurrentPageBrackets(1);
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
                  <Button
                    onClick={() => {
                      const ruleSet = fiscalRules?.find((r: any) => r.id === selectedRuleSet);
                      if (ruleSet?.status !== 'draft') {
                        Swal.fire({
                          icon: 'warning',
                          title: 'Cannot Add Bracket',
                          text: 'IRPP brackets can only be added to draft rule sets',
                          confirmButtonColor: '#1E2258',
                        });
                        return;
                      }
                      setIsBracketModalOpen(true);
                    }}
                    leftIcon={<Plus className="w-4 h-4" />}
                    disabled={!selectedRuleSet || fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status !== 'draft'}
                    variant="primary"
                    className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] disabled:opacity-40"
                  >
                    Add Bracket
                  </Button>
                </div>
              </div>

              <Card className="shadow-md border border-gray-200 bg-gradient-to-br from-white to-gray-50">
                <CardBody>
                  <p className="text-sm font-medium mb-2 text-[#1E2258]">
                    Select a rule set to manage IRPP brackets
                  </p>
                  <select
                    value={selectedRuleSet || ''}
                    onChange={(e) => setSelectedRuleSet(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: `${NAVY}40` }}
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
                      {currentRuleSetStatus !== 'draft' ? (
                        <p className="text-sm text-red-600">
                          This rule set is {currentRuleSetStatus}. Only draft rule sets can have brackets added.
                        </p>
                      ) : (
                        <p className="text-sm" style={{ color: '#16A34A' }}>
                          Draft rule set selected. You can add brackets.
                        </p>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card className="shadow-sm">
                <CardBody>
                  {paginatedBrackets.length > 0 ? (
                    <>
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[14%]" />
                        <col className="w-[24%]" />
                        <col className="w-[24%]" />
                        <col className="w-[18%]" />
                        <col className="w-[20%]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Order</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Min Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Max Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Rate</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 truncate">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBrackets.map((bracket: any) => (
                          <tr key={bracket.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 text-sm text-left truncate">
                              <Badge variant="default">#{bracket.bracket_order}</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-left truncate">{Number(bracket.min_annual_amount || 0).toFixed(2)} TND</td>
                            <td className="py-3 px-4 text-sm text-left truncate">
                              {bracket.max_annual_amount ? Number(bracket.max_annual_amount).toFixed(2) + ' TND' : '∞'}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-left truncate">{(Number(bracket.rate || 0) * 100).toFixed(2)}%</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => deleteIrppBracket.mutateAsync(bracket.id)}
                                  leftIcon={<Trash2 className="w-4 h-4" />}
                                  disabled={currentRuleSetStatus !== 'draft'}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination controls */}
                    {totalBrackets > 0 && (
                      <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #1E225820' }}>
                        <p className="text-sm text-[#1E2258]">
                          Showing {(currentPageBrackets - 1) * itemsPerPageBrackets + 1}
                          {' '}-{' '}
                          {Math.min(currentPageBrackets * itemsPerPageBrackets, totalBrackets)} of {totalBrackets}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => goToPageBrackets(currentPageBrackets - 1)}
                            disabled={currentPageBrackets === 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E2258] text-[#1E2258] hover:bg-[#1E2258] hover:text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {getPageNumbersBrackets().map((page, idx) => (
                            page === '...' ? (
                              <span key={`ellipsis-${idx}`} className="px-2 text-sm" style={{ color: '#1E225880' }}>
                                ...
                              </span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => goToPageBrackets(page as number)}
                                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium border border-[#1E2258] transition-colors ${currentPageBrackets === page ? 'bg-[#1E2258] text-white' : 'text-[#1E2258] hover:bg-[#1E2258] hover:text-white'}`}
                              >
                                {page}
                              </button>
                            )
                          ))}

                          <button
                            onClick={() => goToPageBrackets(currentPageBrackets + 1)}
                            disabled={currentPageBrackets === totalPagesBrackets}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E2258] text-[#1E2258] hover:bg-[#1E2258] hover:text-white transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      {selectedRuleSet ? 'No IRPP brackets found for this rule set.' : 'Select a rule set above to view its brackets.'}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {/* Family Deductions Tab */}
          {activeTab === 'deductions' && (
            <div className="space-y-4" data-tour="fiscal-family">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Family Deductions {selectedRuleSetData && `- ${selectedRuleSetData.year}`}
                </h2>
                <div className="flex items-center gap-3">
                  {totalDeductions > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#1E2258]">Rows per page</label>
                      <select
                        value={itemsPerPageDeductions}
                        onChange={(e) => {
                          setItemsPerPageDeductions(Number(e.target.value));
                          setCurrentPageDeductions(1);
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
                  <Button
                    onClick={() => {
                      const ruleSet = fiscalRules?.find((r: any) => r.id === selectedRuleSet);
                      if (ruleSet?.status !== 'draft') {
                        Swal.fire({
                          icon: 'warning',
                          title: 'Cannot Add Deduction',
                          text: 'Family deductions can only be added to draft rule sets',
                          confirmButtonColor: '#1E2258',
                        });
                        return;
                      }
                      setIsDeductionModalOpen(true);
                    }}
                    leftIcon={<Plus className="w-4 h-4" />}
                    disabled={!selectedRuleSet || fiscalRules?.find((r: any) => r.id === selectedRuleSet)?.status !== 'draft'}
                    variant="primary"
                    className="bg-[#1E2258] hover:bg-[#1E2258]/90 border-[#1E2258] disabled:opacity-40"
                  >
                    Add Deduction
                  </Button>
                </div>
              </div>

              <Card className="shadow-md border border-gray-200 bg-gradient-to-br from-white to-gray-50">
                <CardBody>
                  <p className="text-sm font-medium mb-2 text-[#1E2258]">
                    Select a rule set to manage family deductions
                  </p>
                  <select
                    value={selectedRuleSet || ''}
                    onChange={(e) => setSelectedRuleSet(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: `${NAVY}40` }}
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
                      {currentRuleSetStatus !== 'draft' ? (
                        <p className="text-sm text-red-600">
                          This rule set is {currentRuleSetStatus}. Only draft rule sets can have deductions added.
                        </p>
                      ) : (
                        <p className="text-sm" style={{ color: '#16A34A' }}>
                          Draft rule set selected. You can add deductions.
                        </p>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card className="shadow-sm">
                <CardBody>
                  {paginatedDeductions.length > 0 ? (
                    <>
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[36%]" />
                        <col className="w-[28%]" />
                        <col className="w-[18%]" />
                        <col className="w-[18%]" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Type</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Annual Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 truncate">Max Count</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 truncate">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDeductions.map((deduction: any) => (
                          <tr key={deduction.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 text-sm text-left truncate capitalize">{deduction.deduction_type.replace(/_/g, ' ')}</td>
                            <td className="py-3 px-4 text-sm font-medium text-left truncate">{Number(deduction.annual_amount || 0).toFixed(2)} TND</td>
                            <td className="py-3 px-4 text-sm text-left truncate">{deduction.max_count || 'Unlimited'}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => deleteFamilyDeduction.mutateAsync(deduction.id)}
                                  leftIcon={<Trash2 className="w-4 h-4" />}
                                  disabled={currentRuleSetStatus !== 'draft'}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination controls */}
                    {totalDeductions > 0 && (
                      <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid #1E225820' }}>
                        <p className="text-sm text-[#1E2258]">
                          Showing {(currentPageDeductions - 1) * itemsPerPageDeductions + 1}
                          {' '}-{' '}
                          {Math.min(currentPageDeductions * itemsPerPageDeductions, totalDeductions)} of {totalDeductions}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => goToPageDeductions(currentPageDeductions - 1)}
                            disabled={currentPageDeductions === 1}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E2258] text-[#1E2258] hover:bg-[#1E2258] hover:text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {getPageNumbersDeductions().map((page, idx) => (
                            page === '...' ? (
                              <span key={`ellipsis-${idx}`} className="px-2 text-sm" style={{ color: '#1E225880' }}>
                                ...
                              </span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => goToPageDeductions(page as number)}
                                className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium border border-[#1E2258] transition-colors ${currentPageDeductions === page ? 'bg-[#1E2258] text-white' : 'text-[#1E2258] hover:bg-[#1E2258] hover:text-white'}`}
                              >
                                {page}
                              </button>
                            )
                          ))}

                          <button
                            onClick={() => goToPageDeductions(currentPageDeductions + 1)}
                            disabled={currentPageDeductions === totalPagesDeductions}
                            className="p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed border border-[#1E2258] text-[#1E2258] hover:bg-[#1E2258] hover:text-white transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      {selectedRuleSet ? 'No family deductions found for this rule set.' : 'Select a rule set above to view its deductions.'}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {/* Create Draft Modal */}
          <Modal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Create Rule Set"
            size="lg"
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createDraft.isPending}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
                  Create Draft
                </Button>
              </div>
            }
          >
            <form onSubmit={handleCreateDraft} className="space-y-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g., 2024 Fiscal Rules"
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
            </form>
          </Modal>

          {/* Add IRPP Bracket Modal */}
          <Modal
            isOpen={isBracketModalOpen}
            onClose={() => setIsBracketModalOpen(false)}
            title="Add IRPP Bracket"
            size="md"
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsBracketModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={addIrppBracket.isPending}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
                  Add Bracket
                </Button>
              </div>
            }
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
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to add bracket. Please try again.',
                  confirmButtonColor: '#1E2258',
                });
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
            </form>
          </Modal>

          {/* Add Family Deduction Modal */}
          <Modal
            isOpen={isDeductionModalOpen}
            onClose={() => setIsDeductionModalOpen(false)}
            title="Add Family Deduction"
            size="md"
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setIsDeductionModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={addFamilyDeduction.isPending}
                  className="!bg-[#1E2258] hover:!bg-[#1E2258]/90 !border-[#1E2258] !text-white"
                  style={{ backgroundColor: '#1E2258', borderColor: '#1E2258', color: 'white' }}
                >
                  Add Deduction
                </Button>
              </div>
            }
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
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to add deduction. Please try again.',
                  confirmButtonColor: '#1E2258',
                });
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
                  <option value="head_of_household">Head of Household - Primary breadwinner deduction</option>
                  <option value="child">Child - General child deduction</option>
                  <option value="disabled_child">Disabled Child - Additional deduction for disabled children</option>
                  <option value="student_child_non_scholarship">Student Child (Non-Scholarship) - For students not receiving scholarships</option>
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
                  placeholder="e.g., 150.00"
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
                  placeholder="e.g., 3 for children"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum number of dependents this deduction applies to. Leave empty for unlimited.</p>
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