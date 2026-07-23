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
  };

  const iconBgClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
    indigo: 'bg-indigo-50',
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 ml-[260px]">
        <Navbar userName={displayName || ''} userRole={user?.role || ''} />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6" data-tour="dashboard-welcome">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Tunisian Payroll</h1>
              <p className="text-sm text-gray-600 mt-1">Manage payroll, tax rules, and payments</p>
            </div>
            <PayrollGuideButton />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-tour="dashboard-kpis">
            {stats.map((stat) => (
              <Card key={stat.title} hover>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <div 
                  key={action.title} 
                  className="cursor-pointer"
                  onClick={action.onClick}
                >
                  <Card hover>
                    <CardBody>
                      <div className={`p-3 rounded-lg w-fit mb-3 ${iconBgClasses[action.color as keyof typeof iconBgClasses]}`}>
                        <div className={colorClasses[action.color as keyof typeof colorClasses]}>
                          {action.icon}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
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
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/payroll/audit-logs')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {auditLoading ? (
                    <div className="text-center py-4 text-gray-500">Loading...</div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No recent activity</div>
                  ) : (
                    recentActivity.map((activity: any) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          activity.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {activity.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Navigation */}
            <Card data-tour="dashboard-modules-list">
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Payroll Modules</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start"
                    onClick={() => navigate('/payroll/payslips')}
                    leftIcon={<Calculator className="w-4 h-4" />}
                  >
                    Payslip Generation
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start"
                    onClick={() => navigate('/payroll/payments')}
                    leftIcon={<CreditCard className="w-4 h-4" />}
                  >
                    Payment Tracking
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start"
                    onClick={() => navigate('/payroll/corrections')}
                    leftIcon={<History className="w-4 h-4" />}
                  >
                Payslip Corrections
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start"
                    onClick={() => navigate('/payroll/regularization')}
                    leftIcon={<Calendar className="w-4 h-4" />}
                  >
                Year-End Regularization
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start"
                    onClick={() => navigate('/payroll/fiscal-rules')}
                    leftIcon={<FileText className="w-4 h-4" />}
                  >
                Fiscal Rules Management
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start"
                    onClick={() => navigate('/payroll/rule-import')}
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                Rule Import (AI)
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="justify-start"
                    onClick={() => navigate('/payroll/audit-logs')}
                    leftIcon={<List className="w-4 h-4" />}
                  >
                Audit Logs
                  </Button>
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
