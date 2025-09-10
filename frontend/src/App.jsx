

import './App.css';
import './styles.css';
import Login from './login';
import Calendar from './calendar';
import Batch from './batch';
import BatchType from './batchType';
import Header from './components/Header';
import ForgotPassword from './components/ForgotPassword';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './contexts/PrivateRoute';

function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <h2>Welcome to Wash-Up!</h2>
        <p className="welcome-text">
          Your one-stop solution for convenient and hassle-free laundry service. 
          Experience professional cleaning with just a few clicks.
        </p>
        <Link to="/login" className="login-button">Get Started</Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/calendar" element={
              <PrivateRoute>
                <Calendar />
              </PrivateRoute>
            } />
            <Route path="/batch/:date/:dayType" element={
              <PrivateRoute>
                <Batch />
              </PrivateRoute>
            } />
            <Route path="/batch/:date/:dayType/:batchType" element={
              <PrivateRoute>
                <BatchType />
              </PrivateRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
