# Twenty GraphQL API Tests

Unit tests for understanding Twenty CRM GraphQL API behavior without n8n complexity.

## Quick Start

```bash
cd tests
npm install
cp .env.example .env
# Edit .env with your TWENTY_API_KEY and TWENTY_URL

# Run all tests
npm run test:resources        # Part 1: Test resource query (39 objects)
npm run test:fields           # Part 2: Test metadata fields query (8 fields - INCOMPLETE)
npm run test:introspect       # Part 3: Introspect metadata schema
npm run test:data             # Part 4: Query actual Company data (17 fields)
npm run test:data-introspect  # Part 5: Introspect data schema (29 fields - COMPLETE!)
```

## Test Results Summary

| Test | Endpoint | Result | Fields Found |
|------|----------|--------|--------------|
| Part 1: Resources | `/metadata` | ✅ Success | 39 objects |
| Part 2: Metadata Fields | `/metadata` | ⚠️ Incomplete | 8 fields |
| Part 3: Metadata Introspection | `/metadata` | ✅ Success | Filter options |
| Part 4: Data Query | `/graphql` | ✅ Success | 17 fields |
| Part 5: **Data Introspection** | `/graphql` | ✅ **COMPLETE** | **29 fields** |

## Critical Finding

**The `/metadata` endpoint only returns 8 custom fields, but the `/graphql` data schema has ALL 29 fields!**

### Missing from Metadata (21 fields):
- `id`, `name` - Most critical!
- `createdAt`, `updatedAt`, `deletedAt` - Timestamps
- `accountOwner`, `accountOwnerId`, `createdBy` - Relations
- `linkedinLink`, `xLink`, `website`, `cvcWebsite` - Links
- `idealCustomerProfile`, `position`, `searchVector`, `hasCvc`, `category` - Standard fields
- `people`, `taskTargets`, `noteTargets`, `attachments` - Additional relations

## Recommended Solution for n8n Node

**Use a hybrid approach:**

1. **Object Discovery:** Query `/metadata` for available objects (works perfectly)
   ```graphql
   query { objects(paging: { first: 200 }) { ... } }
   ```

2. **Field Discovery:** Use GraphQL introspection on `/graphql` for complete field list
   ```graphql
   query { __type(name: "Company") { fields { name type { ... } } } }
   ```

This gives us:
- ✅ All 29 fields instead of only 8
- ✅ Dynamic discovery (no hardcoded field lists)
- ✅ Accurate field types from schema
- ✅ Works with both standard and custom objects

## Test Files

- `graphql_twenty_resources_call.ts` - Resource dropdown population test
- `graphql_twenty_fields_call.ts` - Company fields retrieval test (to be created)
- `.env.example` - Example environment configuration
- `package.json` - Test dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Purpose

These tests help us:
1. Understand the exact GraphQL queries needed
2. See the raw API responses
3. Debug field visibility issues
4. Validate query structure before integration
