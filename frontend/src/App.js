import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import CapexRequestForm from "@/pages/CapexRequestForm";
import RequestsList from "@/pages/RequestsList";
import RequestDetail from "@/pages/RequestDetail";
import SampleRequests from "@/pages/SampleRequests";
import UserManagement from "@/pages/UserManagement";
import Notifications from "@/pages/Notifications";
import Analytics from "@/pages/Analytics";
import ProjectTimeline from "@/pages/ProjectTimeline";
import SettingsPage from "@/pages/SettingsPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Configure axios defaults
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("capex_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("capex_token");
      localStorage.removeItem("capex_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Handle Google Auth callback
      const urlParams = new URLSearchParams(window.location.search);
      const googleToken = urlParams.get('token');
      const googleUser = urlParams.get('user');

      if (googleToken && googleUser) {
        try {
          const userData = JSON.parse(decodeURIComponent(googleUser));
          // Check if user exists in our system by email
          const checkResponse = await axios.post(`${API}/auth/google-login`, {
            email: userData.email,
            name: userData.name,
            google_id: userData.id,
            picture: userData.picture,
          });
          const { access_token, user: appUser } = checkResponse.data;
          localStorage.setItem("capex_token", access_token);
          localStorage.setItem("capex_user", JSON.stringify(appUser));
          setUser(appUser);
          // Clean URL
          window.history.replaceState({}, document.title, appUser.role === "admin" ? "/admin" : "/dashboard");
          setIsLoading(false);
          return;
        } catch (error) {
          console.error("Google auth failed:", error);
          window.history.replaceState({}, document.title, "/login");
        }
      }

      const token = localStorage.getItem("capex_token");
      const savedUser = localStorage.getItem("capex_user");

      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
          localStorage.setItem("capex_user", JSON.stringify(response.data));
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem("capex_token");
          localStorage.removeItem("capex_user");
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem("capex_token", access_token);
    localStorage.setItem("capex_user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("capex_token");
    localStorage.removeItem("capex_user");
    setUser(null);
  };

  const authValue = {
    user,
    setUser,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="requests" element={<RequestsList />} />
            <Route path="requests/new" element={<CapexRequestForm />} />
            <Route path="requests/:id" element={<RequestDetail />} />
            <Route path="sample-requests" element={<SampleRequests />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="project-timeline" element={<ProjectTimeline />} />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={["capex_head", "buyer"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthContext.Provider>
  );
}

export default App;
