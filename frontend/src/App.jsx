import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Team from "./pages/Team";
import PublicRegister from "./pages/PublicRegister";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink/50">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function LoginGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/events" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public, no auth */}
        <Route path="/r/:slug" element={<PublicRegister />} />

        <Route path="/login" element={<LoginGate />} />
        <Route
          path="/events"
          element={
            <Protected>
              <Events />
            </Protected>
          }
        />
        <Route
          path="/events/:id"
          element={
            <Protected>
              <EventDetail />
            </Protected>
          }
        />
        <Route
          path="/team"
          element={
            <Protected>
              <Team />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </AuthProvider>
  );
}
