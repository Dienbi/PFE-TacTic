import React, { useEffect, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  Users,
  UserCog,
} from "lucide-react";
import Swal from "sweetalert2";
import client from "../../../api/client";
import "./TeamsModal.css";

// Configure SweetAlert with higher z-index
Swal.mixin({
  customClass: {
    container: 'swal2-container',
  },
});

interface Utilisateur {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  matricule: string;
}

interface AvailableUser {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  matricule: string;
  leave_info?: {
    on_short_leave: boolean;
    leave_end_date: string;
    leave_type: string;
  };
}

interface Equipe {
  id: number;
  nom: string;
  description?: string;
  chef_id?: number;
  chef_equipe?: {
    id: number;
    prenom: string;
    nom: string;
  };
}

interface TeamDetailsModalProps {
  team: Equipe;
  onClose: () => void;
  onRefresh: () => void;
}

const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  team,
  onClose,
  onRefresh,
}) => {
  const [membres, setMembres] = useState<Utilisateur[]>([]);
  const [availableManagers, setAvailableManagers] = useState<AvailableUser[]>(
    [],
  );
  const [availableEmployees, setAvailableEmployees] = useState<AvailableUser[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(
    null,
  );
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  const fetchTeamData = async () => {
    try {
      setIsLoading(true);
      const [membresRes, managersRes, employeesRes] = await Promise.all([
        client.get(`/equipes/${team.id}/membres`),
        client.get("/equipes/available-managers"),
        client.get("/equipes/available-employees"),
      ]);
      const sortedMembres = membresRes.data.sort((a: Utilisateur, b: Utilisateur) => {
        if (a.role === "CHEF_EQUIPE" && b.role !== "CHEF_EQUIPE") {
          return -1; // a comes before b
        }
        if (a.role !== "CHEF_EQUIPE" && b.role === "CHEF_EQUIPE") {
          return 1; // b comes before a
        }
        return 0; // maintain original order if both are managers or both are not managers
      });
      setMembres(sortedMembres);

      // Filter out users already in this team
      const membreIds = new Set(membresRes.data.map((m: Utilisateur) => m.id));
      setAvailableManagers(
        managersRes.data.filter((u: AvailableUser) => !membreIds.has(u.id)),
      );
      setAvailableEmployees(
        employeesRes.data.filter((u: AvailableUser) => !membreIds.has(u.id)),
      );
    } catch (err) {
      console.error("Error fetching team data:", err);
      setError("Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManager = async () => {
    if (!selectedManagerId) {
      setError("Please select a manager");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await client.post(`/equipes/${team.id}/membres`, {
        utilisateur_id: selectedManagerId,
      });
      setSelectedManagerId(null);
      setSuccess("Manager added to team");
      await fetchTeamData();
      onRefresh();
    } catch (err) {
      setError("Failed to add manager to team");
      console.error(err);
    }
  };

  const handleAddEmployees = async () => {
    if (selectedEmployeeIds.length === 0) {
      setError("Please select at least one employee");
      return;
    }

    try {
      setError("");
      setSuccess("");

      // Add each selected employee
      for (const employeeId of selectedEmployeeIds) {
        await client.post(`/equipes/${team.id}/membres`, {
          utilisateur_id: employeeId,
        });
      }

      setSelectedEmployeeIds([]);
      setSuccess(`${selectedEmployeeIds.length} employee(s) added to team`);
      await fetchTeamData();
      onRefresh();
    } catch (err) {
      setError("Failed to add employees to team");
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    const result = await Swal.fire({
      title: "Remove this user from the team?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, remove",
      cancelButtonText: "Cancel",
      didOpen: () => {
        // Directly set z-index on SweetAlert elements with !important
        const container = Swal.getContainer();
        const popup = Swal.getPopup();

        if (container) {
          container.style.cssText = 'z-index: 9999 !important;';
          const backdrop = container.querySelector('.swal2-backdrop') as HTMLElement;
          if (backdrop) {
            backdrop.style.cssText = 'z-index: 9998 !important;';
          }
        }
        if (popup) {
          popup.style.cssText = 'z-index: 10000 !important;';
        }
      },
    });

    if (!result.isConfirmed) return;

    try {
      setError("");
      setSuccess("");
      await client.delete(`/equipes/${team.id}/membres/${userId}`);
      setSuccess("User removed from team");
      await fetchTeamData();
      onRefresh();
    } catch (err) {
      setError("Failed to remove user from team");
      console.error(err);
    }
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const renderLeaveWarning = (user: AvailableUser) => {
    if (user.leave_info?.on_short_leave) {
      return (
        <span
          className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0"
          title={`On ${user.leave_info.leave_type} until ${user.leave_info.leave_end_date}`}
        >
          <AlertTriangle size={10} /> Leave
        </span>
      );
    }
    return null;
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition";

  return (
    /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2
              id="team-details-title"
              className="text-lg font-semibold text-gray-900"
            >
              Manage: {team.nom}
            </h2>
            {team.description && (
              <p className="text-xs text-gray-500 mt-0.5">{team.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertTriangle size={16} /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                <Check size={16} /> {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Add Manager */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <UserCog size={15} className="text-indigo-500" /> Add Manager
                </h3>
                {availableManagers.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No available managers
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedManagerId || ""}
                      onChange={(e) =>
                        setSelectedManagerId(
                          e.target.value
                            ? Number.parseInt(e.target.value)
                            : null,
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">Select a manager…</option>
                      {availableManagers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.prenom} {u.nom}
                          {u.leave_info?.on_short_leave ? " ⚠️" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddManager}
                      disabled={!selectedManagerId}
                      className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-40"
                    >
                      <Plus size={15} /> Add Manager
                    </button>
                  </div>
                )}
              </div>

              {/* Add Employees */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users size={15} className="text-indigo-500" /> Add
                    Employees
                  </h3>
                  {selectedEmployeeIds.length > 0 && (
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {selectedEmployeeIds.length} selected
                    </span>
                  )}
                </div>
                {availableEmployees.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No available employees
                  </p>
                ) : (
                  <>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-50 mb-2">
                      {availableEmployees.map((u) => {
                        const selected = selectedEmployeeIds.includes(u.id);
                        const initials =
                          `${u.prenom[0]}${u.nom[0]}`.toUpperCase();
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer ${selected ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${selected ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"}`}
                            >
                              {selected ? <Check size={12} /> : initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">
                                {u.prenom} {u.nom}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {u.email}
                              </p>
                            </div>
                            {renderLeaveWarning(u)}
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleEmployeeSelection(u.id)}
                              className="sr-only"
                            />
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEmployees}
                      disabled={selectedEmployeeIds.length === 0}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-40"
                    >
                      <Plus size={15} /> Add{" "}
                      {selectedEmployeeIds.length > 0
                        ? `(${selectedEmployeeIds.length})`
                        : "Selected"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Current Members */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users size={15} className="text-gray-400" />
                Current Members
                <span className="ml-auto text-xs font-normal text-gray-400">
                  {membres.length} member{membres.length === 1 ? "" : "s"}
                </span>
              </h3>
              {membres.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400 italic bg-gray-50 rounded-2xl border border-gray-100">
                  No members in this team yet
                </div>
              ) : (
                <div className="space-y-2">
                  {membres.map((membre) => {
                    const initials =
                      `${membre.prenom[0]}${membre.nom[0]}`.toUpperCase();
                    const isManager = membre.role === "CHEF_EQUIPE";
                    return (
                      <div
                        key={membre.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition group"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                            isManager
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {membre.prenom} {membre.nom}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {membre.email}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                            isManager
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isManager ? "Manager" : "Employee"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(membre.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Remove from team"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamDetailsModal;
