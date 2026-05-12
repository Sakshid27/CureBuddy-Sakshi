// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast"; 

const LoginPage: React.FC = () => {
  const [role, setRole] = useState<"patient" | "doctor" | "admin">("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      console.log("API URL:", import.meta.env.VITE_API_URL);
      console.log({ email, password, role });
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role }),
        }
      );

      const data = await response.json();
      console.log("Response:", data);

      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("role", data.role);

        setToken(data.token);
        setUser(data.user);

        toast.success("Login successfully!");

        if (data.role === "patient") return navigate("/all-doctors");
        if (data.role === "doctor") return navigate("/doctor/dashboard");
        if (data.role === "admin") return navigate("/admin");
      } else {
        toast.error(data.message || "Login failed. Check credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Login</h2>

      <form onSubmit={handleLogin} className="space-y-4 w-full">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="w-full p-2 border rounded"
        >
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 border rounded"
          required
        />

        <button className="w-full bg-indigo-500 text-white p-2 rounded">
          Login
        </button>
      </form>

      <div className="flex justify-between items-center w-full mt-4">
        <button
          onClick={() => navigate("/signup")}
          className="text-indigo-500 underline"
        >
          New user? Signup
        </button>

        {(role === "doctor" || role === "patient") && (
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-sm text-blue-500 underline"
          >
            Forgot Password?
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

