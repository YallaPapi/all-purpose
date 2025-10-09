/**
 * Test file with various hardcoded patterns for detection testing
 * This file intentionally contains ALL types of anti-patterns
 */

// ❌ Hardcoded industry limitations (should be detected by HardcodedArrayDetector)
const supportedIndustries = ['automotive', 'dental', 'legal', 'healthcare', 'finance'];
const allowedBusinessTypes = ['b2b', 'b2c', 'saas', 'ecommerce'];

// ❌ Hardcoded geographic limitations (should be detected by HardcodedArrayDetector) 
const availableCountries = ['US', 'UK', 'CA', 'AU', 'DE'];
const supportedRegions = ['north-america', 'europe', 'asia-pacific'];

// ❌ Hardcoded numeric limitations (should be detected by LimitationConstantDetector)
const MAX_USERS = 100;
const userLimit = 50;
const maxItemsPerUser = 10;
const industryCount = 25;

// ❌ Hardcoded conditional logic (should be detected by ConditionalLogicDetector)
function checkIndustryAccess(userIndustry) {
  if (userIndustry === 'automotive') {
    return 'Full access to automotive features';
  } else if (userIndustry === 'dental') {
    return 'Limited dental features';
  }
  return 'Basic features only';
}

// ❌ Hardcoded switch logic (should be detected by ConditionalLogicDetector)
function getUserPlan(planType) {
  switch (planType) {
    case 'premium':
      return { features: ['advanced'], limit: 1000 };
    case 'basic':
      return { features: ['standard'], limit: 100 };
    case 'enterprise':
      return { features: ['all'], limit: 10000 };
    default:
      return { features: ['minimal'], limit: 10 };
  }
}

// ❌ Hardcoded API endpoints (should be detected by HardcodedEndpointDetector)
const API_BASE_URL = 'https://api.stripe.com/v1';
const WEBHOOK_URL = 'https://hooks.slack.com/services/specific-webhook';
const endpoints = {
  payments: 'https://api.paypal.com/v2/payments',
  users: '/api/v1/automotive-users',
  reports: '/api/dental-reports'
};

// ❌ Hardcoded UI text with limitations (should be detected by HardcodedUITextDetector)
const errorMessages = {
  industryNotSupported: 'This feature is only available for automotive industry customers',
  locationRestricted: 'Service not available in your region. US customers only.',
  planLimited: 'Upgrade to premium plan to access this feature. Maximum 5 users allowed.',
  quotaExceeded: 'You have reached the maximum of 10 items for basic plan users'
};

// ❌ More hardcoded limitations in functions
function validateBusinessRequest(business) {
  // Hardcoded business size restrictions
  const allowedSizes = ['small', 'medium', 'large'];
  if (!allowedSizes.includes(business.size)) {
    throw new Error('Only small, medium, and large businesses are supported');
  }

  // Hardcoded location check
  if (business.country !== 'US' && business.country !== 'CA') {
    throw new Error('Currently only available for US and Canadian businesses');
  }

  // Hardcoded industry validation
  const supportedIndustries = ['tech', 'finance', 'healthcare', 'retail'];
  if (!supportedIndustries.includes(business.industry)) {
    return { 
      allowed: false, 
      message: 'Industry not supported. Contact sales for enterprise options.' 
    };
  }

  return { allowed: true };
}

// ❌ Hardcoded configuration object
const appConfig = {
  maxUsers: 500,
  supportedCountries: ['US', 'UK', 'CA', 'AU'],
  allowedIndustries: ['automotive', 'dental', 'legal'],
  apiEndpoints: {
    auth: 'https://auth.company.com/oauth',
    billing: 'https://billing.stripe.com/api'
  },
  planLimits: {
    basic: { users: 10, storage: 100 },
    premium: { users: 100, storage: 1000 },
    enterprise: { users: 1000, storage: 10000 }
  },
  messages: {
    upgradeRequired: 'This feature requires a premium plan',
    regionBlocked: 'Not available in your region',
    industryRestricted: 'Feature limited to healthcare and finance industries'
  }
};

// ❌ Hardcoded React component with limitations
function BusinessDashboard({ user }) {
  const isAutomotiveIndustry = user.industry === 'automotive';
  const isPremiumUser = user.plan === 'premium';
  
  return (
    <div>
      <h1>Welcome {user.name}</h1>
      {isAutomotiveIndustry ? (
        <div>🚗 Automotive Industry Dashboard</div>
      ) : (
        <div>⚠️ Limited features available for non-automotive users</div>
      )}
      
      {!isPremiumUser && (
        <div className="upgrade-banner">
          Upgrade to premium for full access. Currently limited to 50 users.
        </div>
      )}
      
      {user.country !== 'US' && (
        <div className="location-warning">
          Some features may not be available outside the United States
        </div>
      )}
    </div>
  );
}

// ❌ Hardcoded ternary expressions
const getFeatureAccess = (user) => {
  return user.industry === 'healthcare' ? 'full-access' : 'limited-access';
};

const maxAllowedItems = user.plan === 'enterprise' ? 10000 : user.plan === 'premium' ? 1000 : 100;

export { 
  supportedIndustries, 
  MAX_USERS, 
  checkIndustryAccess, 
  API_BASE_URL, 
  errorMessages, 
  appConfig 
};