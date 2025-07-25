/**
 * Service Configurations for Account Creation
 * 
 * Use context7: Pre-configured service definitions for major platforms
 * Following All-Purpose Pattern: Extensible for ANY service provider
 */

import { ServiceConfig } from '../types/index.js';

/**
 * YouTube API (Google Cloud Platform) Configuration
 */
export const youtubeApiConfig: ServiceConfig = {
  id: 'youtube-api',
  name: 'YouTube API (Google Cloud)',
  type: 'google-cloud',
  enabled: true,
  priority: 1,
  registrationUrl: 'https://console.cloud.google.com/',
  selectors: {
    emailField: 'input[type="email"]',
    submitButton: '#identifierNext',
    continueButton: 'button[data-continue-function]',
    agreeCheckbox: 'input[type="checkbox"]',
    errorMessage: '.o6cuMc',
    successMessage: '.dGcgBb'
  },
  requirements: {
    requiresPassword: true,
    requiresPersonalInfo: true,
    requiresPhoneNumber: false,
    requiresCompanyInfo: false,
    requiresEmailVerification: true,
    requiresPhoneVerification: false,
    hasRecaptcha: false, // Google uses advanced bot detection instead
    hasCustomFlow: true,
    estimatedTime: 10
  },
  postRegistration: {
    projectCreation: [
      {
        name: 'Create New Project',
        description: 'Create a new GCP project for YouTube API',
        selector: '[data-value="create-project"]'
      }
    ]
  },
  apiKeyGeneration: {
    navigateToApiKeys: [
      {
        url: 'https://console.cloud.google.com/apis/credentials',
        description: 'Navigate to API credentials page'
      }
    ],
    createApiKey: [
      {
        name: 'YouTube Data API v3 Key',
        description: 'API key for YouTube Data API access',
        selector: '[data-track-metadata*="create_api_key"]'
      }
    ]
  }
};

/**
 * GitHub Configuration
 */
export const githubConfig: ServiceConfig = {
  id: 'github',
  name: 'GitHub',
  type: 'github',
  enabled: true,
  priority: 2,
  registrationUrl: 'https://github.com/signup',
  selectors: {
    emailField: '#email',
    passwordField: '#password',
    submitButton: '[data-continue-to="password-container"]',
    agreeCheckbox: '#opt_in',
    errorMessage: '.flash-error',
    successMessage: '.flash-success'
  },
  requirements: {
    requiresPassword: true,
    requiresPersonalInfo: false,
    requiresPhoneNumber: false,
    requiresCompanyInfo: false,
    requiresEmailVerification: true,
    requiresPhoneVerification: false,
    hasRecaptcha: true,
    hasCustomFlow: false,
    estimatedTime: 5
  }
};

/**
 * Anthropic Configuration
 */
export const anthropicConfig: ServiceConfig = {
  id: 'anthropic',
  name: 'Anthropic (Claude API)',
  type: 'anthropic',
  enabled: true,
  priority: 3,
  registrationUrl: 'https://console.anthropic.com/signup',
  selectors: {
    emailField: 'input[name="email"]',
    passwordField: 'input[name="password"]',
    firstNameField: 'input[name="firstName"]',
    lastNameField: 'input[name="lastName"]',
    submitButton: 'button[type="submit"]',
    agreeCheckbox: 'input[name="termsAccepted"]',
    errorMessage: '.error-message',
    successMessage: '.success-message'
  },
  requirements: {
    requiresPassword: true,
    requiresPersonalInfo: true,
    requiresPhoneNumber: false,
    requiresCompanyInfo: false,
    requiresEmailVerification: true,
    requiresPhoneVerification: false,
    hasRecaptcha: false,
    hasCustomFlow: false,
    estimatedTime: 7
  },
  apiKeyGeneration: {
    navigateToApiKeys: [
      {
        url: 'https://console.anthropic.com/settings/keys',
        description: 'Navigate to API keys settings'
      }
    ],
    createApiKey: [
      {
        name: 'Meta-Agent API Key',
        description: 'API key for meta-agent system access',
        selector: '[data-testid="create-key-button"]'
      }
    ]
  }
};

/**
 * OpenAI Configuration
 */
