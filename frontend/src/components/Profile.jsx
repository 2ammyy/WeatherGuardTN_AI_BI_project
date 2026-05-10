import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import axios from 'axios';

const Profile = ({ user, onLogout }) => {
    const { t: __ } = useTranslation();
    const [name, setName] = useState(user?.name || "");
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await axios.delete(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/auth/profile`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            localStorage.clear();
            if (onLogout) onLogout();
            window.location.href = "/";
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete account. Please try again.');
        } finally {
            setIsDeleting(false);
            setShowConfirmModal(false);
        }
    };

    const ConfirmModal = () => (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
        }} onClick={() => setShowConfirmModal(false)}>
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>

            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
                borderRadius: 24,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: 32,
                maxWidth: 400,
                width: '100%',
                textAlign: 'center',
                animation: 'slideUp 0.3s ease-out',
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                    fontSize: 48,
                    marginBottom: 16,
                    background: 'rgba(239, 68, 68, 0.1)',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                }}>
                    ⚠️
                </div>
                <h3 style={{ color: '#f87171', marginBottom: 12, fontSize: 20, fontWeight: 700 }}>
                    {__('deleteAccount')}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
                    {__('deleteAccountWarning')}
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => setShowConfirmModal(false)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 12,
                            border: '1px solid #334155',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255,255,255,0.05)';
                            e.target.style.borderColor = '#475569';
                            e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.borderColor = '#334155';
                            e.target.style.color = '#94a3b8';
                        }}
                    >
                        {__('cancel')}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: 12,
                            border: 'none',
                            background: '#ef4444',
                            color: 'white',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            opacity: isDeleting ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isDeleting) {
                                e.target.style.background = '#dc2626';
                                e.target.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isDeleting) {
                                e.target.style.background = '#ef4444';
                                e.target.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {isDeleting ? __('deleting') : __('confirmDeleteAccount')}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {showConfirmModal && <ConfirmModal />}

            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
                borderRadius: 20,
                border: '1px solid rgba(29, 158, 117, 0.2)',
                padding: '2rem',
                textAlign: 'center',
                maxWidth: 400,
                margin: 'auto',
                animation: 'slideUp 0.3s ease-out',
            }}>
                <style>
                    {`
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}
                </style>

                {/* Avatar */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={__('myProfile')}
                            style={{
                                width: 96,
                                height: 96,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid #1D9E75',
                                padding: 2,
                            }}
                        />
                    ) : (
                        <div style={{
                            width: 96,
                            height: 96,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 40,
                            color: 'white',
                            fontWeight: 700,
                            border: '3px solid #1D9E75',
                        }}>
                            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                    <div style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        background: '#1D9E75',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        border: '2px solid #0f172a',
                    }}>
                        ✓
                    </div>
                </div>

                {/* Name */}
                <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'white',
                }}>
                    {user?.name || __('user')}
                </h3>

                {/* Email */}
                <p style={{
                    margin: '0 0 20px 0',
                    fontSize: 13,
                    color: '#64748b',
                }}>
                    {user?.email}
                </p>

                {/* Account Type Badge */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(29, 158, 117, 0.1)',
                    padding: '4px 12px',
                    borderRadius: 20,
                    marginBottom: 24,
                }}>
                    <span style={{ fontSize: 12 }}>🔗</span>
                    <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 500 }}>
                        {user?.google_id ? __('connectedWithGoogle') : __('emailAccount')}
                    </span>
                </div>

                {/* Stats Section */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '16px 0',
                    borderTop: '1px solid #1e293b',
                    borderBottom: '1px solid #1e293b',
                    marginBottom: 24,
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>0</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{__('posts')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>0</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{__('comments')}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>0</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{__('alerts')}</div>
                    </div>
                </div>

                {/* Delete Button */}
                <button
                    onClick={() => setShowConfirmModal(true)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 12,
                        border: '1px solid #ef4444',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = '#ef4444';
                        e.target.style.color = 'white';
                        e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#ef4444';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    <span>🗑️</span> {__('deleteAccount')}
                </button>

                {/* Note */}
                <p style={{
                    margin: '16px 0 0 0',
                    fontSize: 10,
                    color: '#64748b',
                }}>
                    {__('permanentAction')}
                </p>
            </div>
        </>
    );
};

export default Profile;