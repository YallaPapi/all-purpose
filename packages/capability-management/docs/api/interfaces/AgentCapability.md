[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / AgentCapability

# Interface: AgentCapability

Defined in: [src/types/CapabilitySchema.ts:119](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L119)

Core capability definition with comprehensive metadata

## Extended by

- [`DiscoveredCapability`](DiscoveredCapability.md)

## Properties

### category?

> `optional` **category**: `string`

Defined in: [src/types/CapabilitySchema.ts:125](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L125)

***

### compliance?

> `optional` **compliance**: `object`

Defined in: [src/types/CapabilitySchema.ts:167](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L167)

#### auditTrail?

> `optional` **auditTrail**: `boolean`

#### certifications?

> `optional` **certifications**: `string`[]

#### dataClassification?

> `optional` **dataClassification**: `string`

#### standards?

> `optional` **standards**: `string`[]

***

### constraints?

> `optional` **constraints**: [`CapabilityConstraints`](CapabilityConstraints.md)

Defined in: [src/types/CapabilitySchema.ts:139](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L139)

***

### deprecated?

> `optional` **deprecated**: `boolean`

Defined in: [src/types/CapabilitySchema.ts:133](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L133)

***

### deprecationNotice?

> `optional` **deprecationNotice**: `string`

Defined in: [src/types/CapabilitySchema.ts:134](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L134)

***

### description

> **description**: `string`

Defined in: [src/types/CapabilitySchema.ts:124](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L124)

***

### documentation?

> `optional` **documentation**: `object`

Defined in: [src/types/CapabilitySchema.ts:154](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L154)

#### changelog?

> `optional` **changelog**: [`ChangelogEntry`](ChangelogEntry.md)[]

#### detailedDescription?

> `optional` **detailedDescription**: `string`

#### limitations?

> `optional` **limitations**: `string`[]

#### troubleshooting?

> `optional` **troubleshooting**: `Record`\<`string`, `string`\>

#### useCases?

> `optional` **useCases**: `string`[]

***

### examples?

> `optional` **examples**: [`CapabilityExample`](CapabilityExample.md)[]

Defined in: [src/types/CapabilitySchema.ts:130](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L130)

***

### id

> **id**: `string`

Defined in: [src/types/CapabilitySchema.ts:121](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L121)

***

### introducedIn?

> `optional` **introducedIn**: [`SemVer`](SemVer.md)

Defined in: [src/types/CapabilitySchema.ts:136](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L136)

***

### lastUpdated?

> `optional` **lastUpdated**: `Date`

Defined in: [src/types/CapabilitySchema.ts:177](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L177)

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [src/types/CapabilitySchema.ts:163](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L163)

***

### name

> **name**: `string`

Defined in: [src/types/CapabilitySchema.ts:122](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L122)

***

### parameters?

> `optional` **parameters**: [`ParameterDefinition`](ParameterDefinition.md)[]

Defined in: [src/types/CapabilitySchema.ts:128](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L128)

***

### performance?

> `optional` **performance**: [`PerformanceMetrics`](PerformanceMetrics.md)

Defined in: [src/types/CapabilitySchema.ts:142](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L142)

***

### registeredAt?

> `optional` **registeredAt**: `Date`

Defined in: [src/types/CapabilitySchema.ts:175](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L175)

***

### registeredBy?

> `optional` **registeredBy**: `string`

Defined in: [src/types/CapabilitySchema.ts:176](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L176)

***

### reliability?

> `optional` **reliability**: `object`

Defined in: [src/types/CapabilitySchema.ts:143](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L143)

#### errorHandling?

> `optional` **errorHandling**: `string`[]

#### retryPolicy?

> `optional` **retryPolicy**: `object`

##### retryPolicy.backoffStrategy?

> `optional` **backoffStrategy**: `"linear"` \| `"exponential"` \| `"fixed"`

##### retryPolicy.baseDelay?

> `optional` **baseDelay**: `number`

##### retryPolicy.maxRetries?

> `optional` **maxRetries**: `number`

#### successRate?

> `optional` **successRate**: `number`

***

### replacedBy?

> `optional` **replacedBy**: `string`

Defined in: [src/types/CapabilitySchema.ts:135](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L135)

***

### returns?

> `optional` **returns**: [`ReturnTypeDefinition`](ReturnTypeDefinition.md)

Defined in: [src/types/CapabilitySchema.ts:129](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L129)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/CapabilitySchema.ts:164](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L164)

***

### version

> **version**: [`SemVer`](SemVer.md)

Defined in: [src/types/CapabilitySchema.ts:123](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L123)
