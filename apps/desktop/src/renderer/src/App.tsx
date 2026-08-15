import { useEffect, useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { NavSidebar } from "./components/NavSidebar";
import { Home } from "./screens/Home";
import { Actions } from "./screens/Actions";
import { Waiting } from "./screens/Waiting";
import { Documents } from "./screens/Documents";
import { History } from "./screens/History";
import { Settings } from "./screens/Settings";
import { SituationDetail } from "./screens/SituationDetail";
import { Onboarding } from "./screens/Onboarding";

function Shell() {
  return (
    <div className="app-shell">
      <NavSidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/waiting" element={<Waiting />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/situation/:id" element={<SituationDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    window.clerk.getSettings().then((s) => setOnboarded(Boolean((s as { onboardingComplete?: boolean }).onboardingComplete)));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    window.clerk.getSettings().then((s) => {
      const theme = (s as { theme?: string }).theme ?? "system";
      if (theme === "system") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", theme);
    });
  }, [onboarded]);

  if (onboarded === null) return null;
  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />;

  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
