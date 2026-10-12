import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';
import { SubmissionController } from '../controllers/submissionController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Public: List live campaigns & get campaign details
router.get('/', CampaignController.listPublic);

// Brand-specific campaign routes
router.post('/', authenticate, requireRole('brand'), CampaignController.create);
router.get('/mine', authenticate, requireRole('brand'), CampaignController.getMine);

// Campaign details
router.get('/:id', CampaignController.getById);

// Brand campaign management
router.patch('/:id/status', authenticate, requireRole('brand'), CampaignController.updateStatus);
router.get('/:id/submissions', authenticate, requireRole('brand'), CampaignController.getSubmissions);
router.get('/:id/budget', authenticate, CampaignController.getBudget);

// Creator post submission to a campaign
router.post('/:id/submissions', authenticate, requireRole('creator'), SubmissionController.create);

export default router;
