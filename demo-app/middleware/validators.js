// Input validation schemas using Joi
const Joi = require('joi');

// Authentication validation schemas
const authSchemas = {
  login: Joi.object({
    email: Joi.string().email({ tlds: false }).required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required'
    })
  }),
  register: Joi.object({
    email: Joi.string().email({ tlds: false }).required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    role: Joi.string().valid('patient').default('patient').messages({
      'any.only': 'Only patient registration is allowed'
    })
  }),
  forgotPassword: Joi.object({
    email: Joi.string().email({ tlds: false }).required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  }),
  resetPassword: Joi.object({
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Passwords must match',
      'any.required': 'Password confirmation is required'
    })
  })
};

// Appointment validation schemas
const appointmentSchemas = {
  create: Joi.object({
    date: Joi.date().iso().min('now').required().messages({
      'date.base': 'Please provide a valid date',
      'date.min': 'Appointment date must be in the future',
      'any.required': 'Date is required'
    }),
    time: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
      'string.pattern.base': 'Time must be in HH:MM format (24-hour)',
      'any.required': 'Time is required'
    }),
    reason: Joi.string().min(3).max(500).required().messages({
      'string.min': 'Reason must be at least 3 characters long',
      'string.max': 'Reason cannot exceed 500 characters',
      'any.required': 'Reason for appointment is required'
    }),
    doctor_id: Joi.number().integer().positive().optional().messages({
      'number.base': 'Doctor ID must be a number',
      'number.positive': 'Doctor ID must be positive'
    })
  }),
  update: Joi.object({
    date: Joi.date().iso().min('now').optional().messages({
      'date.base': 'Please provide a valid date',
      'date.min': 'Appointment date must be in the future'
    }),
    time: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
      'string.pattern.base': 'Time must be in HH:MM format (24-hour)'
    }),
    reason: Joi.string().min(3).max(500).optional().messages({
      'string.min': 'Reason must be at least 3 characters long',
      'string.max': 'Reason cannot exceed 500 characters'
    }),
    status: Joi.string().valid('scheduled', 'confirmed', 'cancelled', 'completed').optional().messages({
      'any.only': 'Invalid appointment status'
    })
  })
};

// Prescription validation schemas
const prescriptionSchemas = {
  create: Joi.object({
    medication: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Medication name must be at least 2 characters',
      'string.max': 'Medication name cannot exceed 200 characters',
      'any.required': 'Medication name is required'
    }),
    dosage: Joi.string().min(2).max(100).optional().allow('').messages({
      'string.min': 'Dosage must be at least 2 characters',
      'string.max': 'Dosage cannot exceed 100 characters'
    }),
    pharmacy: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Pharmacy name must be at least 2 characters',
      'string.max': 'Pharmacy name cannot exceed 200 characters',
      'any.required': 'Pharmacy is required'
    }),
    notes: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    })
  }),
  update: Joi.object({
    medication: Joi.string().min(2).max(200).optional().messages({
      'string.min': 'Medication name must be at least 2 characters',
      'string.max': 'Medication name cannot exceed 200 characters'
    }),
    dosage: Joi.string().min(2).max(100).optional().allow('').messages({
      'string.min': 'Dosage must be at least 2 characters',
      'string.max': 'Dosage cannot exceed 100 characters'
    }),
    frequency: Joi.string().max(100).optional().messages({
      'string.max': 'Frequency cannot exceed 100 characters'
    }),
    pharmacy: Joi.string().min(2).max(200).optional().messages({
      'string.min': 'Pharmacy name must be at least 2 characters',
      'string.max': 'Pharmacy name cannot exceed 200 characters'
    }),
    notes: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    })
  }),
  reject: Joi.object({
    reason: Joi.string().min(5).max(500).required().messages({
      'string.min': 'Rejection reason must be at least 5 characters',
      'string.max': 'Rejection reason cannot exceed 500 characters',
      'any.required': 'Rejection reason is required'
    })
  })
};

