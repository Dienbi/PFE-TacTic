import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Users,
  Search,
  Settings2,
  ChevronRight,
} from "lucide-react";
import Sidebar from "../../../shared/components/Sidebar";
import Navbar from "../../../shared/components/Navbar";
import client from "../../../api/client";
import Loader from "../../../shared/components/Loader";
import CreateTeamModal from "./CreateTeamModal";
import TeamDetailsModal from "./TeamDetailsModal";

interface Equipe {
  id: number;
  nom: string;
  description?: string;
  chef_id?: number;
  membres_count?: number;
  chef_equipe?: {
    id: number;
    prenom: string;
    nom: string;
  };
}

interface UserData {
  id: number;
  nom: string;
  prenom: string;
  role: string;
}

const TEAM_COLORS = [
  {
    bg: "from-indigo-500 to-indigo-600",
    light: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-100",
  },
  {
    bg: "from-violet-500 to-violet-600",
    light: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-100",
  },
  {
    bg: "from-emerald-500 to-emerald-600",
    light: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-100",
  },
  {
    bg: "from-amber-500 to-orange-500",
    light: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-100",
  },
  {
    bg: "from-sky-500 to-sky-600",
    light: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-100",
  },
  {
    bg: "from-rose-500 to-rose-600",
    light: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-100",
  },
];

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Equipe[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Equipe | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const response = await client.get("/equipes");
      setTeams(response.data);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (teamData: {
    nom: string;
    description?: string;
    chef_id?: number;
    membre_ids?: number[];
  }) => {
    const response = await client.post("/equipes", {
      nom: teamData.nom,
      description: teamData.description,
      chef_id: teamData.chef_id,
    });
    const newTeamId = response.data.id;
    if (teamData.membre_ids && teamData.membre_ids.length > 0) {
      for (const memberId of teamData.membre_ids) {
        await client.post(`/equipes/${newTeamId}/membres`, {
          utilisateur_id: memberId,
        });
      }
    }
    setShowCreateModal(false);
    fetchTeams();
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!globalThis.confirm("Are you sure you want to delete this team?"))
      return;
    try {
      setDeletingId(teamId);
      await client.delete(`/equipes/${teamId}`);
      fetchTeams();
    } catch (error) {
      console.error("Error deleting team:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.nom.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalMembers = teams.reduce(
    (sum, t) => sum + (t.membres_count || 0),
    0,
  );

  if (isLoading) return <Loader fullScreen />;

  return (
    <div className="dashboard-container">
      <Sidebar role={user?.role} />
      <div className="main-content">
        <Navbar
          userName={user ? `${user.prenom} ${user.nom}` : "RH Manager"}
          userRole={user?.role || "RH"}
        />

        <div
          className="dashboard-content"
          style={{ maxWidth: 1400, margin: "0 auto" }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage and organize your workforce into teams
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-150 hover:shadow-md active:scale-95"
            >
              <Plus size={18} />
              New Team
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Users size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {teams.length}
                </p>
                <p className="text-xs text-gray-500">Total Teams</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {totalMembers}
                </p>
                <p className="text-xs text-gray-500">Total Members</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Settings2 size={20} className="text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {teams.filter((t) => t.chef_equipe).length}
                </p>
                <p className="text-xs text-gray-500">Teams with Manager</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition"
            />
          </div>

          {/* Empty state */}
          {filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Users size={32} className="text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {searchQuery ? "No teams found" : "No teams yet"}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "Create your first team to get started"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition"
                >
                  <Plus size={18} />
                  New Team
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredTeams.map((team, idx) => {
                const color = TEAM_COLORS[idx % TEAM_COLORS.length];
                const initials = team.nom.slice(0, 2).toUpperCase();
                const managerInitials = team.chef_equipe
                  ? `${team.chef_equipe.prenom[0]}${team.chef_equipe.nom[0]}`.toUpperCase()
                  : null;

                return (
                  <div
                    key={team.id}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                  >
                    {/* Color header */}
                    <div className={`h-2 bg-gradient-to-r ${color.bg}`} />

                    <div className="p-5 flex flex-col flex-1">
                      {/* Top row: avatar + delete */}
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-sm`}
                        >
                          <span className="text-white font-bold text-base">
                            {initials}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(team.id);
                          }}
                          disabled={deletingId === team.id}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                          title="Delete team"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Team name + description */}
                      <h3 className="font-semibold text-gray-900 text-base leading-tight mb-1">
                        {team.nom}
                      </h3>
                      {team.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                          {team.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-auto mb-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${color.light} ${color.text}`}
                        >
                          <Users size={12} />
                          {team.membres_count || 0} members
                        </span>
                      </div>

                      {/* Manager */}
                      {team.chef_equipe ? (
                        <div className="flex items-center gap-2 py-3 border-t border-gray-100">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-gray-600">
                              {managerInitials}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {team.chef_equipe.prenom} {team.chef_equipe.nom}
                            </p>
                            <p className="text-[10px] text-gray-400">Manager</p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400 italic">
                            No manager assigned
                          </p>
                        </div>
                      )}

                      {/* Action button */}
                      <button
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowDetailsModal(true);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all duration-150"
                      >
                        Manage Team
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTeam}
        />
      )}

      {showDetailsModal && selectedTeam && (
        <TeamDetailsModal
          team={selectedTeam}
          onClose={() => setShowDetailsModal(false)}
          onRefresh={fetchTeams}
        />
      )}
    </div>
  );
};

export default Teams;
