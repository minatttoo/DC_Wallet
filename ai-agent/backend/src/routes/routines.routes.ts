import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { DailyRoutine } from '../models/DailyRoutine';

const router = Router();
router.use(authMiddleware);

// GET /api/routines?date=YYYY-MM-DD
router.get(
  '/',
  [query('date').optional().isISO8601()],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { date } = req.query as { date?: string };
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const routine = await DailyRoutine.findOne({
      userId: req.userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (!routine) {
      res.json({ success: true, routine: null });
      return;
    }
    res.json({ success: true, routine });
  },
);

// POST /api/routines — create or replace today's routine
router.post(
  '/',
  [
    body('date').optional().isISO8601(),
    body('entries').isArray().withMessage('Entries must be an array'),
    body('entries.*.time').notEmpty(),
    body('entries.*.activity').notEmpty(),
    body('entries.*.durationMinutes').isInt({ min: 1 }),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { date, entries, notes } = req.body as {
      date?: string;
      entries: { time: string; activity: string; durationMinutes: number; completed?: boolean }[];
      notes?: string;
    };

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const routine = await DailyRoutine.findOneAndUpdate(
      { userId: req.userId, date: targetDate },
      { entries, notes: notes ?? '' },
      { upsert: true, new: true },
    );

    res.status(201).json({ success: true, routine });
  },
);

// PATCH /api/routines/:id/complete — mark an entry as completed
router.patch(
  '/:id/complete',
  [
    body('entryIndex').isInt({ min: 0 }).withMessage('entryIndex must be a non-negative integer'),
    body('completed').isBoolean(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { entryIndex, completed } = req.body as { entryIndex: number; completed: boolean };

    const routine = await DailyRoutine.findOne({ _id: req.params['id'], userId: req.userId });
    if (!routine) {
      res.status(404).json({ success: false, message: 'Routine not found' });
      return;
    }

    if (entryIndex >= routine.entries.length) {
      res.status(400).json({ success: false, message: 'Entry index out of range' });
      return;
    }

    routine.entries[entryIndex].completed = completed;

    // Recalculate overall score
    const completedCount = routine.entries.filter((e) => e.completed).length;
    routine.overallScore = Math.round((completedCount / routine.entries.length) * 10);

    await routine.save();
    res.json({ success: true, routine });
  },
);

export default router;
