# Test Results Summary: Twenty GraphQL Field Discovery Issue

## Date: October 12, 2025

## Issue
Only 8 fields are returned for the Company object from Twenty's GraphQL metadata API, despite 25+ fields being expected and visible in the Twenty CRM UI.

## Tests Executed

### Test 1: Resources Query (`npm run test:resources`)
**Status:** ✅ PASSED  
**Results:** Successfully retrieved 39 objects (34 standard + 5 custom)  
**Conclusion:** The resource query works correctly.

### Test 2: Company Fields Query (`npm run test:fields`)
**Status:** ⚠️ PARTIAL - Returns only 8 fields  
**Results:** 
- Retrieved: 8 fields
- Expected: 25+ fields
- Missing critical fields: `name`, `accountOwner`, `createdBy`, `id`, `createdAt`, `updatedAt`, `linkedinLink`, `xLink`, and 8+ more

**Fields Actually Returned:**
1. ARR (annualRecurringRevenue) - CURRENCY
2. Address (address) - ADDRESS
3. Status (status) - SELECT
4. Employees (employees) - NUMBER
5. Domain Name (domainName) - LINKS
6. Favorites (favorites) - RELATION (system)
7. Opportunities (opportunities) - RELATION
8. Timeline Activities (timelineActivities) - RELATION (system)

**Critical Missing Fields:**
- `name` - Company name (most critical!)
- `id` - Record ID
- `accountOwner` - Account owner
- `createdBy` - Creator
- `createdAt`, `updatedAt`, `deletedAt` - Timestamps
- `linkedinLink`, `xLink` - Social links
- `idealCustomerProfile`, `position`, `visaSponsorship`, `searchVector`, `companyStatus`, `tagline`, `workPolicy`

### Test 3: GraphQL Schema Introspection (`npm run test:introspect`)
**Status:** ✅ PASSED  
**Results:** Successfully introspected the GraphQL schema

**Key Finding:** Discovered `FieldFilter` type with available filters:
- `id`: UUID filter
- `isCustom`: Boolean filter
- `isActive`: Boolean filter
- `isSystem`: Boolean filter
- `isUIReadOnly`: Boolean filter

## Filter Tests Performed

| Filter Applied | Fields Returned | Notes |
|---|---|---|
| `filter: {}` | 8 fields | Empty object filter |
| `filter: { isActive: { is: true } }` | 9 fields | Added one field (hasCvc) |
| NO FILTER | 8 fields | Removed filter parameter entirely |

**Conclusion:** Filters do not significantly change the results. The API consistently returns only 8-9 fields.

## Root Cause Analysis

The Twenty GraphQL metadata API at `/metadata` endpoint **does not return all fields** that exist for the Company object in the Twenty CRM UI. This is confirmed by:

1. **Consistent behavior across all filter variations** - Whether we use `filter: {}`, `isActive: true`, or no filter at all, we get roughly the same 8 fields.

2. **All returned fields show `isActive: true`** - This rules out the possibility that fields are hidden because they're inactive.

3. **The missing fields are fundamental** - Fields like `name`, `id`, and timestamps are basic database columns that should always exist, yet they're not in the metadata response.

## Possible Explanations

### Theory 1: Standard Fields Not in Metadata
The Twenty CRM may exclude "standard" or "built-in" fields from the metadata API, only exposing custom fields and relations. The 8 fields we see might all be custom additions or relations specific to this instance.

### Theory 2: Different API Endpoint
Standard fields like `id`, `name`, `createdAt` might be exposed through a different API endpoint (not `/metadata`), or they might be implicitly available without being listed in metadata.

### Theory 3: Schema Design
Twenty's architecture might distinguish between:
- **Metadata fields** - Custom fields defined via the metadata API
- **Built-in fields** - Standard fields that exist on all objects by default

### Theory 4: Instance Configuration
This specific Twenty CRM instance might have configuration that limits which fields are exposed via the metadata API.

## Impact on n8n Node

**CRITICAL BLOCKER:** Cannot create/update Company records without access to required fields like `name`.

The n8n node relies on the metadata API to:
1. Populate field dropdowns dynamically
2. Determine which fields are writable
3. Build GraphQL mutations for create/update operations

Without access to critical fields like `name`, the node cannot perform basic operations.

## Recommendations

### Option 1: Hardcode Standard Fields
Add a list of known standard fields (id, name, createdAt, updatedAt, etc.) that exist on all objects, regardless of metadata API response.

```typescript
const STANDARD_FIELDS = {
  company: [
    { name: 'id', label: 'ID', type: 'UUID', isNullable: false, isWritable: false },
    { name: 'name', label: 'Name', type: 'TEXT', isNullable: false, isWritable: true },
    { name: 'createdAt', label: 'Created At', type: 'DATE_TIME', isNullable: false, isWritable: false },
    { name: 'updatedAt', label: 'Updated At', type: 'DATE_TIME', isNullable: false, isWritable: false },
    // ... more standard fields
  ]
};
```

### Option 2: Query Actual Data
Query the `/graphql` endpoint with an actual data query for one record to see what fields come back:

```graphql
query {
  companies(filter: {}, paging: { first: 1 }) {
    edges {
      node {
        id
        __typename
      }
    }
  }
}
```

Then use GraphQL introspection on the data schema (not metadata schema) to discover available fields.

### Option 3: Contact Twenty Support
This might be a bug or undocumented limitation in the Twenty GraphQL API that should be reported to the Twenty development team.

### Option 4: Hybrid Approach
Combine metadata fields with a predefined list of standard fields that are known to exist on standard objects based on Twenty's documentation.

## Next Steps

1. **Test Option 2**: Query the `/graphql` endpoint to see if standard fields are available in actual data queries
2. **Review Twenty Documentation**: Check if there's official documentation about which fields are exposed via metadata vs. data APIs
3. **Test with Other Objects**: Check if Person, Opportunity, and other standard objects show the same behavior
4. **Consider Hybrid Solution**: Implement a combination of metadata discovery + hardcoded standard fields

## Files Created

- `tests/graphql_twenty_resources_call.ts` - Part 1: Resource query test
- `tests/graphql_twenty_fields_call.ts` - Part 2: Company fields query test
- `tests/graphql_introspection.ts` - Schema introspection test
- `tests/package.json` - Test dependencies and scripts
- `tests/tsconfig.json` - TypeScript configuration
- `tests/.env.example` - Environment variable template
- `tests/README.md` - Test documentation

## Test Commands

```bash
cd tests
npm install
cp .env.example .env
# Edit .env with your credentials

npm run test:resources    # Part 1: Test resource query
npm run test:fields       # Part 2: Test Company fields query
npm run test:introspect   # Schema introspection
```

## Conclusion

The Twenty GraphQL `/metadata` endpoint **definitively returns only 8 fields for the Company object**, regardless of filtering. The missing 16+ fields (including critical ones like `name` and `id`) are either:
- Not exposed via metadata API
- Available through a different endpoint
- Implicitly available without metadata definition

Further investigation is needed to determine how to access these critical fields for CRUD operations in the n8n node.
