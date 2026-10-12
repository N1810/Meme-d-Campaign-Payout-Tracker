import { Router } from 'express';
import { SubmissionController } from '../controllers/submissionController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Creator view their submissions
router.get('/mine', authenticate, requireRole('creator'), SubmissionController.getMine);

// Authorized view single submission
router.get('/:id', authenticate, SubmissionController.getById);

// Simulate platform view updates - Preserving assignment exception: NO role check required
router.patch('/:id/views', SubmissionController.updateViews);

export default router;
