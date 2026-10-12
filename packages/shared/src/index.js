"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateViewsSchema = exports.CreateSubmissionSchema = exports.UpdateCampaignStatusSchema = exports.CreateCampaignSchema = exports.MilestoneSchema = exports.LoginSchema = exports.SignupSchema = exports.RUPEES_TO_PAISE = void 0;
exports.rupeesToPaise = rupeesToPaise;
exports.paiseToRupees = paiseToRupees;
exports.formatINR = formatINR;
exports.isValidPostUrl = isValidPostUrl;
const zod_1 = require("zod");
// Currency Conversion Helpers
exports.RUPEES_TO_PAISE = 100;
function rupeesToPaise(rupees) {
    if (typeof rupees !== 'number' || isNaN(rupees)) {
        throw new Error('Invalid rupee value');
    }
    return Math.round(rupees * exports.RUPEES_TO_PAISE);
}
function paiseToRupees(paise) {
    if (typeof paise !== 'number' || isNaN(paise)) {
        return 0;
    }
    return paise / exports.RUPEES_TO_PAISE;
}
function formatINR(paise) {
    const rupees = paiseToRupees(paise);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
        minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    }).format(rupees);
}
// Validation Schemas
exports.SignupSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: zod_1.z.string().trim().email('Invalid email address').toLowerCase(),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters').max(100),
    role: zod_1.z.enum(['brand', 'creator'], {
        errorMap: () => ({ message: 'Role must be either brand or creator' }),
    }),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Invalid email address').toLowerCase(),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.MilestoneSchema = zod_1.z.object({
    views: zod_1.z.number().int('Views must be an integer').positive('Milestone views must be greater than 0'),
    payoutPaise: zod_1.z.number().int('Payout must be in integer paise').nonnegative('Payout must be non-negative'),
});
exports.CreateCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3, 'Campaign name must be at least 3 characters').max(120),
    description: zod_1.z.string().trim().max(1000).optional(),
    platform: zod_1.z.enum(['instagram', 'youtube']),
    totalBudgetPaise: zod_1.z
        .number()
        .int('Total budget must be in integer paise')
        .positive('Total budget must be greater than zero'),
    milestones: zod_1.z
        .array(exports.MilestoneSchema)
        .min(1, 'At least one milestone is required')
        .refine((milestones) => {
        const viewsList = milestones.map((m) => m.views);
        return new Set(viewsList).size === viewsList.length;
    }, 'Milestone view thresholds must be unique'),
});
exports.UpdateCampaignStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['live', 'paused', 'completed']),
});
// URL verification for Instagram and YouTube
const INSTAGRAM_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+\/?(\?.*)?$/i;
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{6,}\/?(\?.*)?$/i;
function isValidPostUrl(platform, url) {
    if (!url || typeof url !== 'string')
        return false;
    const trimmed = url.trim();
    if (platform === 'instagram') {
        return INSTAGRAM_REGEX.test(trimmed);
    }
    if (platform === 'youtube') {
        return YOUTUBE_REGEX.test(trimmed);
    }
    return false;
}
exports.CreateSubmissionSchema = zod_1.z.object({
    postUrl: zod_1.z.string().trim().url('Must be a valid URL'),
});
exports.UpdateViewsSchema = zod_1.z.object({
    views: zod_1.z.number().int('Views must be an integer').min(0, 'Views must be non-negative'),
});
