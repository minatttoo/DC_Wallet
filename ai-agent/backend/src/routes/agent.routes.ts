import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AgentSession } from '../models/AgentSession';
import { Goal, GoalCategory } from '../models/Goal';
import { openAIService } from '../services/openai.service';
import { rabbitMQService } from '../services/rabbitmq.service';

const router = Router();
router.use(authMiddleware);

// Maximum messages to retain per session to prevent unbounded growth
const MAX_SESSION_MESSAGES = 100;

const CATEGORIES: GoalCategory[] = [
  'software_engineering',
  'faang_prep',
  'english_communication',
  'side_income',
  'health',
  'daily_routine',
];

// GET /api/agent/sessions
router.get('/sessions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const sessions = await AgentSession.find({ userId: req.userId })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select('-messages');
  res.json({ success: true, sessions });
});

// POST /api/agent/sessions — create new session
router.post(
  '/sessions',
  [
    body('category').isIn(CATEGORIES).withMessage('Invalid category'),
    body('title').optional().trim().notEmpty(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { category, title } = req.body as { category: GoalCategory; title?: string };
    const session = await AgentSession.create({
      userId: req.userId,
      category,
      title: title ?? `${category.replace(/_/g, ' ')} session`,
    });

    res.status(201).json({ success: true, session });
  },
);

// GET /api/agent/sessions/:id — get session with messages
router.get(
  '/sessions/:id',
  param('id').isMongoId(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const session = await AgentSession.findOne({ _id: req.params['id'], userId: req.userId });
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }
    res.json({ success: true, session });
  },
);

// POST /api/agent/sessions/:id/chat — send a message and get AI reply
router.post(
  '/sessions/:id/chat',
  [
    param('id').isMongoId(),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const session = await AgentSession.findOne({ _id: req.params['id'], userId: req.userId });
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const userMessage = (req.body as { message: string }).message;

    let reply = '';
    let tokensUsed = 0;
    try {
      const result = await openAIService.chat(session.category, session.messages, userMessage);
      reply = result.reply;
      tokensUsed = result.tokensUsed;
    } catch (err) {
      res.status(502).json({ success: false, message: 'AI service unavailable. Please check your API key.' });
      return;
    }

    // Persist messages
    session.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });
    session.messages.push({
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
    });
    session.tokensUsed += tokensUsed;

    // Keep last MAX_SESSION_MESSAGES messages to avoid unbounded growth
    if (session.messages.length > MAX_SESSION_MESSAGES) {
      session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
    }

    await session.save();

    // Publish to analytics queue (non-blocking)
    await rabbitMQService.publish('analytics', {
      userId: req.userId,
      sessionId: session._id.toString(),
      category: session.category,
      tokensUsed,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      reply,
      tokensUsed,
      totalTokensUsed: session.tokensUsed,
    });
  },
);

// POST /api/agent/daily-plan — AI-generated daily plan
router.post('/daily-plan', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const goals = await Goal.find({ userId: req.userId, isActive: true }).select('title category');
  const goalDescriptions = goals.map((g) => `[${g.category}] ${g.title}`);

  const { existingRoutine } = req.body as { existingRoutine?: string };

  let plan = '';
  try {
    plan = await openAIService.generateDailyPlan(goalDescriptions, existingRoutine ?? '');
  } catch {
    res.status(502).json({ success: false, message: 'AI service unavailable' });
    return;
  }

  res.json({ success: true, plan });
});

export default router;
