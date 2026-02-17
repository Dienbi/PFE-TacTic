import React, { useEffect, useState } from "react";
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
import client from "../../../api/client";

interface TrendData {
  name: string;
  value: number;
  month: string;
}

interface AbsenceData {
  name: string;
  value: number;
  color: string;
}

const ChartsSection = () => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [absenceData, setAbsenceData] = useState<AbsenceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const [trendResponse, absenceResponse] = await Promise.all([
        client.get("/dashboard/attendance-trend?months=6"),
        client.get("/dashboard/absence-distribution"),
      ]);

      setTrendData(trendResponse.data);
      setAbsenceData(absenceResponse.data);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Tendance de Présence (6 mois)</h3>
          <div
            style={{
              width: "100%",
              height: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p>Chargement...</p>
          </div>
        </div>
        <div className="chart-card">
          <h3>Distribution des Absences</h3>
          <div
            style={{
              width: "100%",
              height: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h3>Tendance de Présence (6 mois)</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={trendData}>
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
                domain={[0, 100]}
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
                data={absenceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {absenceData.map((entry, index) => (
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
