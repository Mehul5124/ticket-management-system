const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// GET /api/agents — Get all agents (Admin only)
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: ROLES.AGENT },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { 
          select: { 
            tickets: {
              where: {
                status: { not: 'RESOLVED' }
              }
            } 
          } 
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(agents);
  } catch (err) {
    console.error('Get agents error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/agents — Create a new agent (Admin only)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  // Password strength: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error:
        'Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&^#).',
    });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const agent = await prisma.user.create({
      data: { name, email, passwordHash, role: ROLES.AGENT },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json(agent);
  } catch (err) {
    console.error('Create agent error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/agents/:id — Delete an agent (Admin only)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ message: 'Agent deleted successfully.' });
  } catch (err) {
    console.error('Delete agent error:', err);
    return res.status(500).json({ error: 'Agent not found or could not be deleted.' });
  }
});

module.exports = router;
