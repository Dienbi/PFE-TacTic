import React, { useEffect, useState } from "react";
import {
  Users,
  Clock,
  UserX,
  UserCheck,
  Calendar,
  Search,
} from "lucide-react";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import client from "../../../api/client";
import Loader from "../../../shared/components/Loader";
import "./AttendanceDashboard.css";

interface UserInfo {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  poste?: string;
  heure_entree?: string;
  heure_sortie?: string;
  status: string;
}

interface AttendanceStats {
  date: string;
  stats: {
    total_employees: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    currently_in_count: number;
  };
  lists: {
    present: UserInfo[];
    late: UserInfo[];
    absent: UserInfo[];
    currently_in: UserInfo[];
  };
}

const AttendanceDashboard: React.FC = () => {
  const [data, setData] = useState<AttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [date]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await client.get(`/pointages/summary?date=${date}`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const UserListItem = ({
    user,
    ShowTime = false,
  }: {
    user: UserInfo;
    ShowTime?: boolean;
  }) => (
    <div className="user-item">
      <div className="user-avatar">
        {user.prenom.charAt(0)}
        {user.nom.charAt(0)}
      </div>
      <div className="user-info">
        <span className="user-name">
          {user.prenom} {user.nom}
        </span>
        <span className="user-meta">
          {user.poste || "Employé"} • {user.matricule}
        </span>
      </div>
      {ShowTime && user.heure_entree && (
        <div className={`time-badge ${user.status === "LATE" ? "late-time" : ""}`}>
          {user.heure_entree}
        </div>
      )}
    </div>
  );

  if (isLoading && !data) {
    return <Loader fullScreen={true} />;
  }

  return (
    <div className="dashboard-container">
      <Sidebar role={user?.role} />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "RH"}
          userRole={user?.role || "RH"}
        />

        <div className="dashboard-content attendance-dashboard">
          <div className="attendance-header">
            <div>
              <h1>Attendance Overview</h1>
              <p className="subtitle">
                Track employee attendance, late arrivals, and absences
              </p>
            </div>
            
            <div style={{marginTop: '1rem'}}>
               <label style={{marginRight: '0.5rem', fontWeight: 500}}>Date:</label>
               <input 
                 type="date" 
                 value={date} 
                 onChange={(e) => setDate(e.target.value)}
                 className="form-input"
                 style={{width: 'auto', display: 'inline-block'}}
               />
            </div>
          </div>

          {data && (
            <>
              <div className="stats-grid">
                <div className="stat-card stat-present">
                  <div className="stat-content">
                    <h3>Present Today</h3>
                    <div className="stat-value">{data.stats.present_count}</div>
                  </div>
                  <div className="stat-icon">
                    <UserCheck />
                  </div>
                </div>

                <div className="stat-card stat-working">
                  <div className="stat-content">
                    <h3>Currently In</h3>
                    <div className="stat-value">{data.stats.currently_in_count}</div>
                  </div>
                  <div className="stat-icon">
                    <Clock />
                  </div>
                </div>

                <div className="stat-card stat-late">
                  <div className="stat-content">
                    <h3>Late Arrivals</h3>
                    <div className="stat-value">{data.stats.late_count}</div>
                  </div>
                  <div className="stat-icon">
                    <Calendar />
                  </div>
                </div>

                <div className="stat-card stat-absent">
                  <div className="stat-content">
                    <h3>Absent</h3>
                    <div className="stat-value">{data.stats.absent_count}</div>
                  </div>
                  <div className="stat-icon">
                    <UserX />
                  </div>
                </div>
              </div>

              <div className="attendance-lists">
                {/* Currently Working */}
                <div className="list-section">
                  <div className="list-header">
                    <h2>Currently Working</h2>
                    <span className="count-badge">
                      {data.lists.currently_in.length}
                    </span>
                  </div>
                  <div className="user-list">
                    {data.lists.currently_in.length > 0 ? (
                      data.lists.currently_in.map((u) => (
                        <UserListItem key={u.id} user={u} ShowTime={true} />
                      ))
                    ) : (
                      <div className="empty-list">No users currently checked in</div>
                    )}
                  </div>
                </div>

                {/* Late Arrivals */}
                <div className="list-section">
                  <div className="list-header">
                    <h2 style={{ color: "#92400e" }}>Late Arrivals</h2>
                    <span className="count-badge">
                      {data.lists.late.length}
                    </span>
                  </div>
                  <div className="user-list">
                    {data.lists.late.length > 0 ? (
                      data.lists.late.map((u) => (
                        <UserListItem key={u.id} user={u} ShowTime={true} />
                      ))
                    ) : (
                      <div className="empty-list">No late arrivals today</div>
                    )}
                  </div>
                </div>

                {/* Absent */}
                <div className="list-section">
                  <div className="list-header">
                    <h2 style={{ color: "#991b1b" }}>Absent</h2>
                    <span className="count-badge">
                      {data.lists.absent.length}
                    </span>
                  </div>
                  <div className="user-list">
                    {data.lists.absent.length > 0 ? (
                      data.lists.absent.map((u) => (
                        <UserListItem key={u.id} user={u} />
                      ))
                    ) : (
                      <div className="empty-list">No absences today</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
