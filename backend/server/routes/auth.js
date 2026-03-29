// Protect these routes with your authMiddleware
router.put('/update-profile', authMiddleware, async (req, res) => {
    const { name } = req.body;
    await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, req.user.id]);
    res.send("Profile Updated");
});

router.delete('/delete-account', authMiddleware, async (req, res) => {
    await pool.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    res.send("Account Deleted");
});