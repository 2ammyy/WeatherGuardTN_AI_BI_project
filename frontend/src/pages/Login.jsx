import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const Login = () => {
    const handleSuccess = async (response) => {
        try {
            // 1. Send Google ID Token to your backend
            const res = await axios.post('http://localhost:5000/api/auth/google', {
                token: response.credential 
            });
            // 2. Save your custom JWT token
            localStorage.setItem('token', res.data.token);
            window.location.href = '/dashboard';
        } catch (err) {
            console.error("Login failed", err);
        }
    };

    return (
        <div style={styles.container}>
            <h2>WeatherGuardTN</h2>
            <GoogleLogin 
                onSuccess={handleSuccess} 
                onError={() => console.log('Login Failed')} 
            />
        </div>
    );
};