import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const dataTrend = [
  { name: "Jan", value: 94 },
  { name: "Feb", value: 93 },
  { name: "Mar", value: 97 },
  { name: "Apr", value: 94 },
  { name: "May", value: 96 },
  { name: "Jun", value: 98 },
];

const dataAbsence = [
  { name: "Congé", value: 45, color: "#3B82F6" },
  { name: "Maladie", value: 25, color: "#10B981" },
  { name: "Autre", value: 15, color: "#EF4444" },
  { name: "Absence", value: 15, color: "#F59E0B" },
];

const ChartsSection = () => {
  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h3>Tendance de Présence (6 mois)</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={dataTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E7EB"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6B7280" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6B7280" }}
                domain={[90, 100]}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1E2258"
                strokeWidth={2}
                dot={{ fill: "#1E2258", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h3>Distribution des Absences</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={dataAbsence}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {dataAbsence.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartsSection;
