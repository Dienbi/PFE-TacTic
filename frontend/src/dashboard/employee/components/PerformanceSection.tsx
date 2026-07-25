import React from "react";
import "./PerformanceSection.css";

interface PerformanceIndicator {
  id: number;
  label: string;
  value: number;
  target: number;
}

const PerformanceSection: React.FC = () => {
  const performanceIndicators: PerformanceIndicator[] = [
    { id: 1, label: "Attendance Rate", value: 98, target: 95 },
    { id: 2, label: "Performance", value: 88, target: 80 },
    { id: 3, label: "Trainings Completed", value: 75, target: 70 },
    { id: 4, label: "Goals Achieved", value: 92, target: 90 },
  ];

  return (
    <div className="performance-section">
      <h3 className="section-title">My Performance Indicators</h3>
      <div className="performance-list">
        {performanceIndicators.map((indicator) => (
          <div key={indicator.id} className="performance-item">
            <div className="performance-header">
              <span className="performance-label">{indicator.label}</span>
              <span className="performance-value">{indicator.value}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(indicator.value / 100) * 100}%`,
                }}
              />
            </div>
            <div className="performance-subtext">
              Target: {indicator.target}%{" "}
              <span className="check-icon">✓</span> Achieved
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceSection;
