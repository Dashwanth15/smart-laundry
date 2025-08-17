

import './App.css';
import './styles.css';
import Login from './login';
import Header from './components/Header';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

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
      <div className="App">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
