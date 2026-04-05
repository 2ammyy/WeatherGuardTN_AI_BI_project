import React, { useState } from 'react';
import axios from 'axios';

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa",
  "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia",
  "La Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
];

const USER_TYPES = [
  { value: "student_parent", label: "🎓 Student / Parent" },
  { value: "delivery_driver", label: "🛵 Delivery Driver" },
  { value: "fisherman", label: "🎣 Fisherman / Mariner" },
  { value: "general_population", label: "👤 General Population" },
  { value: "government", label: "🏛️ Government / Civil Protection / Authority" },
  { value: "ngo", label: "🤝 NGO / Local Association" },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const Signup = ({ onSignupSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    governorate: '',
    user_type: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.governorate) { setError('Please select your governorate.'); return; }
    if (!formData.user_type) { setError('Please select your situation.'); return; }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        governorate: formData.governorate,
        user_type: formData.user_type,
      });
      alert('Account created successfully! Please log in.');
      onSignupSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
      <h2><i className="fas fa-user-plus"></i> Sign Up</h2>
      <p>Join the Tunisian weather vigilance network</p>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#dc2626', padding: '10px 14px',
          borderRadius: '8px', marginBottom: '12px', fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Your full name"
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="your@email.com"
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Choose a password"
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>📍 Your Governorate</label>
          <select
            name="governorate"
            value={formData.governorate}
            onChange={handleChange}
            required
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '1px solid #d1d5db', fontSize: '14px',
              background: 'white', cursor: 'pointer'
            }}
          >
            <option value="">-- Select your governorate --</option>
            {GOVERNORATES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label>👤 Your Situation</label>
          <select
            name="user_type"
            value={formData.user_type}
            onChange={handleChange}
            required
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px',
              border: '1px solid #d1d5db', fontSize: '14px',
              background: 'white', cursor: 'pointer'
            }}
          >
            <option value="">-- Select your situation --</option>
            {USER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="auth-btn signup"
          disabled={loading}
          style={{ marginTop: '8px' }}
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <span onClick={onSwitchToLogin} style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}>
          Login here
        </span>
      </p>
    </div>
  );
};

export default Signup;