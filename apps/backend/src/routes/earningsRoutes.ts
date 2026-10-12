import { Router } from 'express';
import { SubmissionController } from '../controllers/submissionController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, requireRole('creator'), SubmissionController.getEarnings);

export default router;
