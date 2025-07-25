/**
 * Account Creation System Types
 * 
 * Use context7: Types for automated account creation and email verification
 * Following All-Purpose Pattern: Configurable for ANY service provider
 */

export interface AccountCreationConfig {
  emailConfig: EmailConfig;
  services: ServiceConfig[];
  securityConfig: SecurityConfig;
  coordinationConfig?: CoordinationConfig;
  storage?: StorageConfig;
}

export interface EmailConfig {
  dedicatedEmail: string;
  imapConfig: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  emailDomains: string[];
  verificationTimeout: number; // minutes
  checkInterval: number; // seconds
}

export interface ServiceConfig {
  id: string;
  name: string;
  type: 'google-cloud' | 'github' | 'anthropic' | 'openai' | 'upstash' | 'vercel' | 'aws' | 'azure' | 'custom';
  enabled: boolean;
  priority: number;
  registrationUrl: string;
  selectors: ServiceSelectors;
  requirements: ServiceRequirements;
  postRegistration?: PostRegistrationSteps;
  apiKeyGeneration?: APIKeyGenerationSteps;
  customSteps?: CustomStep[];
}

export interface ServiceSelectors {
  emailField: string;
  passwordField?: string;
  confirmPasswordField?: string;
  firstNameField?: string;
  lastNameField?: string;
  submitButton: string;
  verificationCodeField?: string;
  continueButton?: string;
  skipButton?: string;
  agreeCheckbox?: string;
  recaptcha?: string;
  errorMessage?: string;
  successMessage?: string;
}

export interface ServiceRequirements {
  requiresPassword: boolean;
  requiresPersonalInfo: boolean;
  requiresPhoneNumber: boolean;
  requiresCompanyInfo: boolean;
  requiresEmailVerification: boolean;
  requiresPhoneVerification: boolean;
  hasRecaptcha: boolean;
  hasCustomFlow: boolean;
  estimatedTime: number; // minutes
}

export interface PostRegistrationSteps {
  profileSetup?: ProfileSetupStep[];
  projectCreation?: ProjectCreationStep[];
  billingSetup?: BillingSetupStep[];
  teamInvitation?: TeamInvitationStep[];
}

export interface APIKeyGenerationSteps {
  navigateToApiKeys: NavigationStep[];
  createApiKey: CreationStep[];
  configurePermissions?: PermissionStep[];
  downloadKey?: DownloadStep[];
}

export interface SecurityConfig {
  encryptionKey: string;
  passwordGeneration: {
    length: number;
    includeSymbols: boolean;
    includeNumbers: boolean;
    includeUppercase: boolean;
    includeLowercase: boolean;
  };
  maxAttempts: number;
  cooldownPeriod: number; // minutes
  userAgents: string[];
  proxyRotation?: ProxyConfig[];
}

export interface CoordinationConfig {
  metaAgentId: string;
  coordinatorEndpoint: string;
  enableKnowledgeSharing: boolean;
  enableTaskCoordination: boolean;
  reportProgress: boolean;
}

export interface StorageConfig {
  type: 'file' | 'database' | 'encrypted-file';
  path?: string;
  connectionString?: string;
  encryptionEnabled: boolean;
  backupEnabled: boolean;
  retentionDays: number;
}

export interface AccountCreationRequest {
  requestId: string;
  services: string[]; // Service IDs to create accounts for
  personalInfo: PersonalInfo;
  companyInfo?: CompanyInfo;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: Date;
  customRequirements?: Record<string, any>;
  skipServices?: string[];
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  country: string;
  region?: string;
  timezone?: string;
}

export interface CompanyInfo {
  companyName: string;
  companySize: string;
  industry: string;
  website?: string;
  address?: string;
  vatNumber?: string;
}

export interface AccountCreationResult {
  requestId: string;
  timestamp: Date;
  duration: number;
  overallStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  serviceResults: ServiceResult[];
  totalServices: number;
  successfulServices: number;
  failedServices: number;
  summary: {
    accountsCreated: number;
    emailsVerified: number;
    apiKeysGenerated: number;
    errors: number;
    warnings: number;
  };
  credentials: AccountCredentials[];
  issues: CreationIssue[];
  nextSteps: NextStep[];
}

