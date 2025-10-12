// User types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'doctor' | 'nurse' | 'patient' | 'staff'
  status: 'active' | 'inactive' | 'pending'
  avatar?: string
  phone?: string
  specialization?: string
  licenseNumber?: string
}

// Patient types
export interface Patient {
  id: string
  userId: string
  medicalRecordNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  bloodType?: string
  allergies: Allergy[]
  chronicConditions: string[]
  emergencyContact?: EmergencyContact
  insurance?: Insurance
}

export interface Allergy {
  id: string
  name: string
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening'
  reaction?: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

export interface Insurance {
  provider: string
  policyNumber: string
  groupNumber?: string
  expiryDate?: string
}

// Vital signs types
export interface VitalSign {
  id: string
  patientId: string
  type: VitalSignType
  value: number | BloodPressureValue
  unit: string
  status: 'normal' | 'warning' | 'critical'
  timestamp: string
  deviceId?: string
}

export type VitalSignType =
  | 'heartRate'
  | 'bloodPressure'
  | 'oxygenSaturation'
  | 'temperature'
  | 'respiratoryRate'
  | 'bloodGlucose'
  | 'weight'

export interface BloodPressureValue {
  systolic: number
  diastolic: number
  unit: string
}

// Consultation types
export interface Consultation {
  id: string
  consultationNumber: string
  patientId: string
  doctorId: string
  type: 'video' | 'audio' | 'chat'
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled'
  scheduledStartTime: string
  actualStartTime?: string
  actualEndTime?: string
  roomId?: string
  reasonForVisit?: string
  diagnosis?: string
  prescriptions?: Prescription[]
}

export interface Prescription {
  id: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

// ML Prediction types
export interface RiskPrediction {
  id: string
  patientId: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  confidence: number
  riskFactors: RiskFactor[]
  primaryConcerns: string[]
  recommendations?: Recommendation[]
  timestamp: string
}

export interface RiskFactor {
  factor: string
  impact: number
  description: string
}

export interface Recommendation {
  category: string
  priority: string
  description: string
  actionItems: string[]
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
