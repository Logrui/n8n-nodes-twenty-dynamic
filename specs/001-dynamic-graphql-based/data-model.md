# Data Model: Dynamic GraphQL-Based n8n Node for Twenty CRM

**Feature**: 001-dynamic-graphql-based  
**Date**: 2025-10-10  
**Status**: Complete

## Overview

This document describes the data entities and their relationships for the dynamic n8n node. The node itself doesn't persist data but works with several key entities at runtime.

---

## Entity 1: Schema Metadata (Cached)

**Description**: The complete schema information for a Twenty CRM workspace, including all objects and their fields.

**Source**: Twenty CRM `/metadata` GraphQL endpoint

**Storage**: Credential data (10-minute TTL cache)

**Attributes**:
- `objects`: Array of ObjectMetadata
- `cachedAt`: Timestamp (milliseconds since epoch)
- `domain`: Twenty CRM instance URL (for cache invalidation)

**ObjectMetadata Structure**:
```typescript
{
    nameSingular: string,    // e.g., "company"
    namePlural: string,      // e.g., "companies"
    labelSingular: string,   // e.g., "Company"
    labelPlural: string,     // e.g., "Companies"
    isCustom: boolean,       // true for custom objects
    fields: FieldMetadata[]
}
```

**FieldMetadata Structure**:
```typescript
{
    name: string,            // e.g., "industry"
    label: string,           // e.g., "Industry"
    type: string,            // TEXT, NUMBER, DATE, RELATION, BOOLEAN, SELECT
    isNullable: boolean,
    isRequired: boolean,
    isWritable: boolean,
    relationMetadata?: {
        toObjectNameSingular: string,  // Referenced object
        type: 'ONE_TO_MANY' | 'MANY_TO_ONE'
    }
}
```

**Lifecycle**:
1. Fetched on first node load or when cache expires
2. Stored in credential data with timestamp
3. Invalidated after 10 minutes
4. Force refreshable via user toggle

**Relationships**:
- Contains: ObjectMetadata (1:many)
- ObjectMetadata contains: FieldMetadata (1:many)
- FieldMetadata may reference: ObjectMetadata (via relationMetadata)

---

## Entity 2: Node Configuration

**Description**: User's configuration for a specific Twenty node instance in a workflow.

**Source**: n8n node parameters

**Storage**: n8n workflow JSON

**Attributes**:
- `resource`: string - Selected object name (e.g., "company")
- `operation`: string - Selected operation (createOne, findOne, findMany, updateOne, deleteOne)
- `forceRefresh`: boolean - Force schema cache refresh
- `recordId`: string (optional) - For Get, Update, Delete operations
- `fields`: collection (optional) - For Create/Update operations
  - `key`: string - Field name
  - `value`: any - Field value
- `limit`: number (optional) - For List/Search operation
- `filters`: fixedCollection (optional) - For List/Search operation
  - `filterGroups`: array
    - `conditions`: array
      - `field`: string
      - `operator`: string (eq, neq, gt, lt, contains, startsWith, in)
      - `value`: any
- `view`: string (optional) - View ID for List/Search operation

**Validation Rules**:
- `resource` is required for all operations
- `operation` is required for all operations
- `recordId` is required for Get, Update, Delete operations
- `fields` is required for Create operation, optional for Update
- `limit` must be positive integer if provided

**State Transitions**: None (stateless node)

---

## Entity 3: GraphQL Query

**Description**: Dynamically constructed GraphQL query based on user configuration and schema metadata.

**Source**: Generated at runtime

**Storage**: In-memory (not persisted)

**Structure**:
```typescript
{
    query: string,      // GraphQL query string
    variables: object   // GraphQL variables (for parameterization)
}
```

**Example - Create Operation**:
```graphql
mutation CreateCompany($data: CompanyCreateInput!) {
    createCompany(data: $data) {
        id
        name
        industry
        employees
        createdAt
    }
}
```
Variables: `{ data: { name: "Acme Corp", industry: "Technology", employees: 500 } }`

**Example - List/Search with Filters**:
```graphql
query FindCompanies($filter: CompanyFilterInput, $limit: Int) {
    companies(filter: $filter, limit: $limit) {
        edges {
            node {
                id
                name
                industry
                employees
            }
        }
    }
}
```
Variables: `{ filter: { and: [{ industry: { eq: "Technology" } }, { employees: { gt: 100 } }] }, limit: 50 }`

**Lifecycle**:
1. Constructed when node executes
2. Validated for GraphQL syntax
3. Executed via Twenty CRM `/graphql` endpoint
4. Discarded after execution

**Relationships**:
- Based on: Schema Metadata
- Based on: Node Configuration
- Executed against: Twenty CRM API

---

## Entity 4: Filter Condition

**Description**: A single filter criterion for List/Search operations.

**Source**: User input via filter builder UI

**Storage**: Node Configuration (filters parameter)

**Attributes**:
- `field`: string - Field name to filter on
- `operator`: string - Comparison operator
- `value`: any - Value to compare against

