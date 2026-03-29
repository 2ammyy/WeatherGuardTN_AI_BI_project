import React, { useState } from 'react';

const Signup = ({ onSignupSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Account created successfully!");
    onSignupSuccess();
  };

  return (
    <div className="auth-card">
      <h2><i className="fas fa-user-plus"></i> Inscription</h2>
      <p>Join the Tunisian weather vigilance network</p>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Full Name</label>
          <input type="text" onChange={(e) => setFormData({...formData, name: e.target.value})} required />
        </div>
        <div className="input-group">
          <label>Email</label>
          <input type="email" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input type="password" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
        </div>
        <button type="submit" className="auth-btn signup">Register</button>
      </form>
      <p className="auth-footer">
        Already have an account? <span onClick={onSwitchToLogin}>Login here</span>
      </p>
    </div>
  );
};

export default Signup;