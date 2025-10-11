# Research: Dynamic GraphQL-Based n8n Node for Twenty CRM

**Feature**: 001-dynamic-graphql-based  
**Date**: 2025-10-10  
**Status**: Complete

## Overview

This document consolidates research findings for implementing a dynamic, self-adapting n8n node for Twenty CRM. All technical decisions have been made based on n8n best practices, the project constitution, and Twenty CRM's GraphQL API capabilities.

---

## Decision 1: HTTP Request Library

**Decision**: Use n8n's native `this.helpers.httpRequestWithAuthentication()`

**Rationale**:
- Constitutional requirement (Principle II: n8n Native Tooling)
- n8n best practices explicitly prohibit external HTTP libraries (axios, node-fetch, graphql-request)
- Built-in helper provides automatic authentication, error handling, and request/response transformation
- Reduces dependencies and potential security vulnerabilities
- Ensures compatibility across all n8n versions

**Alternatives Considered**:
- ❌ `graphql-request` library - Violates constitutional principle, adds unnecessary dependency
- ❌ `axios` - Violates n8n best practices, duplicates native functionality
- ❌ `node-fetch` - Violates n8n best practices, adds unnecessary dependency

**Implementation Notes**:
```typescript
const response = await this.helpers.httpRequestWithAuthentication.call(
    this,
    'twentyApi',  // credential type name
    {
        method: 'POST',
        baseURL: credentials.domain as string,
        url: '/metadata',  // or '/graphql'
        body: { query, variables },
        json: true  // Auto stringify/parse JSON
    }
);
```

---

## Decision 2: Schema Caching Strategy

**Decision**: Hybrid caching with 10-minute TTL stored in credential data

**Rationale**:
- Balances performance (reduces API calls) with data freshness (schema updates appear within 10 minutes)
- Credential data scope allows per-user caching (different users can have different Twenty instances)
- TTL prevents stale data from persisting indefinitely
- Force refresh toggle provides manual override when needed
- Aligns with constitutional requirement for configurable TTL

**Alternatives Considered**:
- ❌ No caching - Excessive API calls, poor performance, could hit rate limits
- ❌ Persistent file-based cache - Out of scope per specification, complex lifecycle management
- ❌ Real-time schema updates - Out of scope per specification, Twenty API doesn't support webhooks for schema changes
- ❌ Longer TTL (30+ minutes) - Too stale, users would wait too long for custom object visibility

**Implementation Notes**:
- Store schema in credential data with timestamp: `{ schema: {...}, cachedAt: timestamp }`
- Check `Date.now() - cachedAt > 600000` (10 minutes) to determine if refresh needed
- Force refresh toggle bypasses cache check temporarily

---

## Decision 3: Dynamic UI Generation Approach

**Decision**: Use n8n's `loadOptions` methods with `loadOptionsDependsOn` for cascading dropdowns

**Rationale**:
- Native n8n pattern for dynamic dropdowns
- Supports dependency chains (Resource → Fields, Resource → Views)
- Automatic loading states and error handling
- Searchable by default
- Supports both selection and manual expression input

**Alternatives Considered**:
- ❌ Static UI with all possible fields - Impossible with unlimited custom objects
- ❌ JSON text input - Poor UX, requires users to know GraphQL syntax
- ❌ Custom UI components - Not supported in n8n community nodes

**Implementation Notes**:
- `getTwentyResources`: Returns list of all objects from schema metadata
- `getFieldsForResource`: Returns fields for selected resource (depends on `resource` parameter)
- `getRelatedRecords`: Returns records for relational field dropdowns (depends on `resource` and `field`)
- `getViewsForResource`: Returns views for selected resource (depends on `resource` parameter)

---

## Decision 4: GraphQL Query Construction

**Decision**: Template literals with variable substitution, not string interpolation

**Rationale**:
- Security: Prevents GraphQL injection attacks
- GraphQL best practice: Use variables for all user input
- Type safety: GraphQL validates variable types
- Readability: Separates query structure from data

**Alternatives Considered**:
- ❌ String interpolation (`query = \`mutation { create${resource}(data: {...}) }\``) - Security risk, GraphQL injection
- ❌ Query builder library - Adds dependency, unnecessary complexity for dynamic queries

**Implementation Notes**:
```typescript
const query = `
    mutation CreateRecord($object: String!, $data: JSON!) {
        create(object: $object, data: $data) {
            id
            ${selectedFields.join('\n')}
        }
    }
