import React from "react";
import "./DashboardSkeleton.css";

interface DashboardSkeletonProps {
  type: "employee" | "manager" | "rh" | "employees" | "teams" | "attendance" | "payroll" | "leave" | "job-requests" | "job-posts" | "reports" | "employee-attendance" | "employee-leave" | "employee-salary" | "employee-job-board" | "employee-applications";
}

const KPIGridSkeleton = () => (
  <div className="kpi-grid">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="skeleton-card kpi-card">
        <div className="skeleton-kpi-header">
          <div className="skeleton-text skeleton-label" />
          <div className="skeleton-icon" />
        </div>
        <div className="skeleton-text skeleton-value" />
        <div className="skeleton-text skeleton-sub" />
      </div>
    ))}
  </div>
);

const EmployeeSkeleton = () => (
  <>
    <KPIGridSkeleton />
    <div className="skeleton-card skeleton-full-width" style={{ marginBottom: "2rem", height: "280px" }} />
    <div className="widgets-grid">
      <div className="widget-column">
        <div className="skeleton-card" style={{ height: "320px" }} />
      </div>
      <div className="widget-column right">
        <div className="skeleton-card" style={{ height: "150px", marginBottom: "1.5rem" }} />
        <div className="skeleton-card" style={{ height: "150px" }} />
      </div>
    </div>
    <div className="skeleton-card skeleton-full-width" style={{ marginBottom: "2rem", height: "200px" }} />
    <div className="skeleton-card skeleton-full-width" style={{ height: "80px" }} />
  </>
);

const ManagerSkeleton = () => (
  <>
    <KPIGridSkeleton />
    <div className="skeleton-card skeleton-full-width" style={{ marginBottom: "2rem", height: "280px" }} />
    <div className="manager-content-grid">
      <div className="skeleton-card" style={{ height: "400px" }} />
      <div className="skeleton-card" style={{ height: "400px" }} />
    </div>
    <div className="skeleton-card skeleton-full-width" style={{ marginBottom: "2rem", height: "180px" }} />
    <div className="skeleton-card skeleton-full-width" style={{ height: "80px" }} />
  </>
);

const RHSkeleton = () => (
  <>
    <div className="page-title-row skeleton-text-row">
      <div className="skeleton-text skeleton-title" />
      <div className="skeleton-text skeleton-subtitle" />
    </div>
    <section className="kpi-panel">
      <KPIGridSkeleton />
    </section>
    <section className="chart-activity-row">
      <div className="panel charts-wrapper">
        <div className="charts-grid">
          <div className="skeleton-card" style={{ height: "360px" }} />
          <div className="skeleton-card" style={{ height: "360px" }} />
        </div>
      </div>
      <div className="skeleton-card" style={{ height: "400px" }} />
    </section>
    <section className="leaves-row">
      <div className="skeleton-card" style={{ height: "350px" }} />
      <div className="skeleton-card" style={{ height: "350px" }} />
    </section>
  </>
);

const EmployeesSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "250px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "200px", marginBottom: "2rem" }} />
    <div className="skeleton-card" style={{ height: "60px", marginBottom: "1.5rem" }} />
    <div className="skeleton-card" style={{ height: "400px" }} />
  </>
);

const TeamsSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "150px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "300px", marginBottom: "2rem" }} />
    <div className="grid grid-cols-3 gap-4" style={{ marginBottom: "2rem" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "80px" }} />
      ))}
    </div>
    <div className="skeleton-card" style={{ height: "50px", marginBottom: "1.5rem" }} />
    <div className="grid grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "250px" }} />
      ))}
    </div>
  </>
);

const AttendanceSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "200px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "350px", marginBottom: "2rem" }} />
    <div className="skeleton-card" style={{ height: "50px", marginBottom: "1.5rem" }} />
    <div className="grid grid-cols-4 gap-4" style={{ marginBottom: "2rem" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "120px" }} />
      ))}
    </div>
    <div className="grid grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "300px" }} />
      ))}
    </div>
  </>
);

const PayrollSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "200px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "300px", marginBottom: "2rem" }} />
    <div className="skeleton-card" style={{ height: "50px", marginBottom: "1.5rem" }} />
    <div className="grid grid-cols-4 gap-4" style={{ marginBottom: "2rem" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "100px" }} />
      ))}
    </div>
    <div className="skeleton-card" style={{ height: "400px" }} />
  </>
);

const LeaveSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "200px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "300px", marginBottom: "2rem" }} />
    <div className="grid grid-cols-4 gap-4" style={{ marginBottom: "2rem" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "80px" }} />
      ))}
    </div>
    <div className="skeleton-card" style={{ height: "60px", marginBottom: "1.5rem" }} />
    <div className="skeleton-card" style={{ height: "400px" }} />
  </>
);

const JobRequestsSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "150px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "350px", marginBottom: "2rem" }} />
    {[1, 2, 3].map((i) => (
      <div key={i} className="skeleton-card" style={{ height: "200px", marginBottom: "1.5rem" }} />
    ))}
  </>
);

const JobPostsSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "120px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "300px", marginBottom: "2rem" }} />
    <div className="skeleton-card" style={{ height: "50px", marginBottom: "1.5rem" }} />
    <div className="skeleton-card" style={{ height: "50px", marginBottom: "1.5rem" }} />
    <div className="grid grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "280px" }} />
      ))}
    </div>
  </>
);

const ReportsSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "150px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-card" style={{ height: "60px", marginBottom: "2rem" }} />
    <div className="grid grid-cols-4 gap-4" style={{ marginBottom: "2rem" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "100px" }} />
      ))}
    </div>
    <div className="grid grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "350px" }} />
      ))}
    </div>
  </>
);

const EmployeeAttendanceSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "200px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "300px", marginBottom: "2rem" }} />
    <div className="grid grid-cols-4 gap-4" style={{ marginBottom: "2rem" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "80px" }} />
      ))}
    </div>
    <div className="skeleton-card" style={{ height: "50px", marginBottom: "1.5rem" }} />
    <div className="skeleton-card" style={{ height: "400px" }} />
  </>
);

const EmployeeLeaveSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "120px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "250px", marginBottom: "2rem" }} />
    <div className="skeleton-card" style={{ height: "60px", marginBottom: "1.5rem" }} />
    <div className="skeleton-card" style={{ height: "50px", marginBottom: "1.5rem" }} />
    <div className="skeleton-card" style={{ height: "400px" }} />
  </>
);

const EmployeeSalarySkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "120px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "300px", marginBottom: "2rem" }} />
    <div className="grid grid-cols-4 gap-4" style={{ marginBottom: "2rem" }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "80px" }} />
      ))}
    </div>
    <div className="grid grid-cols-3 gap-4" style={{ marginBottom: "2rem" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "100px" }} />
      ))}
    </div>
    <div className="skeleton-card" style={{ height: "400px" }} />
  </>
);

const EmployeeJobBoardSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "180px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "350px", marginBottom: "2rem" }} />
    <div className="skeleton-card" style={{ height: "50px", marginBottom: "1.5rem" }} />
    <div className="grid grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card" style={{ height: "280px" }} />
      ))}
    </div>
  </>
);

const EmployeeApplicationsSkeleton = () => (
  <>
    <div className="skeleton-text skeleton-title" style={{ width: "200px", height: "32px", marginBottom: "1rem" }} />
    <div className="skeleton-text skeleton-subtitle" style={{ width: "300px", marginBottom: "2rem" }} />
    {[1, 2, 3].map((i) => (
      <div key={i} className="skeleton-card" style={{ height: "150px", marginBottom: "1.5rem" }} />
    ))}
  </>
);

const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ type }) => {
  if (type === "employee") return <EmployeeSkeleton />;
  if (type === "manager") return <ManagerSkeleton />;
  if (type === "rh") return <RHSkeleton />;
  if (type === "employees") return <EmployeesSkeleton />;
  if (type === "teams") return <TeamsSkeleton />;
  if (type === "attendance") return <AttendanceSkeleton />;
  if (type === "payroll") return <PayrollSkeleton />;
  if (type === "leave") return <LeaveSkeleton />;
  if (type === "job-requests") return <JobRequestsSkeleton />;
  if (type === "job-posts") return <JobPostsSkeleton />;
  if (type === "reports") return <ReportsSkeleton />;
  if (type === "employee-attendance") return <EmployeeAttendanceSkeleton />;
  if (type === "employee-leave") return <EmployeeLeaveSkeleton />;
  if (type === "employee-salary") return <EmployeeSalarySkeleton />;
  if (type === "employee-job-board") return <EmployeeJobBoardSkeleton />;
  if (type === "employee-applications") return <EmployeeApplicationsSkeleton />;
  return null;
};

export default DashboardSkeleton;
