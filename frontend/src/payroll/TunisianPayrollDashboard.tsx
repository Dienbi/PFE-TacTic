import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../shared/components/Sidebar';
import Navbar from '../shared/components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { useAuditLogs } from '../hooks/queries/useTunisianPayroll';
import { Card, CardHeader, CardBody } from '../shared/components/ui/Card';
import Button from '../shared/components/ui/Button';
import Badge from '../shared/components/ui/Badge';
import PayrollGuideButton from '../guide/PayrollGuideButton';
import PayrollTourTooltip from '../guide/PayrollTourTooltip';
import { 
  FileText, 
  Calculator, 
  CreditCard, 
  History, 
  Calendar, 
  Upload, 
  List,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

const TunisianPayrollDashboard: React.FC = () => {
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs();

  const stats = [
    {
      title: 'Total Payslips',
      value: '156',
      change: '+12%',
      icon: <FileText className="w-6 h-6" />,
      color: 'blue',
    },
    {
      title: 'Pending Payments',
      value: '23',
      change: '+5%',
      icon: <Clock className="w-6 h-6" />,
      color: 'yellow',
    },
    {
      title: 'Total Paid (MTD)',
      value: '45,230 TND',
      change: '+8%',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'green',
    },
    {
      title: 'Active Rule Set',
      value: '2026',
      change: 'Current',
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'purple',
    },
  ];

  const quickActions = [
    {
      title: 'Generate Payslip',
      description: 'Create single or batch payslips',
      icon: <Calculator className="w-5 h-5" />,
      onClick: () => navigate('/payroll/payslips'),
      color: 'blue',
    },
    {
      title: 'Record Payment',
      description: 'Track payments against payslips',
      icon: <CreditCard className="w-5 h-5" />,
      onClick: () => navigate('/payroll/payments'),
      color: 'green',
    },
    {
      title: 'Manage Fiscal Rules',
      description: 'Configure tax rules and brackets',
      icon: <FileText className="w-5 h-5" />,
      onClick: () => navigate('/payroll/fiscal-rules'),
      color: 'purple',
    },
    {
      title: 'Fiscal Profile',
      description: 'Manage employee fiscal profiles',
      icon: <TrendingUp className="w-5 h-5" />,
      onClick: () => navigate('/payroll/fiscal-profile'),
      color: 'indigo',
    },
  ];

  const recentActivity = (Array.isArray(auditLogs) ? auditLogs : (auditLogs as any)?.data || [])?.slice(0, 4).map((log: any) => ({
    id: log.id,
    action: log.action,
    description: `${log.entity_type} - ${log.entity_id}`,
    time: new Date(log.created_at).toLocaleString(),
    status: 'completed',
  })) || [];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    babyblue: 'bg-blue-50 text-blue-500',
  };

  const iconBgClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
    indigo: 'bg-indigo-50',
    babyblue: 'bg-blue-100',
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6" data-tour="dashboard-welcome">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-start text-left">
                <h1 className="text-2xl font-semibold text-gray-900 text-left">Tunisian Payroll</h1>
                <p className="text-sm text-gray-600 text-left">Manage payroll, tax rules, and payments</p>
              </div>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-tour="dashboard-kpis">
            {stats.map((stat) => (
              <Card 
                key={stat.title} 
                hover
                className="border-2 border-blue-200 shadow-[0_-2px_4px_rgba(0,0,0,0.05),-2px_0_4px_rgba(0,0,0,0.05),2px_0_4px_rgba(0,0,0,0.05)] hover:shadow-[0_-4px_8px_rgba(0,0,0,0.08),-4px_0_8px_rgba(0,0,0,0.08),4px_0_8px_rgba(0,0,0,0.08)] transition-shadow"
              >
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-600 text-left">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1 text-left">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1 text-left">{stat.change}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${iconBgClasses[stat.color as keyof typeof iconBgClasses]}`}>
                      <div className={colorClasses[stat.color as keyof typeof colorClasses]}>
                        {stat.icon}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-6" data-tour="dashboard-quick-actions">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <div 
                  key={action.title} 
                  className="cursor-pointer"
                  onClick={action.onClick}
                >
                  <Card 
                    hover
                    className="border-2 border-blue-200 shadow-md hover:shadow-lg hover:border-blue-400 transition-all"
                  >
                    <CardBody>
                      <div className="text-left">
                        <div className={`p-3 rounded-lg w-fit mb-3 ${iconBgClasses[action.color as keyof typeof iconBgClasses]}`}>
                          <div className={colorClasses[action.color as keyof typeof colorClasses]}>
                            {action.icon}
                          </div>
                        </div>
                        <h3 className="font-semibold text-gray-900 text-left">{action.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 text-left">{action.description}</p>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card data-tour="dashboard-recent-activity">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900 text-left">Recent Activity</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/payroll/audit-logs')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {auditLoading ? (
                    <div className="text-left py-4 text-gray-500">Loading...</div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-left py-4 text-gray-500">No recent activity</div>
                  ) : (
                    recentActivity.map((activity: any) => (
                      <div key={activity.id} className="flex items-start gap-3 text-left">
                        <div className={`p-2 rounded-full shrink-0 ${
                          activity.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {activity.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900 text-left">{activity.action}</p>
                          <p className="text-xs text-gray-600 mt-1 text-left">{activity.description}</p>
                          <p className="text-xs text-blue-500 mt-1 text-left">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Navigation */}
            <Card data-tour="dashboard-modules-list" className="border-2 border-blue-200 shadow-md">
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 text-left">Payroll Modules</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-blue-300 text-left"
                    onClick={() => navigate('/payroll/payslips')}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${iconBgClasses.babyblue}`}>
                      <div className={colorClasses.babyblue}>
                        <Calculator className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-left">Payslip Generation</h3>
                      <p className="text-sm text-gray-600 mt-1 text-left">Create single or batch payslips</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-blue-300 text-left"
                    onClick={() => navigate('/payroll/payments')}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${iconBgClasses.babyblue}`}>
                      <div className={colorClasses.babyblue}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-left">Payment Tracking</h3>
                      <p className="text-sm text-gray-600 mt-1 text-left">Track payments against payslips</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-blue-300 text-left"
                    onClick={() => navigate('/payroll/corrections')}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${iconBgClasses.babyblue}`}>
                      <div className={colorClasses.babyblue}>
                        <History className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-left">Payslip Corrections</h3>
                      <p className="text-sm text-gray-600 mt-1 text-left">Manage payslip corrections</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-blue-300 text-left"
                    onClick={() => navigate('/payroll/regularization')}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${iconBgClasses.babyblue}`}>
                      <div className={colorClasses.babyblue}>
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-left">Year-End Regularization</h3>
                      <p className="text-sm text-gray-600 mt-1 text-left">Annual tax regularization</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-blue-300 text-left"
                    onClick={() => navigate('/payroll/fiscal-rules')}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${iconBgClasses.babyblue}`}>
                      <div className={colorClasses.babyblue}>
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-left">Fiscal Rules Management</h3>
                      <p className="text-sm text-gray-600 mt-1 text-left">Configure tax rules and brackets</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-blue-300 text-left"
                    onClick={() => navigate('/payroll/rule-import')}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${iconBgClasses.babyblue}`}>
                      <div className={colorClasses.babyblue}>
                        <Upload className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-left">Rule Import (AI)</h3>
                      <p className="text-sm text-gray-600 mt-1 text-left">Import rules from PDF documents</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-blue-300 text-left"
                    onClick={() => navigate('/payroll/audit-logs')}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${iconBgClasses.babyblue}`}>
                      <div className={colorClasses.babyblue}>
                        <List className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-left">Audit Logs</h3>
                      <p className="text-sm text-gray-600 mt-1 text-left">View system activity logs</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
      <PayrollTourTooltip />
    </div>
  );
};

export default TunisianPayrollDashboard;