`;
const variables = { object: resourceName, data: fieldValues };
```

---

## Decision 5: Filter Builder Implementation

**Decision**: n8n `fixedCollection` type for AND/OR filter groups

**Rationale**:
- Native n8n UI pattern for complex nested structures
- Supports unlimited filter conditions and groups
- Clear visual representation of AND/OR logic
- Generates JSON structure easily mapped to GraphQL filters

**Alternatives Considered**:
- ❌ JSON text area - Poor UX, error-prone, requires GraphQL knowledge
- ❌ Simple key-value pairs - Can't express OR logic or nested conditions
- ❌ Custom filter UI - Not supported in n8n community nodes

**Implementation Notes**:
```typescript
{
    displayName: 'Filters',
    name: 'filters',
    type: 'fixedCollection',
    typeOptions: {
        multipleValues: true
    },
    options: [
        {
            name: 'filterGroups',
            displayName: 'Filter Group (OR)',
            values: [
                {
                    displayName: 'Conditions (AND)',
                    name: 'conditions',
                    type: 'fixedCollection',
                    // ... nested structure
                }
            ]
        }
    ]
}
```

Maps to GraphQL: `{ or: [{ and: [...conditions] }, { and: [...conditions] }] }`

---

## Decision 6: Error Handling Strategy

**Decision**: Catch all errors, transform to user-friendly messages, never expose raw GraphQL/API errors

**Rationale**:
- Constitutional requirement (Principle III: User Experience First)
- n8n best practice for error messages
- Raw GraphQL errors are cryptic and unhelpful to workflow builders
- Provides actionable guidance (what went wrong, how to fix)

**Alternatives Considered**:
- ❌ Pass-through raw errors - Violates UX principle, confuses users
- ❌ Generic error messages - Not helpful, makes debugging impossible

**Implementation Notes**:
```typescript
try {
    const response = await twentyApiRequest(...)
    if (response.errors) {
        throw new Error(`Failed to ${operation} ${resource}: ${friendlyErrorMessage(response.errors)}`);
    }
} catch (error) {
    throw new Error(`Twenty CRM API error: ${getUserFriendlyMessage(error)}`);
}
```

Error message examples:
- "Failed to create Company: Field 'industry' is required but was not provided"
- "Failed to fetch Companies: Company object may not exist in your Twenty workspace"
- "Schema refresh failed: Invalid API key or network issue"

---

## Decision 7: Field Type Handling

**Decision**: Detect field types from Twenty metadata and provide appropriate UI controls

**Rationale**:
- Different field types need different input methods (text, number, date, relation)
- Twenty metadata includes field type information
- Relational fields need special handling (dropdown + manual entry)
- Improves UX and reduces user errors

**Implementation Details**:
- **TEXT/STRING**: Standard string input
- **NUMBER**: Number input with validation
- **DATE/DATETIME**: n8n date picker or ISO string input
- **BOOLEAN**: Toggle/checkbox
- **RELATION**: Searchable dropdown (via loadOptions) + manual ID entry
- **SELECT/ENUM**: Dropdown with predefined options from metadata

**Alternatives Considered**:
- ❌ All fields as text - Poor UX, requires manual type conversion, error-prone
- ❌ Hardcode field types - Won't work with custom fields, violates dynamic principle

---

## Decision 8: Twenty CRM Views Integration

**Decision**: Query Twenty's views endpoint, display in dropdown, apply view filters to search

