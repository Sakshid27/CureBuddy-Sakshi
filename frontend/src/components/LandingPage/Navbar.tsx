// src/components/Navbar.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        console.log("Navbar: Loaded user =>", parsed); // Debug log
        setUsername(parsed.name || parsed.email || "User");
        setRole(parsed.role || "");
      } catch (err) {
        console.error("Failed to parse user from localStorage", err);
        setUsername("");
        setRole("");
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-dropdown")) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setUsername("");
    setRole("");
    navigate("/login");
  };

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  return (
    <header className="relative z-50 flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 md:px-8 py-4 shadow-sm bg-white gap-4">
      {/* LOGO */}
      <Link to="/" className="flex items-center space-x-2 cursor-pointer">
        <img src="/Logo.png" alt="CureBuddy Logo" className="w-8 h-8" />
        <h1 className="text-2xl font-bold text-indigo-900">CureBuddy</h1>
      </Link>

      {/* NAV LINKS */}
      <nav className="flex flex-wrap justify-center lg:justify-start items-center gap-4 lg:gap-8 text-sm md:text-base font-medium text-gray-800">
        <Link to="/" className="hover:text-indigo-600">HOME</Link>
        <Link to="/alldoctors" className="hover:text-indigo-600 whitespace-nowrap">ALL DOCTORS</Link>
        <Link to="/about" className="hover:text-indigo-600">ABOUT</Link>
        <Link to="/contact" className="hover:text-indigo-600">CONTACT</Link>
        {username && role === "patient" && (
          <div className="relative group">
  <button
    className="hover:text-indigo-600 focus:outline-none"
    onClick={(e) => e.preventDefault()}
  >
    MY APPOINTMENTS
  </button>
  <div className="absolute hidden group-hover:block group-focus-within:block bg-white border rounded shadow-md mt-2 z-50 min-w-[180px]">
    <Link
      to="/myappointments"
      className="block px-4 py-2 text-sm hover:bg-gray-100 text-gray-800"
    >
      Booked Appointments
    </Link>
    <Link
      to="/appointment-history"
      className="block px-4 py-2 text-sm hover:bg-gray-100 text-gray-800"
    >
      Appointment History
    </Link>
  </div>
</div>

        )}
      </nav>

      {/* AUTH BUTTON / DROPDOWN */}
      {username ? (
        <div className="relative user-dropdown">
          <button
            onClick={toggleDropdown}
            className="bg-indigo-100 text-indigo-900 px-3 py-2 rounded-full text-xs md:text-sm font-semibold hover:bg-indigo-200 transition whitespace-nowrap"
          >
            Hi, {username}
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
              {role === "patient" && (
  <>
    <Link
      to="/myappointments"
      className="block px-4 py-2 text-sm hover:bg-gray-100"
      onClick={() => setIsDropdownOpen(false)}
    >
      Booked Appointments
    </Link>
    <Link
      to="/appointment-history"
      className="block px-4 py-2 text-sm hover:bg-gray-100"
      onClick={() => setIsDropdownOpen(false)}
    >
      Appointment History
    </Link>
  </>
)}

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          className="bg-indigo-500 text-white px-4 py-2 rounded-full text-xs md:text-sm font-semibold hover:bg-indigo-600 transition whitespace-nowrap"
          onClick={() => navigate("/login")}
        >
          Login / Sign up
        </button>
      )}
    </header>
  );
};

export default Navbar;