**Supported Operators**:
- `eq`: Equals
- `neq`: Not equals
- `gt`: Greater than
- `lt`: Less than
- `gte`: Greater than or equal
- `lte`: Less than or equal
- `contains`: String contains (case-insensitive)
- `startsWith`: String starts with (case-insensitive)
- `endsWith`: String ends with (case-insensitive)
- `in`: Value in list
- `notIn`: Value not in list

**Validation Rules**:
- `field` must exist in selected object's schema
- `operator` must be appropriate for field type (e.g., gt/lt only for numbers/dates)
- `value` must match field type

**Relationships**:
- Grouped into: Filter Groups (many:1)
- Targets: FieldMetadata (many:1)

---

## Entity 5: Filter Group

**Description**: A collection of filter conditions combined with AND logic. Multiple groups are combined with OR logic.

**Source**: User input via filter builder UI

**Storage**: Node Configuration (filters.filterGroups)

**Structure**:
```typescript
{
    conditions: FilterCondition[]
}
```

**Logic**:
- Conditions within a group: AND (all must match)
- Multiple groups: OR (any group can match)

**Example**:
```
Group 1: industry = "Technology" AND employees > 100
Group 2: industry = "Finance" AND revenue > 1000000

Result: (Technology AND >100 employees) OR (Finance AND >$1M revenue)
```

**GraphQL Translation**:
```graphql
{
    or: [
        { and: [
            { industry: { eq: "Technology" } },
            { employees: { gt: 100 } }
        ]},
        { and: [
            { industry: { eq: "Finance" } },
            { revenue: { gt: 1000000 } }
        ]}
    ]
}
```

**Relationships**:
- Contains: Filter Conditions (1:many)
- Part of: Node Configuration

---

## Entity 6: Twenty CRM View

**Description**: A pre-configured filter set defined in Twenty CRM by the user.

**Source**: Twenty CRM `/graphql` endpoint (views query)

**Storage**: Not stored (queried on demand)

**Attributes**:
- `id`: string - Unique view ID (UUID)
- `name`: string - User-defined view name
- `objectMetadataId`: string - Associated object ID
- `filters`: object - Twenty CRM filter definition

**Lifecycle**:
1. Queried when user selects List/Search operation
2. Displayed in dropdown (via loadOptions)
3. Applied to search query when selected
4. Combined with custom filters using AND logic

**Relationships**:
- Belongs to: ObjectMetadata (many:1)
- Applied in: Node Configuration (optional)

---

## Entity 7: Workflow Record

**Description**: Data flowing through the n8n workflow - input from upstream nodes or output to downstream nodes.

**Source**: n8n workflow execution

**Storage**: n8n workflow execution context

**Structure**:
```typescript
{
    json: object,           // Record data from Twenty CRM
    pairedItem: {
        item: number        // Index of source item
    }
}
```

**Example Output (Create/Get/Update)**:
```typescript
{
    json: {
        id: "abc-123-def",
        name: "Acme Corporation",
        industry: "Technology",
        employees: 500,
        createdAt: "2025-10-10T10:00:00Z"
    },
    pairedItem: { item: 0 }
}
```

**Example Output (List/Search)**:
```typescript
[
    {
        json: { id: "abc-123", name: "Company A", ... },
        pairedItem: { item: 0 }
    },
    {
        json: { id: "def-456", name: "Company B", ... },
        pairedItem: { item: 0 }
    }
]
```

**Immutability Requirement**:
- Input items MUST NOT be modified
- New items MUST be created for output
- Violation causes data corruption in workflows

**Relationships**:
- Represents: Twenty CRM records
- Flows to: Downstream n8n nodes
- Flows from: Upstream n8n nodes

---

## Entity 8: Credential

**Description**: Authentication information for connecting to a Twenty CRM instance.

**Source**: User input via n8n credentials UI

**Storage**: n8n credentials system (encrypted)