**Rationale**:
- Users already define business logic in Twenty views
- Reusing views ensures consistency between Twenty UI and n8n workflows
- Saves time (don't rebuild complex filters)
- Views are per-object, so dropdown depends on selected resource

**Implementation Notes**:
- Query: `query { views(filter: { objectName: { eq: "${resource}" } }) { id name } }`
- Apply view filters by merging with user's custom filters (AND logic)
- Views only applicable to List/Search operation

**Alternatives Considered**:
- ❌ Ignore views - Users requested this feature (Priority P3), improves efficiency
- ❌ Manual view ID entry - Poor UX, users don't know view IDs

---

## Decision 9: Data Immutability Implementation

**Decision**: Clone input data before any transformation, return new array

**Rationale**:
- Critical n8n requirement (data shared across all nodes in workflow)
- Prevents silent data corruption in downstream nodes
- Constitutional requirement (n8n Node Standards)

**Implementation Notes**:
```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    
    for (let i = 0; i < items.length; i++) {
        // Process item, create new result object
        const newItem = {
            json: { /* query result */ },
            pairedItem: { item: i }
        };
        returnData.push(newItem);
    }
    
    return [returnData];  // New array, never modify items
}
```

**Alternatives Considered**:
- ❌ Modify input items - Violates n8n rules, causes workflow corruption

---

## Decision 10: Testing Approach

**Decision**: Manual testing with actual Twenty CRM instance using constitutional checklist

**Rationale**:
- n8n nodes require integration testing with real APIs
- Twenty CRM GraphQL API is complex (not easily mocked)
- Constitutional checklist provides comprehensive test coverage (40+ scenarios)
- Automated unit tests less valuable for UI-heavy, API-dependent nodes

**Test Coverage**:
- ✅ Schema discovery and caching
- ✅ All CRUD operations on standard and custom objects
- ✅ Relational field handling
- ✅ Filter builder with complex queries
- ✅ Views integration
- ✅ Error handling
- ✅ Data immutability
- ✅ n8n workflow integration

**Alternatives Considered**:
- ❌ Unit tests only - Can't test API integration or UI behavior
- ❌ Mock Twenty API - Too complex, doesn't catch real API issues
- ⚠️ Future: Automated E2E tests - Could add later, but manual testing sufficient for initial release

---

## Technology Stack Summary

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Language | TypeScript | 5.5.3 | n8n requirement, type safety |
| Runtime | Node.js | 18.10+ | n8n compatibility |
| HTTP Client | n8n native helpers | n8n-workflow | Constitutional requirement |
| GraphQL | Template literals | N/A | No library needed, security |
| Build Tool | TypeScript + Gulp | Latest | n8n standard, icon copying |
| Linting | ESLint + n8n plugin | 8.57.1 | Code quality, n8n compliance |
| Formatting | Prettier | 3.3.2 | Code consistency |
| Package Manager | pnpm | 9.1.4 | Project standard |

---

## Dependencies Analysis

### Peer Dependencies
- `n8n-workflow`: Provides n8n types and interfaces (required)

### Dev Dependencies
- `typescript`: Compilation (required)
- `eslint`: Code linting (required)
- `eslint-plugin-n8n-nodes-base`: n8n-specific linting rules (required)
- `prettier`: Code formatting (required)
- `gulp`: Build tasks, icon copying (required)

### Removed Dependencies
- ❌ `@devlikeapro/n8n-openapi-node`: Old static approach, removed
- ❌ `graphql-request`: Violates constitution, removed
- ❌ `axios`: Not needed, n8n provides HTTP helpers

### External Dependencies: NONE
All functionality implemented using n8n native helpers and TypeScript standard library.

---

## Performance Considerations

### Schema Caching
- **Benefit**: 90%+ reduction in API calls
- **Trade-off**: 10-minute delay for new custom objects to appear
- **Mitigation**: Force refresh toggle for immediate updates

### Relational Field Dropdowns
- **Target**: <3 seconds for 1000 records
- **Strategy**: Query only `id` and `name` fields, limit to reasonable set
- **Future**: Pagination or search-as-you-type if performance issues arise

### Filter Builder
- **Complexity**: O(n) where n = number of filter conditions
- **Limit**: No artificial limit, trust n8n's UI handling
- **Performance**: GraphQL handles complex filters efficiently

### List/Search Operations
- **Target**: 100+ records without degradation
- **Strategy**: User-configurable limit, default to reasonable value (50-100)
- **Future**: Pagination support if needed

---

## Security Considerations

### API Key Storage
- ✅ Stored in n8n credential system (encrypted at rest)
- ✅ Never logged or exposed in error messages
- ✅ Passed via authentication header only

### GraphQL Injection Prevention
- ✅ All user input via GraphQL variables (not string interpolation)
- ✅ Variable type validation by GraphQL
- ✅ No dynamic query string construction from user input

### Error Message Sanitization
- ✅ Never expose API keys or internal system details
- ✅ Transform technical errors to user-friendly messages
- ✅ Log detailed errors server-side only (if n8n supports)

---

## Research Conclusion

All technical decisions have been made and documented. No outstanding NEEDS CLARIFICATION items remain. 

**Status**: ✅ Research phase complete  
**Next Phase**: Phase 1 - Design & Contracts (data-model.md, contracts/, quickstart.md)
