/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Onboarding } from "./components/onboarding/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { WhatIfSimulator } from "./pages/WhatIfSimulator";
import { Missions } from "./pages/Missions";
import { Profile } from "./pages/Profile";
import { ActionPlan } from "./pages/ActionPlan";
import { Insights } from "./pages/Insights";
import { FootprintBreakdown } from "./pages/FootprintBreakdown";
import { DetailedAnalysis } from "./pages/DetailedAnalysis";
import { Chat } from "./pages/Chat";
import { Login } from "./pages/Login";
import { Leaderboard } from "./pages/Leaderboard";
import { ActivityHistory } from "./pages/ActivityHistory";
import { Settings } from "./pages/Settings";
import { useAppStore } from "./store";
import { AuthProvider, useAuth } from "./components/auth/AuthContext";

function ProtectedRoute({ children, allowOnboarding = false }: { children: React.ReactNode, allowOnboarding?: boolean }) {
  const { user, loading } = useAuth();
  const completedOnboarding = useAppStore(state => state.user.completedOnboarding);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (!completedOnboarding && !allowOnboarding) return <Navigate to="/onboarding" />;
  if (completedOnboarding && allowOnboarding) return <Navigate to="/" />;
  
  return allowOnboarding ? <>{children}</> : <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<ProtectedRoute allowOnboarding><Onboarding /></ProtectedRoute>} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/simulator" element={<ProtectedRoute><WhatIfSimulator /></ProtectedRoute>} />
          <Route path="/missions" element={<ProtectedRoute><Missions /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/actions" element={<ProtectedRoute><ActionPlan /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
          <Route path="/footprint" element={<ProtectedRoute><FootprintBreakdown /></ProtectedRoute>} />
          <Route path="/detailed-analysis" element={<ProtectedRoute><DetailedAnalysis /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute><ActivityHistory /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

