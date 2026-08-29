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

  // ---------------------------------------------------------------------
  // Builds the jsPDF document for a given payslip — detailed, professional layout.
  // Returns a Promise because the logo image loads asynchronously.
  // ---------------------------------------------------------------------
  const buildPayslipPdf = (payslip: any): Promise<jsPDF> => {
    return new Promise((resolve) => {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      // ---- design tokens ----
      const navyRgb: [number, number, number] = [30, 34, 88];
      const slate700: [number, number, number] = [51, 65, 85];
      const slate500: [number, number, number] = [100, 116, 139];
      const slate400 = '#94A3B8';
      const slate100 = '#F1F5F9';
      const emerald = '#059669';
      const emeraldBg = '#ECFDF5';
      const amber = '#F59E0B';
      const amberBg = '#FEF3C7';
      const white = '#FFFFFF';

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 12;
      const contentWidth = pageWidth - marginX * 2;

      // Employee data
      const employeeName = payslip.employee
        ? `${payslip.employee.nom} ${payslip.employee.prenom}`
        : 'N/A';
      const matricule = payslip.employee?.matricule || 'N/A';
      const telephone = payslip.employee?.telephone || 'N/A';
      const adresse = payslip.employee?.adresse || 'N/A';
      const dateEmbauche = payslip.employee?.date_embauche
        ? new Date(payslip.employee.date_embauche).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : 'N/A';
      const typeContrat = payslip.employee?.type_contrat || 'N/A';
      const maritalStatus = payslip.employee?.marital_status || 'N/A';
      const childrenCount = payslip.employee?.children_count || 0;
      const soldeConge = payslip.employee?.solde_conge || 0;

      // Period data
      const periodStartFmt = new Date(payslip.pay_period_start).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      const periodEndFmt = new Date(payslip.pay_period_end).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      const generatedDate = new Date(payslip.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });

      // Financial data
      const baseSalary = Number(payslip.base_salary_used || 0);
      const gross = Number(payslip.gross_salary || 0);
      const cnssEmployee = Number(payslip.cnss_employee_amount || 0);
      const cnssEmployer = Number(payslip.cnss_employer_amount || 0);
      const irppMonthly = Number(payslip.irpp_monthly || 0);
      const cssAmount = Number(payslip.css_amount || 0);
      const familyDeductionTotal = Number(payslip.family_deduction_total || 0);
      const profExpenseDeduction = Number(payslip.prof_expense_deduction || 0);
      const net = Number(payslip.net_salary || 0);
      const totalDeductions = cnssEmployee + irppMonthly + cssAmount;

      // Manual formatter — avoids fr-FR's narrow-no-break-space thousands
      // separator, which standard PDF fonts render as garbled "/" glyphs.
      const fmtMoney = (n: number) => {
        const fixed = n.toFixed(3);
        const [intPart, decPart] = fixed.split('.');
        const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return `${grouped},${decPart} TND`;
      };

      const statusLabel: Record<string, string> = {
        draft: 'DRAFT',
        validated: 'VALIDATED',
        locked: 'LOCKED',
        superseded: 'SUPERSEDED',
      };
      const statusColor: Record<string, [number, number, number]> = {
        draft: [217, 119, 6],
        validated: [5, 150, 105],
        locked: [30, 34, 88],
        superseded: [100, 116, 139],
      };
      const sColor = statusColor[payslip.status] || [100, 116, 139];
      const sLabel = statusLabel[payslip.status] || payslip.status;

      let currentY = 0;

      // -----------------------------------------------------------------
      const drawHeader = (hasLogo: boolean) => {
        currentY = 8;

        // Logo
        if (hasLogo) {
          doc.addImage(logo, 'PNG', marginX, currentY, 25, 25);
        }

        // Company info
        const textX = hasLogo ? marginX + 30 : marginX;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...navyRgb);
        doc.text('TacTic', textX, currentY + 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...slate500);
        doc.text('HR Management System', textX, currentY + 14);

        doc.setFontSize(8);
        doc.setTextColor(...slate500);
        doc.text('Tunisia', textX, currentY + 20);

        // Status badge
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const badgeText = sLabel;
        const badgeW = doc.getTextWidth(badgeText) + 10;
        doc.setFillColor(...sColor);
        doc.roundedRect(pageWidth - marginX - badgeW, currentY, badgeW, 7, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(badgeText, pageWidth - marginX - badgeW / 2, currentY + 5, { align: 'center' });

        currentY += 32;
        drawEmployeeDetails();
      };

      // -----------------------------------------------------------------
      const drawEmployeeDetails = () => {
        doc.setFillColor(slate100);
        doc.roundedRect(marginX, currentY, contentWidth, 35, 2, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...navyRgb);
        doc.text('EMPLOYEE INFORMATION', marginX + 4, currentY + 6);

        // Employee details grid
        const colWidth = (contentWidth - 8) / 2;
        const rowHeight = 7;
        const startY = currentY + 12;

        const details: [string, string][] = [
          ['Employee Name', employeeName],
          ['Matricule', matricule],
          ['Telephone', telephone],
          ['Address', adresse],
          ['Employment Date', dateEmbauche],
          ['Contract Type', typeContrat],
          ['Marital Status', maritalStatus],
          ['Children', childrenCount.toString()],
        ];

        details.forEach(([label, value], i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = marginX + 4 + col * colWidth;
          const y = startY + row * rowHeight;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(slate400);
          doc.text(label, x, y);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...slate700);
          doc.text(value, x, y + 4);
        });

        currentY += 40;
        drawPeriodInfo();
      };

      // -----------------------------------------------------------------
      const drawPeriodInfo = () => {
        doc.setFillColor(white);
        doc.roundedRect(marginX, currentY, contentWidth, 12, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(marginX, currentY, contentWidth, 12, 2, 2, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(slate400);
        doc.text('PAY PERIOD', marginX + 4, currentY + 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...navyRgb);
        doc.text(`${periodStartFmt} - ${periodEndFmt}`, marginX + 4, currentY + 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(slate400);
        doc.text('Generated', pageWidth - marginX - 4, currentY + 5, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...slate700);
        doc.text(generatedDate, pageWidth - marginX - 4, currentY + 9, { align: 'right' });

        currentY += 16;
        drawIncomeSection();
      };

      // -----------------------------------------------------------------
      const drawIncomeSection = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...navyRgb);
        doc.text('INCOME', marginX, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          margin: { left: marginX, right: marginX },
          head: [['Description', 'Amount']],
          body: [
            ['Base Salary', fmtMoney(baseSalary)],
            ['Gross Salary', fmtMoney(gross)],
          ],
          theme: 'plain',
          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
            textColor: slate700,
          },
          headStyles: {
            fillColor: navyRgb,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
          },
          columnStyles: {
            0: { cellWidth: contentWidth * 0.65 },
            1: { cellWidth: contentWidth * 0.35, halign: 'right', fontStyle: 'bold' },
          },
        });

        // @ts-ignore
        currentY = (doc as any).lastAutoTable.finalY + 5;
        drawDeductionsSection();
      };

      // -----------------------------------------------------------------
      const drawDeductionsSection = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...navyRgb);
        doc.text('DEDUCTIONS (Employee)', marginX, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          margin: { left: marginX, right: marginX },
          head: [[' Description', 'Amount']],
          body: [
            ['CNSS Employee', fmtMoney(cnssEmployee)],
            ['Income Tax (IRPP)', fmtMoney(irppMonthly)],
            ['CSS Contribution', fmtMoney(cssAmount)],
            ['Family Deduction (Marital/Children)', fmtMoney(familyDeductionTotal)],
            ['Professional Expense Deduction', fmtMoney(profExpenseDeduction)],
          ],
          theme: 'plain',
          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
            textColor: slate700,
          },
          headStyles: {
            fillColor: [217, 119, 6],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
          },
          columnStyles: {
            0: { cellWidth: contentWidth * 0.65 },
            1: { cellWidth: contentWidth * 0.35, halign: 'right', fontStyle: 'bold' },
          },
          didParseCell: function(data) {
            // Highlight family and professional expense deductions
            if (data.section === 'body' && (data.row.index === 3 || data.row.index === 4)) {
              data.cell.styles.textColor = [5, 150, 105];
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });

        // @ts-ignore
        currentY = (doc as any).lastAutoTable.finalY + 5;
        drawEmployerContributions();
      };

      // -----------------------------------------------------------------
      const drawEmployerContributions = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...navyRgb);
        doc.text('EMPLOYER CONTRIBUTIONS', marginX, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          margin: { left: marginX, right: marginX },
          head: [['Description', 'Amount']],
          body: [
            ['CNSS Employer', fmtMoney(cnssEmployer)],
          ],
          theme: 'plain',
          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
            textColor: slate700,
          },
          headStyles: {
            fillColor: [5, 150, 105],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
          },
          columnStyles: {
            0: { cellWidth: contentWidth * 0.65 },
            1: { cellWidth: contentWidth * 0.35, halign: 'right', fontStyle: 'bold' },
          },
        });

        // @ts-ignore
        currentY = (doc as any).lastAutoTable.finalY + 5;
        drawLeaveSection();
      };

      // -----------------------------------------------------------------
      const drawLeaveSection = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...navyRgb);
        doc.text('LEAVE BALANCE', marginX, currentY);

        autoTable(doc, {
          startY: currentY + 3,
          margin: { left: marginX, right: marginX },
          head: [['Leave Type', 'Balance', 'Taken', 'Scheduled']],
          body: [
            ['Annual Leave', soldeConge.toString(), '0', '0'],
          ],
          theme: 'plain',
          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
            textColor: slate700,
          },
          headStyles: {
            fillColor: navyRgb,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
          },
          columnStyles: {
            0: { cellWidth: contentWidth * 0.4 },
            1: { cellWidth: contentWidth * 0.2, halign: 'center' },
            2: { cellWidth: contentWidth * 0.2, halign: 'center' },
            3: { cellWidth: contentWidth * 0.2, halign: 'center' },
          },
        });

        // @ts-ignore
        currentY = (doc as any).lastAutoTable.finalY + 8;
        drawNetPayBox();
      };

      // -----------------------------------------------------------------
      const drawNetPayBox = () => {
        const boxH = 25;
        doc.setFillColor(emeraldBg);
        doc.roundedRect(marginX, currentY, contentWidth, boxH, 2, 2, 'F');
        doc.setDrawColor(emerald);
        doc.setLineWidth(0.5);
        doc.roundedRect(marginX, currentY, contentWidth, boxH, 2, 2, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(emerald);
        doc.text('NET SALARY PAYABLE', marginX + 6, currentY + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor('#065F46');
        doc.text(fmtMoney(net), marginX + 6, currentY + 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(emerald);
        doc.text('Total Deductions: ' + fmtMoney(totalDeductions), pageWidth - marginX - 6, currentY + 10, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor('#065F46');
        doc.text('Pay Period Amount', pageWidth - marginX - 6, currentY + 18, { align: 'right' });

        currentY += boxH + 8;
        drawFooter();
      };

      // -----------------------------------------------------------------
      const drawFooter = () => {
        const footerY = pageHeight - 15;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(marginX, footerY, pageWidth - marginX, footerY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(slate400);
        doc.text(
          'This document is computer-generated and serves as an official record of payment.',
          marginX,
          footerY + 5
        );

        doc.text(
          'TacTic HR Management System - Confidential Document',
          marginX,
          footerY + 10
        );

        const pageCount = doc.internal.pages.length - 1;
        doc.text(`Page ${pageCount} of ${pageCount}`, pageWidth - marginX, footerY + 5, { align: 'right' });

        doc.text(
          `Generated on ${new Date().toLocaleDateString('fr-FR')}`,
          pageWidth - marginX,
          footerY + 10,
          { align: 'right' }
        );

        resolve(doc);
      };

      // -----------------------------------------------------------------
      const logo = new Image();
      logo.src = '/assets/logo TacTic.png';

      logo.onload = () => drawHeader(true);
      logo.onerror = () => drawHeader(false);
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
        <div className="p-6 pt-[90px] max-w-7xl mx-auto">
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
                                onClick={() => handlePreviewPayslip(payslip.id)}
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