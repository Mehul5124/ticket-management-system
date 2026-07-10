const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/prisma');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Analyze a ticket with Gemini AI.
 * Returns: { priority, isSolvable, autoReplyDraft }
 */
async function analyzeTicket(subject, body) {
  const prompt = `
You are an expert support agent for an online course platform. Analyze this support email and respond ONLY with valid JSON.

Subject: ${subject}
Body: ${body}

Classify the ticket and return a JSON object with these exact fields:
{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "isSolvable": true | false,
  "autoReplyDraft": "string — a warm, personalized reply to the student (only if isSolvable is true, otherwise empty string)"
}

Priority Guidelines:
- LOW: General pre-purchase questions, course syllabus details, certificates of completion queries, course recommendations, account info queries, active coupon codes requests.
- MEDIUM: Can't see course after purchase, login issues, password reset, updating email or profile details, slow video playback/buffering.
- HIGH: Payment failed but access not granted, course content not loading (broken links or empty video player), quiz or assignment submission errors, platform error messages.
- URGENT: Money deducted but no course access, refund requests, double charges, billing/invoice disputes, account hacked/unauthorized access.

Solvability Guidelines:
- isSolvable = true: Issue can be resolved with a helpful reply (general queries, login tips, course access guides, technical troubleshooting like clearing cache/cookies for video player errors)
- isSolvable = false: Requires human intervention (payment disputes, refunds, billing errors, backend account fixes)

The autoReplyDraft must be:
- Written to the specific student (not generic)
- Warm, professional, and empathetic
- Provide actionable steps
- Sign off as "Helpdesk Support Team"

Return ONLY the JSON object, no markdown, no explanation.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const text = response.text.trim();
  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Summarize a ticket body into bullet points.
 */
async function summarizeTicket(subject, body) {
  const prompt = `
You are a support team lead. Summarize this customer support email in 3-4 clear bullet points for your team.
Be concise, factual, and highlight the core issue and any urgency.

Subject: ${subject}
Body: ${body}

Return ONLY the bullet points as plain text, each starting with "•". No headers, no extra explanation.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text.trim();
}

/**
 * Quota-Based Auto-Assignment
 * ─────────────────────────────────────────────────────────────────────────
 * Formula:
 *   Quota per agent = ceil(Total Active Tickets ÷ Number of Agents)
 *
 * Strategy:
 *   1. Count all PENDING + REVIEW_NEEDED tickets currently in the system.
 *   2. Calculate the fair quota each agent should carry.
 *   3. Find the agent who is furthest BELOW their quota.
 *   4. Assign this ticket to that agent.
 *
 * Why this is better than simple least-loaded:
 *   - At scale (1000s of emails/day), the quota adapts dynamically as the
 *     total ticket volume grows — every agent always carries a fair share.
 *   - Each ticket is assigned to exactly ONE agent.
 *   - If no agents exist, the ticket stays unassigned gracefully.
 * ─────────────────────────────────────────────────────────────────────────
 */
async function assignByQuota(ticketId) {
  // Step 1: Fetch all agents with their current ACTIVE ticket count
  // "Active" = PENDING or REVIEW_NEEDED (exclude RESOLVED — closed work shouldn't count)
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT' },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          tickets: {
            where: {
              status: { in: ['PENDING', 'REVIEW_NEEDED'] },
            },
          },
        },
      },
    },
  });

  // No agents registered — ticket stays unassigned gracefully
  if (!agents || agents.length === 0) {
    console.warn(`[Auto-Assign] No agents available. Ticket ${ticketId} remains unassigned.`);
    return null;
  }

  const numAgents = agents.length;

  // Step 2: Calculate total active tickets INCLUDING the one being assigned right now
  const currentTotal = agents.reduce((sum, a) => sum + a._count.tickets, 0);
  const totalAfterAssignment = currentTotal + 1;

  // Step 3: Fair quota per agent (round up so nobody is left with more than 1 extra)
  const quotaPerAgent = Math.ceil(totalAfterAssignment / numAgents);

  // Step 4: Sort agents by current load ascending → agent furthest below quota comes first
  const sorted = [...agents].sort((a, b) => a._count.tickets - b._count.tickets);
  const targetAgent = sorted[0];

  // Step 5: Assign the ticket to this agent (single assignment, guaranteed)
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { assignedToId: targetAgent.id },
  });

  console.log(
    `[Auto-Assign] Quota: ${quotaPerAgent} tickets/agent ` +
    `(${totalAfterAssignment} total ÷ ${numAgents} agents). ` +
    `Ticket → "${targetAgent.name}" (current: ${targetAgent._count.tickets} | quota: ${quotaPerAgent})`
  );

  return targetAgent;
}


/**
 * Process a new ticket through AI pipeline (autopilot mode).
 * - Classifies priority and solvability
 * - If LOW/MEDIUM and solvable → auto-reply and RESOLVE
 * - Otherwise → PENDING or REVIEW_NEEDED + auto-assign to least-loaded agent
 */
async function processTicketWithAI(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error('Ticket not found');

  let analysis;
  try {
    analysis = await analyzeTicket(ticket.subject, ticket.body);
  } catch (err) {
    console.error('AI analysis failed:', err);
    // Fallback: mark as PENDING and try to auto-assign
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { priority: 'MEDIUM', status: 'PENDING' },
    });
    await prisma.auditLog.create({
      data: {
        ticketId,
        action: 'AI_ANALYSIS_FAILED',
        performedBy: 'SYSTEM',
      },
    });

    // Still try to assign even on analysis failure
    const agent = await assignByQuota(ticketId);
    if (agent) {
      await prisma.auditLog.create({
        data: {
          ticketId,
          action: `TICKET_AUTO_ASSIGNED`,
          performedBy: 'SYSTEM',
        },
      });
    }
    return;
  }

  const { priority, isSolvable, autoReplyDraft } = analysis;
  const canAutopilot = isSolvable && (priority === 'LOW' || priority === 'MEDIUM');

  if (canAutopilot) {
    // Autopilot path — AI resolves it, no human assignment needed
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        priority,
        status: 'RESOLVED',
        aiResponse: autoReplyDraft,
        aiAutoReplied: true,
      },
    });
    await prisma.auditLog.create({
      data: {
        ticketId,
        action: 'AI_AUTO_REPLIED_AND_RESOLVED',
        performedBy: 'AI',
      },
    });
  } else {
    // Human routing path — set status first
    const newStatus = isSolvable ? 'REVIEW_NEEDED' : 'PENDING';
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        priority,
        status: newStatus,
        aiResponse: autoReplyDraft || null,
        aiAutoReplied: false,
      },
    });
    await prisma.auditLog.create({
      data: {
        ticketId,
        action: 'AI_ROUTED_TO_HUMAN',
        performedBy: 'AI',
      },
    });

    // Auto-assign to the least-loaded agent (even distribution)
    const agent = await assignByQuota(ticketId);
    if (agent) {
      await prisma.auditLog.create({
        data: {
          ticketId,
          action: `TICKET_AUTO_ASSIGNED_TO_${agent.name.toUpperCase().replace(/\s+/g, '_')}`,
          performedBy: 'SYSTEM',
        },
      });
    }
  }
}

module.exports = { analyzeTicket, summarizeTicket, processTicketWithAI };

