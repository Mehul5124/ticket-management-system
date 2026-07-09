const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const router = express.Router();

// Email regex: must contain characters, @, domain, and TLD (e.g. user@example.com)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password regex: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, expectedRole } = req.body;

  // --- Input presence check ---
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // --- Email format validation ---
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address (e.g. user@example.com).' });
  }

  // --- Password strength validation ---
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error:
        'Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&^#).',
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Intentionally vague error to prevent user enumeration attacks
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (expectedRole && user.role !== expectedRole) {
      const portalType = user.role === 'ADMIN' ? 'Admin portal' : 'Agent portal';
      return res.status(403).json({ error: `Access denied. Please use the ${portalType}.` });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(200).json({
      message: 'Login successful.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me — verify current user session
router.get('/me', (req, res) => {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ user: decoded });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

module.exports = router;
