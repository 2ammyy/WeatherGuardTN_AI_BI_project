import React, { useState } from 'react';
import axios from 'axios';

const Profile = ({ user }) => {
    const [name, setName] = useState(user?.name || "");

    const handleDelete = async () => {
        if (window.confirm("This will delete your WeatherGuardTN account permanently.")) {
            await axios.delete('http://localhost:5000/api/auth/profile', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            localStorage.clear();
            window.location.href = "/";
        }
    };

    return (
        <div className="glass-card">
            <img src={user?.avatar_url} alt="Profile" className="avatar" />
            <h3>{name}</h3>
            <p className="email">{user?.email}</p>
            <button className="btn-delete" onClick={handleDelete}>Delete Account</button>

            <style>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 2rem;
                    text-align: center;
                    color: white;
                    max-width: 350px;
                    margin: auto;
                }
                .avatar { width: 80px; border-radius: 50%; border: 2px solid #4facfe; }
                .btn-delete { margin-top: 20px; background: none; border: 1px solid #ff4b2b; color: #ff4b2b; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.3s; }
                .btn-delete:hover { background: #ff4b2b; color: white; }
            `}</style>
        </div>
    );
};