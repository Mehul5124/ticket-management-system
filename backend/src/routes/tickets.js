const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { processTicketWithAI, summarizeTicket } = require('../services/aiService');

const router = express.Router();

// GET /api/tickets — List tickets with optional filters
router.get('/', authenticate, async (req, res) => {
  const { status, priority, search, assignedToId } = req.query;

  const where = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;

  if (search) {
    where.OR = [
      { customerEmail: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(tickets);
  } catch (err) {
    console.error('List tickets error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/tickets/:id — Get a single ticket with audit logs
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    return res.status(200).json(ticket);
  } catch (err) {
    console.error('Get ticket error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/tickets — Create a new ticket (Email Simulator)
router.post('/', authenticate, async (req, res) => {
  const { customerEmail, customerName, subject, body } = req.body;

  if (!customerEmail || !customerName || !subject || !body) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const ticket = await prisma.ticket.create({
      data: { customerEmail, customerName, subject, body },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: ticket.id,
        action: 'TICKET_CREATED',
        performedBy: req.user.name || 'SYSTEM',
      },
    });

    // Process with AI in background (non-blocking)
    processTicketWithAI(ticket.id).catch((err) =>
      console.error('Background AI processing error:', err)
    );

    return res.status(201).json({
      message: 'Ticket created. AI is processing it in the background.',
      ticket,
    });
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// PATCH /api/tickets/:id — Update ticket status, priority, or assignment
router.patch('/:id', authenticate, async (req, res) => {
  const { status, priority, assignedToId } = req.body;
  const { id } = req.params;

  try {
    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedToId !== undefined && { assignedToId }),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: id,
        action: `TICKET_UPDATED`,
        performedBy: req.user.name,
      },
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Update ticket error:', err);
    return res.status(500).json({ error: 'Ticket not found or could not be updated.' });
  }
});

// POST /api/tickets/:id/summarize — Generate AI summary for a ticket
router.post('/:id/summarize', authenticate, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const summary = await summarizeTicket(ticket.subject, ticket.body);

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { aiSummary: summary },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: req.params.id,
        action: 'AI_SUMMARY_GENERATED',
        performedBy: req.user.name,
      },
    });

    return res.status(200).json({ summary, ticket: updated });
  } catch (err) {
    console.error('Summarize error:', err);
    return res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

// POST /api/tickets/:id/reprocess — Re-run AI processing on a ticket
router.post('/:id/reprocess', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    await processTicketWithAI(req.params.id);

    const updated = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { auditLogs: { orderBy: { createdAt: 'asc' } } },
    });

    return res.status(200).json({ message: 'Ticket reprocessed by AI.', ticket: updated });
  } catch (err) {
    console.error('Reprocess error:', err);
    return res.status(500).json({ error: 'Failed to reprocess ticket.' });
  }
});

// DELETE /api/tickets/:id — Delete a ticket (Admin only)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await prisma.ticket.delete({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'Ticket deleted successfully.' });
  } catch (err) {
    console.error('Delete ticket error:', err);
    return res.status(500).json({ error: 'Ticket not found or could not be deleted.' });
  }
});

module.exports = router;
