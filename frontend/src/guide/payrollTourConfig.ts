export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  route?: string;
}

export interface ScreenTour {
  id: string;
  screenName: string;
  description: string;
  route: string;
  steps: TourStep[];
}

export const payrollTourConfig: ScreenTour[] = [
  {
    id: 'dashboard',
    screenName: 'Dashboard',
    description: 'Overview of payroll module with KPIs and quick actions',
    route: '/payroll',
    steps: [
      {
        target: '[data-tour="dashboard-welcome"]',
        title: 'Welcome',
        content: 'Welcome to the Payroll module. This tour will walk you through everything you can do here.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="dashboard-kpis"]',
        title: 'KPIs',
        content: 'These cards show your key payroll metrics at a glance (e.g. total payroll cost, employees paid, pending payslips).',
        placement: 'bottom',
      },
      {
        target: '[data-tour="dashboard-quick-actions"]',
        title: 'Quick actions',
        content: 'Use these shortcuts to jump straight into common tasks like generating a payslip or recording a payment, without navigating through menus.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="dashboard-recent-activity"]',
        title: 'Recent activity tab',
        content: 'This tab shows the latest actions performed in payroll — useful for a quick daily check of what changed.',
        placement: 'right',
      },
      {
        target: '[data-tour="dashboard-modules-list"]',
        title: 'Payroll modules list',
        content: 'This is your main menu into the payroll module: Payslip Generation, Record Payment, End-of-Year Regularization, Fiscal Rules, Rule Import (AI), and Audit Log. Click any item to open it.',
        placement: 'left',
      },
    ],
  },
  {
    id: 'payslip-generation',
    screenName: 'Payslip Generation',
    description: 'Generate and manage employee payslips',
    route: '/payroll/payslips',
    steps: [
      {
        target: '[data-tour="payslip-overview"]',
        title: 'Overview',
        content: 'Here you can view existing payslips or generate new ones for a single employee or in batch.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payslip-existing-list"]',
        title: 'Existing payslips list',
        content: 'Browse and filter all previously generated payslips here.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payslip-generate-single"]',
        title: 'Generate single payslip',
        content: 'Click here to generate a payslip for one employee. It will be created in **Draft** status.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payslip-batch-generation"]',
        title: 'Batch generation',
        content: 'Use this option to generate payslips for multiple employees at once, e.g. for the whole company on payday.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payslip-draft-status"]',
        title: 'Draft status',
        content: 'A newly generated payslip starts as **Draft** — it\'s editable and not yet final.',
        placement: 'right',
      },
      {
        target: '[data-tour="payslip-confirm"]',
        title: 'Confirm payslip',
        content: 'Once you\'re satisfied with the details, click **Confirm** to move the payslip forward.',
        placement: 'left',
      },
      {
        target: '[data-tour="payslip-lock"]',
        title: 'Lock payslip',
        content: '**Lock** finalizes the payslip completely — it can no longer be edited or deleted after this.',
        placement: 'left',
      },
      {
        target: '[data-tour="payslip-delete"]',
        title: 'Delete rule',
        content: 'Note: a payslip can only be deleted while still in Draft, before it\'s been validated. After validation, corrections must be made through a corrected version instead.',
        placement: 'left',
      },
      {
        target: '[data-tour="payslip-correction-link"]',
        title: 'Link to correction',
        content: 'Need to fix a validated payslip? Go to the **Payslip Correction** module (covered next).',
        placement: 'bottom',
        route: '/payroll/corrections',
      },
    ],
  },
  {
    id: 'payslip-correction',
    screenName: 'Payslip Correction',
    description: 'Correct validated payslips without deleting original records',
    route: '/payroll/corrections',
    steps: [
      {
        target: '[data-tour="correction-overview"]',
        title: 'Overview',
        content: 'This module lets you correct a payslip that has already been validated, without deleting the original record.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="correction-payslips-list"]',
        title: 'Payslips list',
        content: 'Browse all available payslips here. Use the filters above to search by employee name or date range.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="correction-view-history-btn"]',
        title: 'View History',
        content: 'Click **View History** on any payslip to see its version history and create corrections.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'payment-tracking',
    screenName: 'Record Payment',
    description: 'Record and track payments against payslips',
    route: '/payroll/payments',
    steps: [
      {
        target: '[data-tour="payment-overview"]',
        title: 'Overview',
        content: 'Use this screen to record that an employee has actually been paid.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payment-record-button"]',
        title: 'Record Payment button',
        content: 'Click here to open the payment recording form.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payment-link"]',
        title: 'Link to payslip',
        content: 'Select the payslip this payment is for. Only locked payslips are available.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="payment-method"]',
        title: 'Payment method',
        content: 'Select how the payment was made (e.g. bank transfer, check, cash).',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'year-end-regularization',
    screenName: 'End-of-Year Regularization',
    description: 'Calculate annual tax regularization and create correction payslips',
    route: '/payroll/regularization',
    steps: [
      {
        target: '[data-tour="regularization-overview"]',
        title: 'Overview',
        content: 'At year-end, use this module to recalculate each employee\'s total payments and taxes for the year and correct any discrepancies.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="regularization-recalculation"]',
        title: 'Recalculation',
        content: 'Click here to have the system recalculate the amount an employee *should* have paid in tax over the year, based on their full annual earnings.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="regularization-comparison"]',
        title: 'Comparison',
        content: 'The system automatically compares the recalculated amount to what was actually paid during the year.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="regularization-payslip"]',
        title: 'Regularization payslip',
        content: 'If there\'s a difference (employee paid too much or too little tax), the system generates a **regularization payslip** to correct it automatically.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'fiscal-rules',
    screenName: 'Fiscal Rules Management',
    description: 'Configure tax rules and brackets',
    route: '/payroll/fiscal-rules',
    steps: [
      {
        target: '[data-tour="fiscal-overview"]',
        title: 'Overview',
        content: 'This is where you define the tax rules used to calculate payslips.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="fiscal-create"]',
        title: 'Create rule set',
        content: 'Click here to create a new fiscal rule set, e.g. for a given fiscal year.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="fiscal-variables"]',
        title: 'Tax variables',
        content: 'Set the tax variables that apply, such as tax brackets and thresholds.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="fiscal-irpp"]',
        title: 'IRPP value',
        content: 'Configure the IRPP (income tax) value used in calculations.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="fiscal-family"]',
        title: 'Family deduction',
        content: 'Set the family deduction values applied based on employee dependents.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="fiscal-apply"]',
        title: 'Apply rule set',
        content: 'Once configured, apply this rule set so it\'s used automatically in payslip calculations going forward.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'rule-import',
    screenName: 'Rule Import (AI)',
    description: 'Import fiscal rules using AI extraction from PDF documents',
    route: '/payroll/rule-import',
    steps: [
      {
        target: '[data-tour="import-overview"]',
        title: 'Overview',
        content: 'This tool uses AI to help you keep fiscal rules up to date automatically.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="import-upload"]',
        title: 'Upload PDF',
        content: 'Upload the official PDF document of the Tunisian fiscal law (e.g. the latest finance law).',
        placement: 'bottom',
      },
      {
        target: '[data-tour="import-ai-extraction"]',
        title: 'AI extraction',
        content: 'The AI will read the document and extract the relevant tax values (IRPP brackets, deductions, etc.).',
        placement: 'right',
      },
      {
        target: '[data-tour="import-comparison"]',
        title: 'Comparison to existing rules',
        content: 'The system compares the extracted values to your current fiscal rule set and highlights what has changed.',
        placement: 'left',
      },
      {
        target: '[data-tour="import-review"]',
        title: 'Review & apply',
        content: 'Review the detected changes before applying them — nothing updates automatically without your confirmation.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'audit-logs',
    screenName: 'Audit Log',
    description: 'View all payroll module actions for traceability',
    route: '/payroll/audit-logs',
    steps: [
      {
        target: '[data-tour="audit-overview"]',
        title: 'Overview',
        content: 'Every action taken in the payroll module is logged here for traceability and compliance.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="audit-details"]',
        title: 'Log details',
        content: 'For each entry you can see **what** action was performed, **who** performed it, and **when** it happened.',
        placement: 'left',
      },
      {
        target: '[data-tour="audit-filtering"]',
        title: 'Filtering/search',
        content: 'Use filters to search the log by user, action type, or date range.',
        placement: 'bottom',
      },
    ],
  },
];

export const getTourByScreenId = (screenId: string): ScreenTour | undefined => {
  return payrollTourConfig.find(tour => tour.id === screenId);
};

export const getTourByRoute = (route: string): ScreenTour | undefined => {
  return payrollTourConfig.find(tour => tour.route === route);
};

export const getAllTours = (): ScreenTour[] => {
  return payrollTourConfig;
};