export interface ServiceResult {
  serviceId: string;
  serviceName: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PARTIAL';
  duration: number;
  steps: StepResult[];
  accountInfo?: {
    username: string;
    email: string;
    accountId?: string;
    profileUrl?: string;
  };
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  duration: number;
  description: string;
  error?: string;
  screenshot?: string;
  metadata?: Record<string, any>;
}

export interface AccountCredentials {
  serviceId: string;
  serviceName: string;
  username: string;
  email: string;
  password: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  profileUrl?: string;
  additionalInfo?: Record<string, any>;
  expiresAt?: Date;
  lastValidated?: Date;
}

export interface CreationIssue {
  serviceId: string;
  severity: 'error' | 'warning' | 'info';
  category: 'email' | 'password' | 'verification' | 'captcha' | 'network' | 'service' | 'api';
  title: string;
  description: string;
  suggestion?: string;
  retryable: boolean;
  metadata?: Record<string, any>;
}

export interface NextStep {
  serviceId: string;
  category: 'verification' | 'setup' | 'configuration' | 'api-keys' | 'billing';
  title: string;
  description: string;
  instructions: string[];
  estimatedTime: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  url?: string;
  deadline?: Date;
}

export interface EmailVerification {
  id: string;
  serviceId: string;
  email: string;
  status: 'pending' | 'found' | 'verified' | 'failed' | 'expired';
  verificationCode?: string;
  verificationUrl?: string;
  attemptCount: number;
  firstAttempt: Date;
  lastAttempt?: Date;
  verifiedAt?: Date;
  expiresAt: Date;
  emailSubject?: string;
  emailSender?: string;
  metadata?: Record<string, any>;
}

// Step types for service configurations
export interface CustomStep {
  id: string;
  type: 'click' | 'type' | 'wait' | 'navigate' | 'select' | 'upload' | 'download' | 'custom';
  description: string;
  selector?: string;
  value?: string;
  timeout?: number;
  optional?: boolean;
  condition?: string;
  retryCount?: number;
}

export interface ProfileSetupStep {
  field: string;
  value: string | (() => string);
  required: boolean;
  selector: string;
}

export interface ProjectCreationStep {
  name: string;
  description?: string;
  template?: string;
  visibility?: 'public' | 'private';
  selector: string;
}

export interface BillingSetupStep {
  type: 'free' | 'trial' | 'paid';
  plan?: string;
  skipForNow?: boolean;
  selector: string;
}

export interface TeamInvitationStep {
  emails?: string[];
  roles?: string[];
  skipForNow?: boolean;
  selector: string;
}

export interface NavigationStep {
  url?: string;
  selector?: string;
  waitFor?: string;
  description: string;
}

export interface CreationStep {
  name: string;
  description?: string;
  permissions?: string[];
  expiresAt?: Date;
  selector: string;
}

export interface PermissionStep {
  permission: string;
  enable: boolean;
  selector: string;
}

export interface DownloadStep {
  format: 'json' | 'text' | 'file';
  saveLocation: string;
  selector: string;
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  provider: string;
}

export interface BrowserSession {
  id: string;
  serviceId: string;
  browser: any; // Playwright browser instance
  context: any; // Playwright context instance
  page: any; // Playwright page instance
  userAgent: string;
  proxy?: ProxyConfig;
  startTime: Date;
  lastActivity: Date;
  status: 'active' | 'idle' | 'closed' | 'error';
}

export interface AccountCreationSystemConfig {
  agentId: string;
  parallelSessions: number;
  sessionTimeout: number; // minutes
  screenshotOnError: boolean;
  enableHeadless: boolean;
  enableDevtools: boolean;
  browserUserDataDir?: string;
  coordinatorEndpoint?: string;
  enableMetaAgentCoordination: boolean;
  enableRAGIntegration: boolean;
  knowledgeSharing: boolean;
}