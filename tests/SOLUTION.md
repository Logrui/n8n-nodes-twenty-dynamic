# SOLUTION: Complete Field Discovery for Twenty CRM n8n Node

## Executive Summary

After comprehensive testing, we discovered that **Twenty CRM has two separate GraphQL schemas**:

1. **Metadata Schema** (`/metadata` endpoint) - Returns only 8 custom fields
2. **Data Schema** (`/graphql` endpoint) - Returns ALL 29 fields via introspection

## Problem Statement

The n8n node was using the `/metadata` endpoint for field discovery, which only returned 8 fields for the Company object:
- annualRecurringRevenue
- address
- status
- employees
- domainName
- favorites (relation)
- opportunities (relation)
- timelineActivities (relation)

This was missing 21 critical fields including `id`, `name`, `createdAt`, `accountOwner`, etc.

## Root Cause

Twenty CRM's `/metadata` endpoint is designed for custom field management, not complete schema discovery. It only exposes:
- Custom fields added by users
- Some relation fields
- **NOT** standard/built-in fields

## The Solution

**Use GraphQL introspection on the `/graphql` data endpoint:**

```graphql
query IntrospectCompany {
    __type(name: "Company") {
        name
        fields {
            name
            description
            type {
                name
                kind
                ofType {
                    name
                    kind
                }
            }
        }
    }
}
```

This returns **all 29 fields** including:

### Standard Fields (21 - previously missing):
1. `id` - Record identifier
2. `name` - Company name
3. `createdAt` - Creation timestamp
4. `updatedAt` - Update timestamp
5. `deletedAt` - Deletion timestamp
6. `createdBy` - Creator (Actor type)
7. `accountOwner` - Account owner (WorkspaceMember)
8. `accountOwnerId` - Account owner ID
9. `linkedinLink` - LinkedIn URL (Links type)
10. `xLink` - Twitter/X URL (Links type)
11. `website` - Website URL (Links type)
12. `cvcWebsite` - CVC website URL (Links type)
13. `idealCustomerProfile` - ICP flag (Boolean)
14. `position` - Position field
15. `searchVector` - Search vector (TSVector)
16. `hasCvc` - Has CVC flag (Boolean)
17. `category` - Company category (List)
18. `people` - Related people (PersonConnection)
19. `taskTargets` - Related tasks (TaskTargetConnection)
20. `noteTargets` - Related notes (NoteTargetConnection)
21. `attachments` - Related attachments (AttachmentConnection)

### Custom Fields (8 - already working):
22. `annualRecurringRevenue` - ARR (Currency)
23. `address` - Address (Address type)
24. `status` - Status (CompanyStatusEnum)
25. `employees` - Employee count (Float)
26. `domainName` - Domain (Links type)
27. `favorites` - Favorites (FavoriteConnection)
28. `opportunities` - Opportunities (OpportunityConnection)
29. `timelineActivities` - Timeline (TimelineActivityConnection)

## Implementation Plan

### Step 1: Add Data Schema Introspection Function

Create a new function in `TwentyApi.client.ts`:

```typescript
export async function getDataSchemaForObject(
    this: TwentyApiContext,
    objectName: string,
): Promise<IFieldMetadata[]> {
    const query = `
        query IntrospectObject {
            __type(name: "${capitalize(objectName)}") {
                fields {
                    name
                    description
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                        }
                    }
                }
            }
        }
    `;

    const response: any = await twentyApiRequest.call(this, 'graphql', query);
    
    if (!response.__type?.fields) {
        return [];
    }

    return response.__type.fields.map((field: any) => ({
        id: field.name,
        name: field.name,
        label: field.description || humanize(field.name),
        type: mapGraphQLTypeToTwentyType(field.type),
        isNullable: field.type.kind !== 'NON_NULL',
        isWritable: !isReadOnlyField(field.name), // id, createdAt, etc.
    }));
}
```

### Step 2: Update getFieldsForResource

Replace the current metadata-based field discovery:

```typescript
async function getFieldsForResource(
    this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
    const resourceValue = this.getNodeParameter('resource', '') as string;
    
    // Use data schema introspection instead of metadata
    const fields = await getDataSchemaForObject.call(this, resourceValue);
    
    return fields
        .filter(field => field.isWritable) // For Create/Update operations
        .map(field => ({
            name: `${field.label} (${field.name})`,
            value: field.name,
            description: `Type: ${field.type}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
```

### Step 3: Add Type Mapping Helper

```typescript
function mapGraphQLTypeToTwentyType(graphQLType: any): string {
    const typeName = graphQLType.ofType?.name || graphQLType.name;
    
    const typeMap: Record<string, string> = {
        'String': 'TEXT',
        'Int': 'NUMBER',
        'Float': 'NUMBER',
        'Boolean': 'BOOLEAN',
        'UUID': 'UUID',
        'DateTime': 'DATE_TIME',
        'Links': 'LINKS',
        'Address': 'ADDRESS',
        'Currency': 'CURRENCY',
        'Position': 'POSITION',
        // ... add more mappings as needed
    };
    
    return typeMap[typeName] || typeName;
}

function isReadOnlyField(fieldName: string): boolean {
    const readOnlyFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'position'];
    return readOnlyFields.includes(fieldName);
}
```

### Step 4: Keep Metadata for Objects

The `/metadata` endpoint works perfectly for object/resource discovery, so keep using it for `getResources`:

```typescript
// Keep this as-is - it works perfectly!
async function getResources(
    this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
    const schema = await getSchemaMetadata.call(this);
    // ... existing implementation
}
```

## Benefits of This Approach

1. ✅ **Complete Field Coverage** - All 29 fields instead of 8
2. ✅ **Dynamic Discovery** - No hardcoded field lists
3. ✅ **Accurate Types** - Direct from GraphQL schema
4. ✅ **Future-Proof** - Works with any custom fields added later
5. ✅ **Standard + Custom** - Both field types included
6. ✅ **No Breaking Changes** - Objects still from metadata endpoint

## Testing Evidence

- ✅ Part 1: `/metadata` returns 39 objects (works)
- ❌ Part 2: `/metadata` returns 8 fields (incomplete)
- ✅ Part 3: `/metadata` introspection works (found filter options)
- ✅ Part 4: `/graphql` data query returns 17 fields (better)
- ✅ Part 5: `/graphql` introspection returns 29 fields (COMPLETE!)

## Next Steps

1. Implement the data schema introspection function
2. Update field discovery to use `/graphql` instead of `/metadata`
3. Add type mapping for all GraphQL types
4. Test with Company, Person, and custom objects
5. Publish new version (v0.2.0)

## Files Modified

- `nodes/Twenty/TwentyApi.client.ts` - Add data schema introspection
- `nodes/Twenty/Twenty.node.ts` - Update getFieldsForResource
- `package.json` - Bump to v0.2.0
- `PLAN_V2.md` - Update status to RESOLVED

## Time Saved

This approach eliminates the need for:
- ❌ Hardcoding field lists for each object
- ❌ Manually maintaining field metadata
- ❌ Different logic for standard vs custom objects
- ❌ Updates when Twenty adds new fields

## Conclusion

By switching from **metadata-based field discovery** to **data schema introspection**, we can access all 29 Company fields (and all fields for any object) dynamically, solving the critical blocker and enabling full CRUD functionality.
