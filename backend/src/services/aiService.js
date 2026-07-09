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
- isSolvable = true: Issue can be resolved with a helpful reply (general queries, login tips, course access guides)
- isSolvable = false: Requires human intervention (payment disputes, refunds, billing errors)

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
 * Process a new ticket through AI pipeline (autopilot mode).
 * - Classifies priority and solvability
 * - If LOW/MEDIUM and solvable → auto-reply and RESOLVE
 * - Otherwise → set PENDING for human review
 */
async function processTicketWithAI(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error('Ticket not found');

  let analysis;
  try {
    analysis = await analyzeTicket(ticket.subject, ticket.body);
  } catch (err) {
    console.error('AI analysis failed:', err);
    // Fallback: mark as PENDING for human review
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
    return;
  }

  const { priority, isSolvable, autoReplyDraft } = analysis;
  const canAutopilot = isSolvable && (priority === 'LOW' || priority === 'MEDIUM');

  if (canAutopilot) {
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
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        priority,
        status: isSolvable ? 'REVIEW_NEEDED' : 'PENDING',
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
  }
}

module.exports = { analyzeTicket, summarizeTicket, processTicketWithAI };
