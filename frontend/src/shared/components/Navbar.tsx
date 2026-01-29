import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User, Settings } from "lucide-react";
import "./Navbar.css";

interface NavbarProps {
  userName?: string;
  userRole?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  userName = "User",
  userRole = "Role",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="navbar">

      <div className="navbar-profile-container">
        <div className="navbar-profile" onClick={() => setIsOpen(!isOpen)}>
          <div className="profile-info">
            <span className="profile-name">{userName}</span>
            <span className="profile-role">{userRole}</span>
          </div>
          <div className="profile-avatar">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
        </div>

        {isOpen && (
          <div className="profile-dropdown">
            <Link to="/profile" className="dropdown-item">
              <User size={16} />
              <span>My Profile</span>
            </Link>
            {/* 
                        <Link to="/settings" className="dropdown-item">
                            <Settings size={16} />
                            <span>Settings</span>
                        </Link>
                        */}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
