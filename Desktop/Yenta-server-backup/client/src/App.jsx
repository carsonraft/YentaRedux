import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProspectDetailPage from './pages/ProspectDetailPage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/prospects/:id" 
          element={
            <PrivateRoute>
              <ProspectDetailPage />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;