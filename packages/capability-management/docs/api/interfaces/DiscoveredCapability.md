[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / DiscoveredCapability

# Interface: DiscoveredCapability

Defined in: [src/client/AgentRegistrationClient.ts:86](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L86)

Capability discovery result

## Extends

- [`AgentCapability`](AgentCapability.md)

## Properties

### category?

> `optional` **category**: `string`

Defined in: [src/types/CapabilitySchema.ts:125](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L125)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`category`](AgentCapability.md#category)

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

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`compliance`](AgentCapability.md#compliance)

***

### constraints?

> `optional` **constraints**: [`CapabilityConstraints`](CapabilityConstraints.md)

Defined in: [src/types/CapabilitySchema.ts:139](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L139)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`constraints`](AgentCapability.md#constraints)

***

### deprecated?

> `optional` **deprecated**: `boolean`

Defined in: [src/types/CapabilitySchema.ts:133](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L133)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`deprecated`](AgentCapability.md#deprecated)

***

### deprecationNotice?

> `optional` **deprecationNotice**: `string`

Defined in: [src/types/CapabilitySchema.ts:134](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L134)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`deprecationNotice`](AgentCapability.md#deprecationnotice)

***

### description

> **description**: `string`

Defined in: [src/types/CapabilitySchema.ts:124](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L124)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`description`](AgentCapability.md#description)

***

### discoveryMetadata?

> `optional` **discoveryMetadata**: `Record`\<`string`, `any`\>

Defined in: [src/client/AgentRegistrationClient.ts:88](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L88)

***

### discoveryMethod

> **discoveryMethod**: `"reflection"` \| `"plugin-scan"` \| `"config-parse"` \| `"manual"`

Defined in: [src/client/AgentRegistrationClient.ts:87](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/client/AgentRegistrationClient.ts#L87)

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

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`documentation`](AgentCapability.md#documentation)

***

### examples?

> `optional` **examples**: [`CapabilityExample`](CapabilityExample.md)[]

Defined in: [src/types/CapabilitySchema.ts:130](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L130)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`examples`](AgentCapability.md#examples)

***

### id

> **id**: `string`

Defined in: [src/types/CapabilitySchema.ts:121](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L121)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`id`](AgentCapability.md#id)

***

### introducedIn?

> `optional` **introducedIn**: [`SemVer`](SemVer.md)

Defined in: [src/types/CapabilitySchema.ts:136](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L136)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`introducedIn`](AgentCapability.md#introducedin)

***

### lastUpdated?

> `optional` **lastUpdated**: `Date`

Defined in: [src/types/CapabilitySchema.ts:177](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L177)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`lastUpdated`](AgentCapability.md#lastupdated)

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [src/types/CapabilitySchema.ts:163](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L163)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`metadata`](AgentCapability.md#metadata)

***

### name

> **name**: `string`

Defined in: [src/types/CapabilitySchema.ts:122](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L122)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`name`](AgentCapability.md#name)

***

### parameters?

> `optional` **parameters**: [`ParameterDefinition`](ParameterDefinition.md)[]

Defined in: [src/types/CapabilitySchema.ts:128](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L128)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`parameters`](AgentCapability.md#parameters)

***

### performance?

> `optional` **performance**: [`PerformanceMetrics`](PerformanceMetrics.md)

Defined in: [src/types/CapabilitySchema.ts:142](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L142)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`performance`](AgentCapability.md#performance)

***

### registeredAt?

> `optional` **registeredAt**: `Date`

Defined in: [src/types/CapabilitySchema.ts:175](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L175)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`registeredAt`](AgentCapability.md#registeredat)

***

### registeredBy?

> `optional` **registeredBy**: `string`

Defined in: [src/types/CapabilitySchema.ts:176](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L176)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`registeredBy`](AgentCapability.md#registeredby)

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

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`reliability`](AgentCapability.md#reliability)

***

### replacedBy?

> `optional` **replacedBy**: `string`

Defined in: [src/types/CapabilitySchema.ts:135](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L135)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`replacedBy`](AgentCapability.md#replacedby)

***

### returns?

> `optional` **returns**: [`ReturnTypeDefinition`](ReturnTypeDefinition.md)

Defined in: [src/types/CapabilitySchema.ts:129](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L129)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`returns`](AgentCapability.md#returns)

***

### tags?

> `optional` **tags**: `string`[]

Defined in: [src/types/CapabilitySchema.ts:164](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L164)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`tags`](AgentCapability.md#tags)

***

### version

> **version**: [`SemVer`](SemVer.md)

Defined in: [src/types/CapabilitySchema.ts:123](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/types/CapabilitySchema.ts#L123)

#### Inherited from

[`AgentCapability`](AgentCapability.md).[`version`](AgentCapability.md#version)
