import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { Goal, GoalCategory } from '../models/Goal';
import { redisService } from '../services/redis.service';
import { openAIService } from '../services/openai.service';

const router = Router();
router.use(authMiddleware);

const GOAL_CATEGORIES: GoalCategory[] = [
  'software_engineering',
  'faang_prep',
  'english_communication',
  'side_income',
  'health',
  'daily_routine',
];

// GET /api/goals
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const cacheKey = `user:${req.userId}:goals`;
  const cached = await redisService.get(cacheKey);
  if (cached) {
    res.json({ success: true, goals: cached, fromCache: true });
    return;
  }

  const goals = await Goal.find({ userId: req.userId, isActive: true }).sort({ updatedAt: -1 });
  await redisService.set(cacheKey, goals, 60);
  res.json({ success: true, goals });
});

// POST /api/goals
router.post(
  '/',
  [
    body('category').isIn(GOAL_CATEGORIES).withMessage('Invalid category'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('targetDate').optional().isISO8601(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { category, title, description, targetDate } = req.body as {
      category: GoalCategory;
      title: string;
      description?: string;
      targetDate?: string;
    };

    // AI-suggested milestones
    let milestones: { title: string; completed: boolean }[] = [];
    try {
      const suggestions = await openAIService.suggestMilestones(
        category,
        title,
        description ?? '',
      );
      milestones = suggestions.map((s) => ({ title: s, completed: false }));
    } catch {
      // milestones remain empty if AI call fails
    }

    const goal = await Goal.create({
      userId: req.userId,
      category,
      title,
      description: description ?? '',
      targetDate: targetDate ? new Date(targetDate) : undefined,
      milestones,
    });

    await redisService.del(`user:${req.userId}:goals`);
    res.status(201).json({ success: true, goal });
  },
);

// GET /api/goals/:id
router.get('/:id', param('id').isMongoId(), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const goal = await Goal.findOne({ _id: req.params['id'], userId: req.userId });
  if (!goal) {
    res.status(404).json({ success: false, message: 'Goal not found' });
    return;
  }
  res.json({ success: true, goal });
});

// PATCH /api/goals/:id
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('progress').optional().isInt({ min: 0, max: 100 }),
    body('title').optional().trim().notEmpty(),
    body('description').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const allowedFields = ['title', 'description', 'progress', 'targetDate', 'milestones', 'isActive'];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params['id'], userId: req.userId },
      updates,
      { new: true },
    );

    if (!goal) {
      res.status(404).json({ success: false, message: 'Goal not found' });
      return;
    }

    await redisService.del(`user:${req.userId}:goals`);
    res.json({ success: true, goal });
  },
);

// DELETE /api/goals/:id
router.delete('/:id', param('id').isMongoId(), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params['id'], userId: req.userId },
    { isActive: false },
    { new: true },
  );

  if (!goal) {
    res.status(404).json({ success: false, message: 'Goal not found' });
    return;
  }

  await redisService.del(`user:${req.userId}:goals`);
  res.json({ success: true, message: 'Goal archived' });
});

export default router;
