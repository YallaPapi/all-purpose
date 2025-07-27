# Prospector Agent - Product Requirements Document

## Executive Summary

The Prospector Agent is the lead discovery engine of the Lead Generation Machine, designed to automatically find and collect leads across all profitable channels using the All-Purpose Pattern methodology. It operates with zero hardcoded limitations and adapts to any industry/location combination.

## Objectives

**Primary Goal**: Automated lead discovery and collection across all profitable channels  
**North Star**: 10x increase in raw leads entering the pipeline from multiple sources  
**All-Purpose Pattern**: Works for ANY industry/location combination with ZERO hardcoded limitations

## Core Requirements

### 1. Universal Configuration System
```typescript
interface ProspectorConfig {
  industries: string[]; // UNLIMITED - from user input/configuration (NO predefined lists)
  locations: string[]; // UNLIMITED - from user targeting (NO geographic limits)
  sources: LeadSource[]; // UNLIMITED - Google Maps, directories, LinkedIn, etc.
  schedule: ScheduleConfig; // UNLIMITED - user-configurable intervals
}
```

### 2. Lead Discovery Sources
- Google Places API (New) - primary source using free tier (10,000 calls/month)
- Text Search (New) API for natural language business queries
- Nearby Search (New) API for geographic area coverage
- Apify Google Maps actors as fallback for large-scale operations (>10K/month)

### 3. Universal Output Format
```typescript
interface ProspectedLead {
  name: string;
  company: string;
  industry: string;
  location: string;
  contactInfo: ContactDetails;
  source: string;
  qualityScore: number;
  discoveredAt: Date;
}
```

### 4. Technology Requirements
- **Primary API**: Google Places API (New) with Text Search and Nearby Search endpoints
- **Cost Optimization**: Field masking to request only necessary data fields
- **Rate Limiting**: Proper rate limiting and exponential backoff implementation
- **Backup Solution**: Apify Google Maps actors for high-volume requirements
- **Scheduling**: Vercel cron jobs for automated discovery within API limits
- **Storage**: Redis for lead deduplication and tracking
- **Deployment**: Vercel serverless functions

### 5. Quality Control
- Lead deduplication using Google Place IDs for unique identification
- Quality scoring based on Google Places API data completeness
- API usage monitoring and cost optimization through field masking
- Rate limiting compliance with Google's API constraints and Terms of Service

## All-Purpose Pattern Implementation

### Eliminate Hardcoded Limitations
- ❌ NO hardcoded industry lists ("automotive", "dental", "legal")
- ❌ NO hardcoded location lists ("Miami", "New York", "California")  
- ❌ NO hardcoded search terms or templates
- ✅ ALL configuration from user input
- ✅ Dynamic template generation for any industry
- ✅ Unlimited scalability by design

### Dynamic Template System
```typescript
// NO hardcoded search terms
interface SearchTemplate {
  industryKeywords: string[]; // Generated from user input
  locationModifiers: string[]; // Generated from targeting
  sourceSpecificFormats: SourceFormat[]; // Adapted per source
  qualificationCriteria: QualityCriteria; // Dynamic based on industry
}
```

## Technical Architecture

### Core Components
1. **Discovery Engine**: Multi-source lead discovery
2. **Template Generator**: Dynamic search templates  
3. **Quality Scorer**: Lead qualification and scoring
4. **Deduplication System**: Cross-source duplicate prevention
5. **Scheduler**: Automated discovery cycles
6. **Output Manager**: Standardized lead format

### Integration Points
- **Input**: User configuration for industries/locations/sources
- **Output**: Standardized leads to Lead Intelligence Agent
- **Storage**: Redis for persistence and deduplication
- **Monitoring**: Performance metrics and source effectiveness

## Success Metrics

### Lead Generation KPIs
- **Lead Volume**: 10x increase in qualified leads discovered from Google Maps
- **Coverage**: Comprehensive Google Maps business data extraction
- **Quality Score**: High-quality leads with complete contact information
- **Deduplication Rate**: <5% duplicate leads within Google Maps results
- **Discovery Speed**: Real-time lead processing and qualification

### Technical Performance
- **Uptime**: 99.9% availability
- **Processing Speed**: <10 seconds per Google Places API call
- **API Success Rate**: >95% successful data extraction from Google Places API
- **Cost Efficiency**: Maximize free tier usage (10,000 calls/month) before scaling costs
- **Scalability**: Automatic fallback to Apify for volumes exceeding API limits

## Implementation Requirements

### Phase 1: Core Discovery Engine
- Implement Google Places API (New) integration with Text Search and Nearby Search
- Build All-Purpose Pattern configuration system for unlimited industries/locations
- Create universal lead output format using Google Place IDs
- Set up basic quality scoring and field masking for cost optimization

### Phase 2: Template Generation
- Dynamic Google Places API query generation for Text Search endpoint
- Industry-specific search optimization using natural language queries
- Geographic area partitioning for comprehensive coverage within API limits
- Quality criteria customization for Google Places business data

### Phase 3: Optimization & Scaling
- Advanced quality scoring algorithms for Google Places business data
- API usage monitoring and cost optimization tracking
- Rate limiting optimization and intelligent request batching
- Automatic scaling infrastructure with Apify fallback for high-volume needs

### Phase 4: Integration
- Lead Intelligence Agent integration
- Performance monitoring setup
- Documentation and testing
- Production deployment

## Constraints & Considerations

### Ethical Guidelines
- Respect robots.txt and rate limits
- Follow platform terms of service
- Implement appropriate delays between requests
- Store only publicly available information

### Performance Constraints
- API rate limiting compliance
- Serverless function timeout limits
- Storage optimization for large lead volumes
- Cost optimization for API usage

### Scalability Requirements
- Handle unlimited industries and locations
- Support concurrent discovery across multiple sources
- Scale with business growth requirements
- Maintain performance as lead volume increases

## Dependencies

### External Services
- Google Places API (New) - primary service with 10,000 free calls/month
- Google Cloud Console for API key management and monitoring
- Apify platform for high-volume fallback (when exceeding free tier)
- Email verification services (optional enhancement)

### Internal Systems
- Redis database for storage
- Vercel deployment infrastructure
- Template Engine Factory (for dynamic templates)
- Parameter Flow system (for data handoffs)

## Acceptance Criteria

1. ✅ Discovers leads from multiple configurable sources
2. ✅ Works for ANY industry/location without code changes
3. ✅ Produces standardized lead output format
4. ✅ Implements effective deduplication
5. ✅ Maintains >80% source success rate
6. ✅ Scales to handle unlimited target markets
7. ✅ Deploys as Vercel serverless functions
8. ✅ Integrates with existing Lead Generation Machine architecture

---

**The Prospector Agent transforms manual lead discovery into an automated, scalable engine that finds qualified prospects across unlimited markets and industries.**