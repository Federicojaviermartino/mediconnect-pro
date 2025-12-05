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

module.exports = {
  validate,
  authSchemas,
  appointmentSchemas,
  prescriptionSchemas,
  vitalsSchemas
};
