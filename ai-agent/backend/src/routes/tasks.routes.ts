import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { Task, TaskStatus } from '../models/Task';
import { GoalCategory } from '../models/Goal';
import { redisService } from '../services/redis.service';

const router = Router();
router.use(authMiddleware);

// GET /api/tasks?status=pending&category=...&date=YYYY-MM-DD
router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'in_progress', 'done', 'skipped']),
    query('category').optional().isString(),
    query('date').optional().isISO8601(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { status, category, date } = req.query as {
      status?: TaskStatus;
      category?: GoalCategory;
      date?: string;
    };

    const filter: Record<string, unknown> = { userId: req.userId };
    if (status) filter['status'] = status;
    if (category) filter['category'] = category;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter['dueDate'] = { $gte: start, $lt: end };
    }

    const tasks = await Task.find(filter).sort({ priority: -1, dueDate: 1 });
    res.json({ success: true, tasks });
  },
);

// POST /api/tasks
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('category').isIn([
      'software_engineering', 'faang_prep', 'english_communication',
      'side_income', 'health', 'daily_routine',
    ]),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('dueDate').optional().isISO8601(),
    body('estimatedMinutes').optional().isInt({ min: 1 }),
    body('goalId').optional().isMongoId(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const task = await Task.create({ ...req.body as object, userId: req.userId });
    await redisService.del(`user:${req.userId}:tasks:today`);
    res.status(201).json({ success: true, task });
  },
);

// PATCH /api/tasks/:id
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('status').optional().isIn(['pending', 'in_progress', 'done', 'skipped']),
    body('actualMinutes').optional().isInt({ min: 0 }),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const updates: Record<string, unknown> = { ...(req.body as object) };
    if (updates['status'] === 'done') updates['completedAt'] = new Date();

    const task = await Task.findOneAndUpdate(
      { _id: req.params['id'], userId: req.userId },
      updates,
      { new: true },
    );

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    await redisService.del(`user:${req.userId}:tasks:today`);
    res.json({ success: true, task });
  },
);

// DELETE /api/tasks/:id
router.delete('/:id', param('id').isMongoId(), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const task = await Task.findOneAndDelete({ _id: req.params['id'], userId: req.userId });
  if (!task) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }
  res.json({ success: true, message: 'Task deleted' });
});

export default router;
