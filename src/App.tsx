import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/States";
import { LoginPage } from "./views/LoginPage";
import { Overview } from "./views/Overview";
import { Realtime } from "./views/Realtime";
import { Feeds } from "./views/Feeds";
import { RouterView } from "./views/Router";
import { Compile } from "./views/Compile";
import { Sse } from "./views/Sse";
import { Workers } from "./views/Workers";

function Splash() {
  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "var(--surface-0)",
      }}
    >
      <Spinner size={34} />
    </div>
  );
}

function Gate() {
  const { status } = useAuth();

  if (status === "loading") return <Splash />;
  if (status === "anon") return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/realtime" element={<Realtime />} />
        <Route path="/feeds" element={<Feeds />} />
        <Route path="/router" element={<RouterView />} />
        <Route path="/compile" element={<Compile />} />
        <Route path="/sse" element={<Sse />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  );
}
