import React, { useState, useEffect } from "react";
import { X, AlertCircle, Check } from "lucide-react";
import client from "../../../api/client";

interface AvailableUser {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  role: string;
  status: string;
  leave_info?: {
    on_leave: boolean;
    upcoming_leave?: boolean;
    leave_type: string;
    leave_end?: string;
    leave_start?: string;
    duration: number;
    message: string;
  } | null;
}

interface CreateTeamModalProps {
  onClose: () => void;
  onSubmit: (data: {
    nom: string;
    description?: string;
    chef_id?: number;
    membre_ids?: number[];
  }) => Promise<void>;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({ nom: "", description: "" });
  const [selectedManager, setSelectedManager] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [availableManagers, setAvailableManagers] = useState<AvailableUser[]>(
    [],
  );
  const [availableEmployees, setAvailableEmployees] = useState<AvailableUser[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      setIsLoading(true);
      const [managersRes, employeesRes] = await Promise.all([
        client.get("/equipes/available-managers"),
        client.get("/equipes/available-employees"),
      ]);
      setAvailableManagers(managersRes.data);
      setAvailableEmployees(employeesRes.data);
    } catch (err) {
      console.error("Error fetching available users:", err);
      setError("Failed to load available users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeToggle = (userId: number) => {
    setSelectedEmployees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      setError("Team name is required");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...formData,
        chef_id: selectedManager || undefined,
        membre_ids:
          selectedEmployees.length > 0 ? selectedEmployees : undefined,
      });
    } catch (err) {
      setError("Failed to create team");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition";

  const filteredEmployees = availableEmployees.filter((emp) =>
    `${emp.prenom} ${emp.nom} ${emp.matricule}`
      .toLowerCase()
      .includes(employeeSearch.toLowerCase()),
  );

  return (
    /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2
            id="create-team-title"
            className="text-lg font-semibold text-gray-900"
          >
            Create New Team
          </h2>
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
          <form
            id="create-team-form"
            onSubmit={handleSubmit}
            className="overflow-y-auto flex-1 px-6 py-5 space-y-4"
          >
            {/* Team Name */}
            <div>
              <label
                htmlFor="nom"
                className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide"
              >
                Team Name *
              </label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="e.g. Product Development"
                required
                className={inputClass}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description..."
                rows={2}
                className={inputClass}
              />
            </div>

            {/* Manager */}
            <div>
              <label
                htmlFor="manager"
                className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide"
              >
                Team Manager
              </label>
              {availableManagers.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-1">
                  No managers available for assignment
                </p>
              ) : (
                <select
                  id="manager"
                  value={selectedManager ?? ""}
                  onChange={(e) =>
                    setSelectedManager(
                      e.target.value ? Number.parseInt(e.target.value) : null,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">Select a manager…</option>
                  {availableManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.prenom} {m.nom} ({m.matricule})
                      {m.leave_info ? ` ⚠️ ${m.leave_info.message}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Employees */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Team Members
                </span>
                {selectedEmployees.length > 0 && (
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                    {selectedEmployees.length} selected
                  </span>
                )}
              </div>
              {availableEmployees.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-1">
                  No employees available for assignment
                </p>
              ) : (
                <>
                  <input
                    type="search"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search employees..."
                    className={`${inputClass} mb-2`}
                  />
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-50">
                    {filteredEmployees.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-4 italic">
                        No match
                      </p>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const selected = selectedEmployees.includes(emp.id);
                        const initials =
                          `${emp.prenom[0]}${emp.nom[0]}`.toUpperCase();
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition ${selected ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                selected
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {selected ? <Check size={13} /> : initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">
                                {emp.prenom} {emp.nom}
                              </p>
                              <p className="text-xs text-gray-400">
                                {emp.matricule}
                              </p>
                            </div>
                            {emp.leave_info && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                <AlertCircle size={10} /> Leave
                              </span>
                            )}
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => handleEmployeeToggle(emp.id)}
                              className="sr-only"
                            />
                          </label>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertCircle size={15} /> {error}
              </div>
            )}
          </form>
        )}

        {/* Footer */}
        {!isLoading && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-team-form"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Team"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateTeamModal;
