export interface UEPConfig {
  port: number;
  nats: {
    url: string;
  };
  uep: {
    mode: 'strict' | 'warn' | 'monitor';
    validationEnabled: boolean;
    enforcementEnabled: boolean;
  };
  registry: {
    url: string;
  };
  factory: {
    url: string;
  };
  domainAgents: {
    url: string;
  };
}

export const config: UEPConfig = {
  port: parseInt(process.env.PORT || '3003', 10),
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222'
  },
  uep: {
    mode: (process.env.UEP_MODE as 'strict' | 'warn' | 'monitor') || 'strict',
    validationEnabled: process.env.UEP_VALIDATION_ENABLED === 'true',
    enforcementEnabled: process.env.UEP_ENFORCEMENT_ENABLED === 'true'
  },
  registry: {
    url: process.env.UEP_REGISTRY_URL || 'http://localhost:3001'
  },
  factory: {
    url: process.env.FACTORY_CORE_URL || 'http://localhost:3000'
  },
  domainAgents: {
    url: process.env.DOMAIN_AGENTS_URL || 'http://localhost:3001'
  }
};