export const openaiConfig: ServiceConfig = {
  id: 'openai',
  name: 'OpenAI',
  type: 'openai',
  enabled: true,
  priority: 4,
  registrationUrl: 'https://platform.openai.com/signup',
  selectors: {
    emailField: 'input[name="email"]',
    passwordField: 'input[name="password"]',
    firstNameField: 'input[name="firstName"]',
    lastNameField: 'input[name="lastName"]',
    submitButton: 'button[type="submit"]',
    continueButton: 'button[data-action="continue"]',
    errorMessage: '.error',
    successMessage: '.success'
  },
  requirements: {
    requiresPassword: true,
    requiresPersonalInfo: true,
    requiresPhoneNumber: true,
    requiresCompanyInfo: false,
    requiresEmailVerification: true,
    requiresPhoneVerification: true,
    hasRecaptcha: true,
    hasCustomFlow: true,
    estimatedTime: 15
  },
  apiKeyGeneration: {
    navigateToApiKeys: [
      {
        url: 'https://platform.openai.com/api-keys',
        description: 'Navigate to API keys page'
      }
    ],
    createApiKey: [
      {
        name: 'Meta-Agent System Key',
        description: 'API key for automated systems',
        selector: '[data-testid="create-api-key"]'
      }
    ]
  }
};

/**
 * Upstash Configuration
 */
export const upstashConfig: ServiceConfig = {
  id: 'upstash',
  name: 'Upstash',
  type: 'upstash',
  enabled: true,
  priority: 5,
  registrationUrl: 'https://console.upstash.com/login',
  selectors: {
    emailField: 'input[name="email"]',
    passwordField: 'input[name="password"]',
    submitButton: 'button[type="submit"]',
    continueButton: '.auth0-lock-submit',
    errorMessage: '.auth0-global-message-error',
    successMessage: '.auth0-global-message-success'
  },
  requirements: {
    requiresPassword: true,
    requiresPersonalInfo: false,
    requiresPhoneNumber: false,
    requiresCompanyInfo: false,
    requiresEmailVerification: true,
    requiresPhoneVerification: false,
    hasRecaptcha: false,
    hasCustomFlow: false,
    estimatedTime: 5
  },
  postRegistration: {
    projectCreation: [
      {
        name: 'Create Redis Database',
        description: 'Set up Redis database for caching',
        selector: '[data-testid="create-database"]'
      }
    ]
  }
};

/**
 * Vercel Configuration  
 */
export const vercelConfig: ServiceConfig = {
  id: 'vercel',
  name: 'Vercel',
  type: 'vercel',
  enabled: true,
  priority: 6,
  registrationUrl: 'https://vercel.com/signup',
  selectors: {
    emailField: 'input[name="email"]',
    submitButton: 'button[type="submit"]',
    continueButton: '[data-testid="continue-with-email"]',
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]'
  },
  requirements: {
    requiresPassword: false, // Vercel uses magic links
    requiresPersonalInfo: false,
    requiresPhoneNumber: false,
    requiresCompanyInfo: false,
    requiresEmailVerification: true,
    requiresPhoneVerification: false,
    hasRecaptcha: false,
    hasCustomFlow: true, // Magic link flow
    estimatedTime: 3
  }
};

/**
 * Default Service Configurations Array
 */
export const defaultServiceConfigs: ServiceConfig[] = [
  youtubeApiConfig,
  githubConfig,
  anthropicConfig,
  openaiConfig,
  upstashConfig,
  vercelConfig
];

/**
 * Create custom service configuration
 */
export function createCustomServiceConfig(
  id: string,
  name: string,
  registrationUrl: string,
  selectors: Partial<ServiceConfig['selectors']>,
  requirements: Partial<ServiceConfig['requirements']>
): ServiceConfig {
  return {
    id,
    name,
    type: 'custom',
    enabled: true,
    priority: 999,
    registrationUrl,
    selectors: {
      emailField: 'input[type="email"]',
      submitButton: 'button[type="submit"]',
      errorMessage: '.error',
      successMessage: '.success',
      ...selectors
    },
    requirements: {
      requiresPassword: true,
      requiresPersonalInfo: false,
      requiresPhoneNumber: false,
      requiresCompanyInfo: false,
      requiresEmailVerification: true,
      requiresPhoneVerification: false,
      hasRecaptcha: false,
      hasCustomFlow: false,
      estimatedTime: 10,
      ...requirements
    }
  };
}

/**
 * Get service configuration by ID
 */
export function getServiceConfig(serviceId: string): ServiceConfig | undefined {
  return defaultServiceConfigs.find(config => config.id === serviceId);
}

/**
 * Get all enabled service configurations
 */
export function getEnabledServices(): ServiceConfig[] {
  return defaultServiceConfigs.filter(config => config.enabled);
}

/**
 * Service configuration with YouTube API key
 * Note: The provided API key will be used for testing/validation
 */
export const YOUTUBE_API_KEY = 'AIzaSyCCegzzkSCWtkVu4nj7PPlYyQ-esrw-j9c';

/**
 * Validate YouTube API key configuration
 */
export async function validateYouTubeApiKey(apiKey: string = YOUTUBE_API_KEY): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${apiKey}`);
    return response.ok;
  } catch (error) {
    return false;
  }
}