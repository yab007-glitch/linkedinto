import Joi from 'joi';
import { ValidationError } from './errorHandler.js';

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new ValidationError('Validation failed', details));
    }

    req.body = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // Feed management
  addFeed: Joi.object({
    name: Joi.string().required().min(3).max(100),
    url: Joi.string().uri().required(),
    category: Joi.string().required().min(3).max(50),
    enabled: Joi.boolean().default(true),
  }),

  // Post generation
  generatePost: Joi.object({
    articleId: Joi.string().optional(),
    templateId: Joi.string().optional(),
    variables: Joi.object().optional(),
  }),

  // Schedule configuration
  scheduleConfig: Joi.object({
    scheduleType: Joi.string().valid('interval', 'custom').optional(),
    postingInterval: Joi.number().integer().min(1).max(24).optional(),
    customSchedule: Joi.object({
      monday: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).optional(),
      tuesday: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).optional(),
      wednesday: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).optional(),
      thursday: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).optional(),
      friday: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).optional(),
      saturday: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).optional(),
      sunday: Joi.array().items(Joi.string().pattern(/^\d{2}:\d{2}$/)).optional(),
    }).optional(),
    timezone: Joi.string().optional(),
    pauseOnWeekends: Joi.boolean().optional(),
  }),

  // Custom template
  customTemplate: Joi.object({
    name: Joi.string().required().min(3).max(100),
    category: Joi.string().required().min(3).max(50),
    description: Joi.string().optional().max(500),
    template: Joi.string().required().min(10),
    variables: Joi.array().items(Joi.string()).required(),
  }),

  // A/B test creation
  createABTest: Joi.object({
    name: Joi.string().required().min(3).max(100),
    description: Joi.string().optional().max(500),
    variants: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        templateId: Joi.string().required(),
      })
    ).min(2).max(5).required(),
    targetSampleSize: Joi.number().integer().min(10).max(100).default(20),
    confidenceLevel: Joi.number().min(0.8).max(0.99).default(0.95),
  }),

  // Automation toggle
  automationToggle: Joi.object({
    enabled: Joi.boolean().required(),
  }),

  // Template fill
  fillTemplate: Joi.object({
    variables: Joi.object().required(),
  }),
};

// Query parameter validation
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new ValidationError('Query validation failed', details));
    }

    req.query = value;
    next();
  };
};

// Common query schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  }),

  analytics: Joi.object({
    days: Joi.number().integer().min(1).max(365).default(30),
    metric: Joi.string().valid('engagementRate', 'impressions', 'likes', 'comments', 'shares').default('engagementRate'),
  }),
};

// Sanitize input
export const sanitize = (req, res, next) => {
  // Remove any potential XSS from request body only
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const sanitized = {};
      Object.keys(value).forEach(key => {
        sanitized[key] = sanitizeValue(value[key]);
      });
      return sanitized;
    }
    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item));
    }
    return value;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  
  next();
};
