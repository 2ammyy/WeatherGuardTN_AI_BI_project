import React, { useState } from 'react';
import axios from 'axios';

const GOVERNORATES = [
  "Ariana", "BÃ©ja", "Ben Arous", "Bizerte", "GabÃ¨s", "Gafsa",
  "Jendouba", "Kairouan", "Kasserine", "KÃ©bili", "Le Kef", "Mahdia",
  "La Manouba", "MÃ©denine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
];

const USER_TYPES = [
  { value: "student_parent", label: "ðŸŽ“ Student / Parent" },
  { value: "delivery_driver", label: "ðŸ›µ Delivery Driver" },
  { value: "fisherman", label: "ðŸŽ£ Fisherman / Mariner" },
  { value: "general_population", label: "ðŸ‘¤ General Population" },
  { value: "government", label: "ðŸ›ï¸ Government / Civil Protection / Authority" },
  { value: "ngo", label: "ðŸ¤ NGO / Local Association" },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const SuccessScreen = ({ name, governorate, onSwitchToLogin }) => (
  <div className="auth-card" style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 64, marginBottom: 12 }}>ðŸŽ‰</div>
    <h2 style={{ color: '#10b981', marginBottom: 8 }}>Welcome, {name}!</h2>
    <p style={{ color: '#6b7280', marginBottom: 20 }}>
      Your account has been created successfully.
    </p>
    <div style={{
      background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12,
      padding: '16px 20px', marginBottom: 20, textAlign: 'left'
    }}>
      <p style={{ margin: '6px 0', fontSize: 14 }}>ðŸ“ Region: <strong>{governorate}</strong></p>
      <p style={{ margin: '6px 0', fontSize: 14 }}>ðŸ“§ A welcome email has been sent to your inbox</p>
      <p style={{ margin: '6px 0', fontSize: 14 }}>ðŸŒ¦ï¸ You'll receive personalized weather alerts for your region</p>
      <p style={{ margin: '6px 0', fontSize: 14 }}>ðŸ›¡ï¸ Stay safe with early danger predictions</p>
    </div>
    <button className="auth-btn" onClick={onSwitchToLogin} style={{ width: '100%' }}>
      Login to Dashboard â†’
    </button>
  </div>
);

const Signup = ({ onSignupSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', governorate: '', user_type: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.governorate) { setError('Please select your governorate.'); return; }
    if (!formData.user_type) { setError('Please select your situation.'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        governorate: formData.governorate,
        user_type: formData.user_type,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SuccessScreen
        name={formData.name}
        governorate={formData.governorate}
        onSwitchToLogin={onSwitchToLogin}
      />
    );
  }

  const selectStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #d1d5db', fontSize: '14px',
    background: 'white', cursor: 'pointer'
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
          âš ï¸ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Full Name</label>
          <input type="text" name="name" placeholder="Your full name" onChange={handleChange} required />
        </div>
        <div className="input-group">
          <label>Email</label>
          <input type="email" name="email" placeholder="your@email.com" onChange={handleChange} required />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input type="password" name="password" placeholder="Min. 6 characters" onChange={handleChange} required />
        </div>
        <div className="input-group">
          <label>ðŸ“ Your Governorate</label>
          <select name="governorate" value={formData.governorate} onChange={handleChange} required style={selectStyle}>
            <option value="">-- Select your governorate --</option>
            {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>ðŸ‘¤ Your Situation</label>
          <select name="user_type" value={formData.user_type} onChange={handleChange} required style={selectStyle}>
            <option value="">-- Select your situation --</option>
            {USER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button type="submit" className="auth-btn signup" disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'â³ Creating account...' : 'ðŸš€ Create Account'}
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
