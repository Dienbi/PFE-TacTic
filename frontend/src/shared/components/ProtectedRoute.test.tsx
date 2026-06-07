import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute, { getDefaultDashboard } from "./ProtectedRoute";

const renderProtectedRoute = (initialPath = "/protected") => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard/rh" element={<div>RH Dashboard</div>} />
        <Route path="/dashboard/employee" element={<div>Employee Dashboard</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={["rh"]}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("redirects unauthenticated users to login", () => {
    renderProtectedRoute();

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  test("renders children when the authenticated role is allowed", () => {
    localStorage.setItem("token", "token");
    localStorage.setItem("user", JSON.stringify({ role: "RH" }));

    renderProtectedRoute();

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("redirects authenticated users with a different role to their dashboard", () => {
    localStorage.setItem("token", "token");
    localStorage.setItem("user", JSON.stringify({ role: "EMPLOYE" }));

    renderProtectedRoute();

    expect(screen.getByText("Employee Dashboard")).toBeInTheDocument();
  });

  test("maps backend roles to default dashboards", () => {
    expect(getDefaultDashboard("RH")).toBe("/dashboard/rh");
    expect(getDefaultDashboard("CHEF_EQUIPE")).toBe("/dashboard/manager");
    expect(getDefaultDashboard("EMPLOYE")).toBe("/dashboard/employee");
  });
});
