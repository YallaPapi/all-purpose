[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / CapabilityVersionUtils

# Variable: CapabilityVersionUtils

> `const` **CapabilityVersionUtils**: `object`

Defined in: [src/utils/CapabilityVersioning.ts:510](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/utils/CapabilityVersioning.ts#L510)

Export utility functions

## Type declaration

### calculateVersionCompatibilityScore()

> **calculateVersionCompatibilityScore**: (`provided`, `required`) => `number`

Calculate version compatibility score (0-1)

#### Parameters

##### provided

[`SemVer`](../interfaces/SemVer.md)

##### required

[`VersionRange`](../interfaces/VersionRange.md)

#### Returns

`number`

### checkCapabilityCompatibility()

> **checkCapabilityCompatibility**: (`provided`, `required`) => [`CompatibilityResult`](../interfaces/CompatibilityResult.md)

Check capability compatibility with detailed analysis

#### Parameters

##### provided

[`AgentCapability`](../interfaces/AgentCapability.md)

##### required

[`CapabilityRequirement`](../interfaces/CapabilityRequirement.md)

#### Returns

[`CompatibilityResult`](../interfaces/CompatibilityResult.md)

### compareSemVer()

> **compareSemVer**: (`v1`, `v2`) => `number`

Compare two semantic versions
Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2

#### Parameters

##### v1

[`SemVer`](../interfaces/SemVer.md)

##### v2

[`SemVer`](../interfaces/SemVer.md)

#### Returns

`number`

### findHighestCompatibleVersion()

> **findHighestCompatibleVersion**: (`capabilities`, `requirement`) => `null` \| [`AgentCapability`](../interfaces/AgentCapability.md)

Find the highest compatible version from a list of capabilities

#### Parameters

##### capabilities

[`AgentCapability`](../interfaces/AgentCapability.md)[]

##### requirement

[`CapabilityRequirement`](../interfaces/CapabilityRequirement.md)

#### Returns

`null` \| [`AgentCapability`](../interfaces/AgentCapability.md)

### getNextMajorVersion()

> **getNextMajorVersion**: (`version`) => [`SemVer`](../interfaces/SemVer.md)

Get the next major version

#### Parameters

##### version

[`SemVer`](../interfaces/SemVer.md)

#### Returns

[`SemVer`](../interfaces/SemVer.md)

### getNextMinorVersion()

> **getNextMinorVersion**: (`version`) => [`SemVer`](../interfaces/SemVer.md)

Get the next minor version

#### Parameters

##### version

[`SemVer`](../interfaces/SemVer.md)

#### Returns

[`SemVer`](../interfaces/SemVer.md)

### getNextPatchVersion()

> **getNextPatchVersion**: (`version`) => [`SemVer`](../interfaces/SemVer.md)

Get the next patch version

#### Parameters

##### version

[`SemVer`](../interfaces/SemVer.md)

#### Returns

[`SemVer`](../interfaces/SemVer.md)

### isPrerelease()

> **isPrerelease**: (`version`) => `boolean`

Check if a version is a pre-release

#### Parameters

##### version

[`SemVer`](../interfaces/SemVer.md)

#### Returns

`boolean`

### isVersionEqual()

> **isVersionEqual**: (`v1`, `v2`) => `boolean`

Check if two semantic versions are equal

#### Parameters

##### v1

[`SemVer`](../interfaces/SemVer.md)

##### v2

[`SemVer`](../interfaces/SemVer.md)

#### Returns

`boolean`

### isVersionGreater()

> **isVersionGreater**: (`v1`, `v2`) => `boolean`

Check if version v1 is greater than v2

#### Parameters

##### v1

[`SemVer`](../interfaces/SemVer.md)

##### v2

[`SemVer`](../interfaces/SemVer.md)

#### Returns

`boolean`

### isVersionLess()

> **isVersionLess**: (`v1`, `v2`) => `boolean`

Check if version v1 is less than v2

#### Parameters

##### v1

[`SemVer`](../interfaces/SemVer.md)

##### v2

[`SemVer`](../interfaces/SemVer.md)

#### Returns

`boolean`

### parseSemVer()

> **parseSemVer**: (`version`) => [`SemVer`](../interfaces/SemVer.md)

Parse semantic version string into SemVer object

#### Parameters

##### version

`string`

#### Returns

[`SemVer`](../interfaces/SemVer.md)

### parseVersionRange()

> **parseVersionRange**: (`rangeString`) => [`VersionRange`](../interfaces/VersionRange.md)

Parse version range string (npm-style)

#### Parameters

##### rangeString

`string`

#### Returns

[`VersionRange`](../interfaces/VersionRange.md)

### satisfiesVersionRange()

> **satisfiesVersionRange**: (`provided`, `range`) => `boolean`

Check if capability version satisfies requirement range

#### Parameters

##### provided

[`SemVer`](../interfaces/SemVer.md)

##### range

[`VersionRange`](../interfaces/VersionRange.md)

#### Returns

`boolean`

### semVerToString()

> **semVerToString**: (`version`) => `string`

Convert SemVer object to string representation

#### Parameters

##### version

[`SemVer`](../interfaces/SemVer.md)

#### Returns

`string`

### validateSemVer()

> **validateSemVer**: (`version`) => `object`

Validate semantic version structure

#### Parameters

##### version

[`SemVer`](../interfaces/SemVer.md)

#### Returns

`object`

##### errors

> **errors**: `string`[]

##### valid

> **valid**: `boolean`
