/**
 * User Types for MediConnect Pro
 * Defines all user-related types including Patient, Doctor, Nurse, and Admin
 */

/**
 * User Roles in the system
 */
export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PATIENT = 'patient',
  STAFF = 'staff',
}

/**
 * User Status
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

/**
 * Gender options
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

/**
 * Blood Type
 */
export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
  UNKNOWN = 'unknown',
}

/**
 * Base User Interface
 * Common properties for all user types
 */
export interface IUser {
  id: string;
  email: string;
  password?: string; // Hashed password, optional for responses
  role: UserRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: Gender;
  phoneNumber?: string;
  address?: IAddress;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
}

/**
 * Address Interface
 */
export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Patient-specific interface
 */
export interface IPatient extends IUser {
  role: UserRole.PATIENT;
  medicalRecordNumber: string;
  bloodType?: BloodType;
  height?: number; // in cm
  weight?: number; // in kg
  allergies: IAllergy[];
  chronicConditions: IChronicCondition[];
  emergencyContacts: IEmergencyContact[];
  assignedDoctorId?: string;
  assignedDoctor?: IDoctor;
  insuranceInfo?: IInsuranceInfo;
  deviceIds: string[]; // IoT devices registered
}

/**
 * Allergy Interface
 */
export interface IAllergy {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  reaction?: string;
  diagnosedDate?: Date;
  notes?: string;
}

/**
 * Chronic Condition Interface
 */
export interface IChronicCondition {
  id: string;
  name: string;
  diagnosedDate: Date;
  status: 'active' | 'controlled' | 'in_remission' | 'resolved';
  medications: string[];
  notes?: string;
}

/**
 * Emergency Contact Interface
 */
export interface IEmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  isPrimary: boolean;
}

/**
 * Insurance Information Interface
 */
export interface IInsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  validFrom: Date;
  validUntil: Date;
  coverageType: string;
}

/**
 * Doctor-specific interface
 */
export interface IDoctor extends IUser {
  role: UserRole.DOCTOR;
  licenseNumber: string;
  specialization: string[];
  yearsOfExperience: number;
  education: IEducation[];
  certifications: ICertification[];
  languages: string[];
  consultationFee: number;
  availableForConsultation: boolean;
  rating?: number;
  totalConsultations?: number;
  bio?: string;
  patients?: IPatient[];
}

/**
 * Education Interface
 */
export interface IEducation {
  degree: string;
  institution: string;
  fieldOfStudy: string;
  yearOfGraduation: number;
  country: string;
}

/**
 * Certification Interface
 */
export interface ICertification {
  name: string;
  issuingOrganization: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
}

/**
 * Nurse-specific interface
 */
export interface INurse extends IUser {
  role: UserRole.NURSE;
  licenseNumber: string;
  specialization?: string;
  yearsOfExperience: number;
  shift: 'morning' | 'afternoon' | 'night' | 'rotating';
  department?: string;
}

/**
 * Admin-specific interface
 */
export interface IAdmin extends IUser {
  role: UserRole.ADMIN;
  permissions: string[];
  department: string;
  accessLevel: 'super_admin' | 'admin' | 'moderator';
}

/**
 * User Registration DTO
 */
export interface IUserRegistration {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  acceptedTerms: boolean;
}

/**
 * User Login DTO
 */
export interface IUserLogin {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Password Reset Request DTO
 */
export interface IPasswordResetRequest {
  email: string;
}

/**
 * Password Reset DTO
 */
export interface IPasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * User Update DTO
 */
export interface IUserUpdate {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: IAddress;
  profilePicture?: string;
  dateOfBirth?: Date;
  gender?: Gender;
}

/**
 * User Response (without sensitive data)
 */
export type IUserResponse = Omit<IUser, 'password'>;

/**
 * Type guard to check if user is a patient
 */
export function isPatient(user: IUser): user is IPatient {
  return user.role === UserRole.PATIENT;
}

/**
 * Type guard to check if user is a doctor
 */
export function isDoctor(user: IUser): user is IDoctor {
  return user.role === UserRole.DOCTOR;
}

/**
 * Type guard to check if user is a nurse
 */
export function isNurse(user: IUser): user is INurse {
  return user.role === UserRole.NURSE;
}

/**
 * Type guard to check if user is an admin
 */
export function isAdmin(user: IUser): user is IAdmin {
  return user.role === UserRole.ADMIN;
}