// Vital signs validation schemas
const vitalsSchemas = {
  record: Joi.object({
    patient_id: Joi.number().integer().positive().required().messages({
      'number.base': 'Patient ID must be a number',
      'number.positive': 'Patient ID must be positive',
      'any.required': 'Patient ID is required'
    }),
    heart_rate: Joi.number().integer().min(30).max(220).optional().messages({
      'number.base': 'Heart rate must be a number',
      'number.min': 'Heart rate must be at least 30 bpm',
      'number.max': 'Heart rate cannot exceed 220 bpm'
    }),
    blood_pressure_systolic: Joi.number().integer().min(60).max(250).optional().messages({
      'number.base': 'Systolic pressure must be a number',
      'number.min': 'Systolic pressure must be at least 60 mmHg',
      'number.max': 'Systolic pressure cannot exceed 250 mmHg'
    }),
    blood_pressure_diastolic: Joi.number().integer().min(40).max(150).optional().messages({
      'number.base': 'Diastolic pressure must be a number',
      'number.min': 'Diastolic pressure must be at least 40 mmHg',
      'number.max': 'Diastolic pressure cannot exceed 150 mmHg'
    }),
    temperature: Joi.number().min(32).max(43).optional().messages({
      'number.base': 'Temperature must be a number',
      'number.min': 'Temperature must be at least 32°C',
      'number.max': 'Temperature cannot exceed 43°C'
    }),
    oxygen_saturation: Joi.number().min(0).max(100).optional().messages({
      'number.base': 'Oxygen saturation must be a number',
      'number.min': 'Oxygen saturation must be at least 0%',
      'number.max': 'Oxygen saturation cannot exceed 100%'
    }),
    respiratory_rate: Joi.number().integer().min(8).max(40).optional().messages({
      'number.base': 'Respiratory rate must be a number',
      'number.min': 'Respiratory rate must be at least 8 breaths/min',
      'number.max': 'Respiratory rate cannot exceed 40 breaths/min'
    }),
    weight: Joi.number().min(0.5).max(500).optional().messages({
      'number.base': 'Weight must be a number',
      'number.min': 'Weight must be at least 0.5 kg',
      'number.max': 'Weight cannot exceed 500 kg'
    })
  })
};

// Path parameter validation schemas
const paramSchemas = {
  id: Joi.object({
    id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).max(50)
    ).required().messages({
      'alternatives.match': 'ID must be a positive number or valid string identifier',
      'any.required': 'ID is required'
    })
  }),
  patientId: Joi.object({
    patientId: Joi.number().integer().positive().required().messages({
      'number.base': 'Patient ID must be a number',
      'number.positive': 'Patient ID must be positive',
      'any.required': 'Patient ID is required'
    })
  })
};

// Message validation schemas
const messageSchemas = {
  create: Joi.object({
    to_user_id: Joi.number().integer().positive().required().messages({
      'number.base': 'Recipient ID must be a number',
      'number.positive': 'Recipient ID must be positive',
      'any.required': 'Recipient is required'
    }),
    subject: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Subject cannot be empty',
      'string.max': 'Subject cannot exceed 200 characters',
      'any.required': 'Subject is required'
    }),
    content: Joi.string().min(1).max(5000).required().messages({
      'string.min': 'Message content cannot be empty',
      'string.max': 'Message content cannot exceed 5000 characters',
      'any.required': 'Message content is required'
    }),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal').messages({
      'any.only': 'Invalid priority level'
    })
  }),
  reply: Joi.object({
    content: Joi.string().min(1).max(5000).required().messages({
      'string.min': 'Reply content cannot be empty',
      'string.max': 'Reply content cannot exceed 5000 characters',
      'any.required': 'Reply content is required'
    })
  })
};

// AI endpoint validation schemas
const aiSchemas = {
  triage: Joi.object({
    symptoms: Joi.string().min(5).max(2000).required().messages({
      'string.min': 'Symptoms description must be at least 5 characters',
      'string.max': 'Symptoms description cannot exceed 2000 characters',
      'any.required': 'Symptoms are required'
    }),
    duration: Joi.string().max(200).optional(),
    severity: Joi.string().valid('mild', 'moderate', 'severe').optional()
  }),
  transcribe: Joi.object({
    audioData: Joi.string().required().messages({
      'any.required': 'Audio data is required'
    }),
    consultationId: Joi.string().optional()
  }),
  generateNotes: Joi.object({
    transcript: Joi.string().min(10).max(10000).required().messages({
      'string.min': 'Transcript must be at least 10 characters',
      'any.required': 'Transcript is required'
    }),
    patientId: Joi.number().integer().positive().optional()
  })
};

// Insurance validation schemas
const insuranceSchemas = {
  verifyEligibility: Joi.object({
    patientId: Joi.number().integer().positive().required(),
    providerId: Joi.string().required(),
    serviceType: Joi.string().optional()
  }),
  submitClaim: Joi.object({
    patientId: Joi.number().integer().positive().required(),
    appointmentId: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().required(),
    diagnosisCodes: Joi.array().items(Joi.string()).optional()
  })
};

// Pharmacy validation schemas
const pharmacySchemas = {
  sendPrescription: Joi.object({
    prescriptionId: Joi.number().integer().positive().required(),
    pharmacyId: Joi.string().required()
  }),
  checkStock: Joi.object({
    pharmacyId: Joi.string().required(),
    medication: Joi.string().required()
  })
};

// Middleware factory to validate request body
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
}

// Middleware factory to validate route parameters
function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Invalid parameter',
        details: errors
      });
    }

    req.params = value;
    next();
  };
}

// Middleware factory to validate query parameters
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Invalid query parameter',
        details: errors
      });
    }

    req.query = value;
    next();
  };
}

module.exports = {
  validate,
  validateParams,
  validateQuery,
  authSchemas,
  appointmentSchemas,
  prescriptionSchemas,
  vitalsSchemas,
  paramSchemas,
  messageSchemas,
  aiSchemas,
  insuranceSchemas,
  pharmacySchemas
};
