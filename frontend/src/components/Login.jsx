import React, { useEffect } from 'react';

const Login = ({ onLoginSuccess, onSwitchToSignup }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  // ==================== GOOGLE AUTH LOGIC ====================
  useEffect(() => {
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: "932539718184-ajqdo7khqr8fgvshaojq84glpbvf7dt7.apps.googleusercontent.com", // Replace with your actual Client ID
        callback: handleGoogleResponse,
      });

      google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { theme: "outline", size: "large", width: "100%" } 
      );
    }
  }, []);

  const handleGoogleResponse = (response) => {
    console.log("Encoded JWT ID token: " + response.credential);
    // In a real app, you'd send response.credential to your backend to verify
    onLoginSuccess({ name: "Google User", method: "google" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      onLoginSuccess({ name: email.split('@')[0], email });
    }
  };

  return (
    <div className="auth-card">
      <h2><i className="fas fa-sign-in-alt"></i> Login</h2>
      <p>Access WeatherGuardTN Dashboard</p>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="auth-btn">Sign In</button>
      </form>

      <div className="separator">
        <span>OR</span>
      </div>

      {/* This is where the Google Button will appear */}
      <div id="googleSignInDiv"></div>

      <p className="auth-footer">
        Don't have an account? <span onClick={onSwitchToSignup}>Sign Up</span>
      </p>
    </div>
  );
};

export default Login;