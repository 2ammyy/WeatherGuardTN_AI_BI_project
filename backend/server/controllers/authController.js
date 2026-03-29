const pool = require('./db');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res) => {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
    });
    const { email, name, sub, picture } = ticket.getPayload();

    let user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
        user = await pool.query(
            "INSERT INTO users (email, name, google_id, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *",
            [email, name, sub, picture]
        );
    }
    const appToken = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token: appToken, user: user.rows[0] });
};

exports.deleteAccount = async (req, res) => {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    res.status(200).json({ message: "Account deleted" });
};