**Attributes**:
- `apiKey`: string - Twenty CRM API key
- `domain`: string - Twenty CRM instance URL (e.g., https://app.twenty.com)
- `schemaCache`: object (optional) - Cached schema metadata
- `cacheTimestamp`: number (optional) - Cache timestamp

**Security**:
- Encrypted at rest by n8n
- Never logged or exposed in error messages
- Transmitted only in Authorization header

**Validation Rules**:
- `apiKey` must be non-empty string
- `domain` must be valid URL (https://...)
- `domain` must not end with trailing slash

**Relationships**:
- Used by: Node Configuration (many:1)
- Stores: Schema Metadata (1:1 optional)

---

## Entity Relationship Diagram

```
┌──────────────────┐
│   Credential     │
│  (encrypted)     │
│ - apiKey         │
│ - domain         │
│ - schemaCache────┼──┐
│ - cacheTimestamp │  │
└────────┬─────────┘  │
         │ 1          │
         │ uses       │ 1:1 optional
         │            │
         │ *          ▼
┌────────┴─────────────────┐       ┌────────────────────┐
│   Node Configuration     │       │  Schema Metadata   │
│  (workflow JSON)         │       │   (cached)         │
│ - resource               │       │ - objects[]        │
│ - operation              │       │ - cachedAt         │
│ - recordId               │       └─────┬──────────────┘
│ - fields                 │             │ 1
│ - filters────────┐       │             │ contains
│ - view           │       │             │
└──────┬───────────┘       │             │ *
       │ 1                 │       ┌─────▼──────────────┐
       │ configures        │       │  ObjectMetadata    │
       │                   │       │ - nameSingular     │
       │ *                 │       │ - namePlural       │
       ▼                   │       │ - isCustom         │
┌──────────────────┐       │       │ - fields[]         │
│  GraphQL Query   │       │       └─────┬──────────────┘
│ - query          │       │             │ 1
│ - variables      │       │             │ contains
└──────┬───────────┘       │             │
       │ 1                 │             │ *
       │ executes          │       ┌─────▼──────────────┐
       │                   │       │  FieldMetadata     │
       │ *                 │       │ - name             │
       ▼                   │       │ - type             │
┌──────────────────┐       │       │ - isNullable       │
│ Workflow Record  │       │       │ - isWritable       │
│  (n8n context)   │       │       │ - relationMetadata │
│ - json           │       │       └────────────────────┘
│ - pairedItem     │       │
└──────────────────┘       │
                           │
       ┌───────────────────┘
       │ *
       ▼
┌──────────────────┐       ┌──────────────────┐
│  Filter Group    │       │  Twenty CRM View │
│ - conditions[]   │       │  (queried)       │
└──────┬───────────┘       │ - id             │
       │ 1                 │ - name           │
       │ contains          │ - filters        │
       │                   └──────────────────┘
       │ *
       ▼
┌──────────────────┐
│ Filter Condition │
│ - field          │
│ - operator       │
│ - value          │
└──────────────────┘
```

---

## Data Flow

### 1. Schema Discovery Flow
```
User opens node
    ↓
Check credential cache (schemaCache + cacheTimestamp)
    ↓
If cache valid (<10 min old) → Use cached schema
If cache stale (>10 min old) or force refresh → Fetch from Twenty /metadata
    ↓
Parse metadata into ObjectMetadata + FieldMetadata structures
    ↓
Store in credential cache with timestamp
    ↓
Populate Resource dropdown with objects
```

### 2. Create Operation Flow
```
User selects resource (e.g., "company")
    ↓
Load fields from schema metadata for "company"
    ↓
User fills in field values
    ↓
Construct GraphQL mutation:
    mutation CreateCompany($data: CompanyCreateInput!) { ... }
    ↓
Execute via httpRequestWithAuthentication
    ↓
Parse response, create Workflow Record
    ↓
Return to n8n for downstream nodes
```

### 3. List/Search with Filters Flow
```
User selects resource + "List/Search" operation
    ↓
User builds filters via filter builder UI
    ↓
(Optional) User selects view
    ↓
Transform filter conditions → GraphQL filter syntax
    ↓
Merge view filters (if any) with custom filters (AND logic)
    ↓
Construct GraphQL query with filter variables
    ↓
Execute query, get array of records
    ↓
Convert each record → Workflow Record
    ↓
Return array to n8n
```

### 4. Relational Field Handling Flow
```
User starts Create/Update with relational field (e.g., Company on Contact)
    ↓
Detect field type = RELATION from field metadata
    ↓
Query related object (Company) for id + name fields
    ↓
Populate dropdown via loadOptions
    ↓
User selects from dropdown OR enters ID manually
    ↓
Include relation in mutation data: { companyId: "selected-id" }
```

---

## Validation Rules

### Schema Metadata Validation
- ✅ All objects must have nameSingular, namePlural, labelSingular, labelPlural
- ✅ All fields must have name, label, type
- ✅ Relational fields must have relationMetadata with toObjectNameSingular
- ⚠️ Invalid metadata → Display error to user, don't crash

### Node Configuration Validation
- ✅ Resource must exist in schema metadata
- ✅ Operation must be valid (createOne, findOne, findMany, updateOne, deleteOne)
- ✅ Field keys must exist in selected resource's fields
- ✅ Filter field names must exist in selected resource
- ✅ Required fields must be provided for Create operation
- ⚠️ Validation errors → Clear user-friendly message

### GraphQL Query Validation
- ✅ All variables must be defined in query
- ✅ Field selections must match schema
- ✅ Mutation data types must match GraphQL schema
- ⚠️ GraphQL errors → Transform to user-friendly message

---

## Performance Considerations

### Schema Metadata Caching
- **Size**: ~10-100KB per workspace (typical)
- **TTL**: 10 minutes
- **Impact**: 90%+ reduction in metadata API calls

### Relational Field Queries
- **Limit**: Query only id + name fields
- **Optimization**: Consider pagination for >1000 records (future)

### List/Search Operations
- **Default Limit**: 50-100 records (configurable)
- **Max Limit**: No hard limit, trust GraphQL API
- **Pagination**: Out of scope for initial release

---

## Data Model Status

✅ **Complete** - All entities defined, relationships documented, validation rules specified

**Next**: Create GraphQL query examples in `contracts/` directory
