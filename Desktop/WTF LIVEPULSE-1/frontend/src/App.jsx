import { DashboardProvider } from './store/DashboardContext';
import { useDashboardState } from './hooks/useDashboard';
import { TopBar } from './components/TopBar';
import { ToastStack } from './components/ToastStack';
import { DashboardPage } from './pages/Dashboard';
import { AnalyticsPage } from './pages/Analytics';
import { AnomaliesPage } from './pages/Anomalies';

function AppContent() {
  const { state } = useDashboardState();

  return (
    <div className="app-shell">
      <TopBar />
      <main style={{ marginTop: 18 }}>
        {state.view === 'analytics' ? (
          <AnalyticsPage />
        ) : state.view === 'anomalies' ? (
          <AnomaliesPage />
        ) : (
          <DashboardPage />
        )}
      </main>
      <ToastStack />
    </div>
  );
}

function App() {
  return (
    <DashboardProvider>
      <AppContent />
    </DashboardProvider>
  );
}

export default App;
