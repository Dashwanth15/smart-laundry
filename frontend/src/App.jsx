

import './App.css';
import './styles.css';
import Login from './login';
import Calendar from './calendar';
import Batch from './batch';
import BatchType from './batchType';
import Header from './components/Header';
import Footer from './components/Footer';
import Breadcrumb from './components/Breadcrumb';
import ForgotPassword from './components/ForgotPassword';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PrivateRoute } from './contexts/PrivateRoute';
import { useState, useEffect } from 'react';

function Home() {
  const { isAuthenticated } = useAuth();
  const [activeFeature, setActiveFeature] = useState(0);
  const getStartedTo = isAuthenticated ? '/calendar' : '/login';

  const features = [
    {
      icon: "🧺",
      title: "Easy Scheduling",
      description: "Schedule your laundry pickup with just a few clicks. Choose your preferred time slot and we'll handle the rest."
    },
    {
      icon: "🚚",
      title: "Fast Delivery",
      description: "Get your freshly cleaned clothes delivered right to your doorstep within 24-48 hours."
    },
    {
      icon: "✨",
      title: "Professional Care",
      description: "Expert cleaning with eco-friendly products. Your clothes are in safe hands."
    },
    {
      icon: "💳",
      title: "Secure Payment",
      description: "Multiple payment options with secure transactions. Pay online or on delivery."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Working Professional",
      text: "Wash-Up has been a lifesaver! No more worrying about laundry on busy weekdays.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Student",
      text: "Affordable and reliable. The app makes it so easy to track my orders.",
      rating: 5
    },
    {
      name: "Emma Davis",
      role: "Busy Parent",
      text: "Great service! My clothes always come back fresh and perfectly folded.",
      rating: 5
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="brand-highlight">Wash-Up!</span>
          </h1>
          <p className="hero-subtitle">
            Your one-stop solution for convenient and hassle-free laundry service.
          </p>
          <p className="hero-description">
            Experience professional cleaning with just a few clicks. Save time, enjoy freshly cleaned clothes, and never worry about laundry day again.
          </p>
          <div className="cta-buttons">
            <Link to={getStartedTo} className="cta-primary">Get Started</Link>
            <a href="#features" className="cta-secondary">Learn More</a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-card">
            <div className="card-icon">🧺</div>
            <div className="card-text">Schedule Pickup</div>
          </div>
          <div className="floating-card delay-1">
            <div className="card-icon">✨</div>
            <div className="card-text">Professional Clean</div>
          </div>
          <div className="floating-card delay-2">
            <div className="card-icon">🚚</div>
            <div className="card-text">Fast Delivery</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="section-title">Why Choose Wash-Up?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card ${activeFeature === index ? 'active' : ''}`}
              onMouseEnter={() => setActiveFeature(index)}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">10K+</div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">50K+</div>
            <div className="stat-label">Orders Completed</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">98%</div>
            <div className="stat-label">Satisfaction Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Customer Support</div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <h2 className="section-title">What Our Customers Say</h2>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-stars">
                {'⭐'.repeat(testimonial.rating)}
              </div>
              <p className="testimonial-text">"{testimonial.text}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="author-info">
                  <div className="author-name">{testimonial.name}</div>
                  <div className="author-role">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-text">Join thousands of satisfied customers and experience the convenience of Wash-Up today!</p>
          <Link to={getStartedTo} className="cta-button">Sign Up Now</Link>
        </div>
      </section>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Header />
          <Breadcrumb />
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
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
