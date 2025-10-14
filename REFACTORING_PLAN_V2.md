# Twenty Dynamic Node - UPDATED Refactoring Plan v2

**Date**: 2025-10-14  
**Current Version**: 0.4.3  
**Target Version**: 0.5.0  
**Objective**: Implement Notion-style dynamic field type detection with **dual-source** options loading

---

## 🚨 CRITICAL DISCOVERY: Dual-Source Architecture Required

### Twenty CRM has TWO types of SELECT/MULTI_SELECT fields:

#### 1. **Custom SELECT Fields** (User-Created)
- ✅ Returned by `/metadata` API endpoint
- ✅ Have `options` field with `{id, color, label, value, position}`
- ✅ Example: `job.status` (SELECT with 9 custom options)
- ✅ Full metadata including field ID, labels, colors

#### 2. **Built-in Enum Fields** (System-Defined)
- ❌ **NOT in `/metadata` API** (only shows ~5 fields per object)
- ✅ Only accessible via GraphQL `__type` introspection
- ✅ Example: `company.category` (MULTI_SELECT with 5 enum values)
- ⚠️ No color information (all gray), no field IDs

### Test Results:
- ✅ **test-select-field.js**: `job.status` via Metadata API - PASSED
- ✅ **test-multiselect-field.js**: `company.category` via GraphQL - PASSED  
- ✅ **test-combined-dual-source.js**: Both sources - PASSED

**Conclusion**: We MUST support BOTH sources for complete field coverage.

---

## 📋 Current Implementation Analysis

### What We Have Now (v0.4.3)

#### ✅ Working Components:
1. **Resource Selection**: `loadOptionsMethod: 'getResources'` - ✅ Works perfectly
2. **Field Name Selection**: `loadOptionsMethod: 'getFieldsForResource'` - ✅ Works perfectly
3. **Field Metadata**: We have `field.type` from Twenty's schema
4. **SELECT Options Loading**: `getOptionsForSelectField()` method exists
5. **displayOptions Paths**: Fixed in v0.4.3 (using relative paths)

#### ❌ Problem Areas:
1. **Manual Field Type Selection**: Users must select from 10 field types manually
2. **Type Information Lost**: `getFieldsForResource` returns only `value: fieldName` (not `fieldName|type`)
3. **SELECT Dropdowns Empty**: Options not loading despite correct implementation
4. **Incomplete Field Discovery**: Only finds ~5 fields per object (custom fields only)
5. **No Built-in Enum Support**: Built-in fields like `category` invisible to users

---

## 🎯 Refactoring Goals

### Goal 1: Auto-Detect Field Type ✅
- **Before**: User selects field type manually from dropdown
- **After**: Field type auto-detected from Twenty's schema, hidden from user
- **Benefit**: Eliminates 1 manual step, reduces errors

### Goal 2: Dual-Source Field Discovery ⭐ **NEW**
- **Before**: Only finds custom fields from metadata API (~5 fields per object)
- **After**: Combines metadata API + GraphQL introspection (29+ fields per object)
- **Benefit**: Users can access ALL fields including built-in enums

### Goal 3: Dual-Source Options Loading ⭐ **NEW**
- **Before**: Only tries metadata API, fails for built-in enums
- **After**: Tries metadata API first, falls back to GraphQL introspection
- **Benefit**: SELECT/MULTI_SELECT work for both custom and built-in fields

### Goal 4: Fix SELECT/MULTI_SELECT Option Loading ✅
- **Before**: Dropdowns appear empty
- **After**: Options populate from both sources correctly
- **Benefit**: Users can select from actual values

### Goal 5: Cleaner UX ✅
- **Before**: 4 parameters visible per field (Name, Type, Value inputs)
- **After**: 2 parameters visible (Name, Value) - type hidden
- **Benefit**: Simpler, more intuitive interface

---

## 🔧 Implementation Plan

### Phase 1: Dual-Source Field Discovery ⭐ **CRITICAL**

#### File: `TwentyApi.client.ts`

**Change 1.1**: Add GraphQL introspection capability

**Location**: After existing `queryMetadata()` method

**Add new method**:
```typescript
/**
 * Get GraphQL type schema for a resource
 * Used to discover built-in enum fields not in metadata API
 */
async queryGraphQLType(typeName: string): Promise<any> {
    const query = `
        query GetTypeSchema {
            __type(name: "${typeName}") {
                name
                fields {
                    name
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
    
    return this.graphqlRequest(query);
}

/**
 * Get enum values for a GraphQL enum type
 */
async queryEnumValues(enumName: string): Promise<string[]> {
    const query = `
        query GetEnumValues {
            __type(name: "${enumName}") {
                name
                enumValues {
                    name
                    description
                }
            }
        }
    `;
    
    const result = await this.graphqlRequest(query);
    
    if (result.__type?.enumValues) {
        return result.__type.enumValues.map((v: any) => ({
            name: v.name,
            label: v.name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()),
        }));
    }
    
    return [];
}
```

**Change 1.2**: Update `IFieldMetadata` interface

**Location**: Lines ~9-30

**Add new properties**:
```typescript
export interface IFieldMetadata {
    id: string;
    name: string;
    label: string;
    type: string;
    isNullable: boolean;
    isActive: boolean;
    isCustom: boolean;
    defaultValue: any;
    options?: IFieldOption[];  // Existing
    isBuiltInEnum?: boolean;   // ⭐ NEW
    enumType?: string;         // ⭐ NEW
}
```

---

### Phase 2: Update getFieldsForResource() for Dual-Source

#### File: `Twenty.node.ts`

**Change 2.1**: Modify `getFieldsForResource()` to combine both sources

**Location**: Lines ~620-700

**Current approach** (metadata only):
```typescript
async getFieldsForResource(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const resource = this.getCurrentNodeParameter('resource') as string;
    const apiClient = new TwentyApiClient(this);
    const forceRefresh = this.getCurrentNodeParameter('forceRefresh') as boolean;
    
    const schema = await apiClient.getObjectSchema(resource, forceRefresh);
    // Only returns ~5 custom fields from metadata API
}
```

**New approach** (dual-source):
```typescript
async getFieldsForResource(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const resource = this.getCurrentNodeParameter('resource') as string;
    const apiClient = new TwentyApiClient(this);
    const forceRefresh = this.getCurrentNodeParameter('forceRefresh') as boolean;
    
    // Source 1: Metadata API (custom fields)
    const metadataSchema = await apiClient.getObjectSchema(resource, forceRefresh);
    const metadataFields = metadataSchema.fields?.edges?.map((edge: any) => edge.node) || [];
    
    // Source 2: GraphQL Introspection (built-in enum fields)
    const typeName = resource.charAt(0).toUpperCase() + resource.slice(1);
    const graphqlSchema = await apiClient.queryGraphQLType(typeName);
    const graphqlFields = graphqlSchema.__type?.fields || [];
    
    // Combine and deduplicate
    const fieldMap = new Map<string, any>();
    
    // Add metadata fields (priority - more detailed)
    metadataFields.forEach((field: any) => {
        const n8nType = mapTwentyTypeToN8nType(field.type);
        fieldMap.set(field.name, {
            name: field.name,
            label: field.label,
            type: field.type,
            n8nType,
            options: field.options,
            isCustom: field.isCustom,
            source: 'metadata',
        });
    });
    
    // Add GraphQL fields (fill gaps)
    graphqlFields.forEach((field: any) => {
        if (!fieldMap.has(field.name)) {
            // Check if it's an enum type (SELECT/MULTI_SELECT)
            let n8nType = 'simple';
            let isBuiltInEnum = false;
            let enumType = null;
            
            if (field.type.kind === 'ENUM') {
                n8nType = 'select';
                isBuiltInEnum = true;
                enumType = field.type.name;
            } else if (field.type.kind === 'LIST' && field.type.ofType?.kind === 'ENUM') {
                n8nType = 'multiSelect';
                isBuiltInEnum = true;
                enumType = field.type.ofType.name;
            } else {
                // Map other GraphQL types to n8n types
                n8nType = mapGraphQLTypeToN8nType(field.type);
            }
            
            fieldMap.set(field.name, {
                name: field.name,
                label: field.name.charAt(0).toUpperCase() + field.name.slice(1),
                type: field.type.kind,
                n8nType,
                isBuiltInEnum,
                enumType,
                source: 'graphql',
            });
        }
    });
    
    // Convert to INodePropertyOptions with pipe-separated values
    return Array.from(fieldMap.values())
        .filter(field => field.name !== 'id') // Exclude ID field
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(field => ({
            name: `${field.name} (${field.label})`,
            value: `${field.name}|${field.n8nType}`,  // ✅ Pipe-separated
            description: `Type: ${field.type}${field.isBuiltInEnum ? ' (built-in enum)' : ''}`,
        }));
}
```

**Change 2.2**: Add helper function for GraphQL type mapping

**Add after getFieldsForResource**:
```typescript
/**
 * Map GraphQL type to n8n field type
 */
function mapGraphQLTypeToN8nType(graphqlType: any): string {
    if (graphqlType.kind === 'ENUM') return 'select';
    if (graphqlType.kind === 'LIST' && graphqlType.ofType?.kind === 'ENUM') return 'multiSelect';
    if (graphqlType.kind === 'LIST') return 'simple';
    if (graphqlType.name === 'String') return 'simple';
    if (graphqlType.name === 'Int' || graphqlType.name === 'Float') return 'simple';
    if (graphqlType.name === 'Boolean') return 'boolean';
    if (graphqlType.name === 'DateTime') return 'simple';
    return 'simple';
}
```

**Change 2.3**: Keep existing `mapTwentyTypeToN8nType()` helper

**Add after mapGraphQLTypeToN8nType**:
```typescript
/**
 * Map Twenty metadata type to n8n field type
 */
function mapTwentyTypeToN8nType(twentyType: string): string {
    const typeMap: { [key: string]: string } = {
        'SELECT': 'select',
        'MULTI_SELECT': 'multiSelect',
        'FullName': 'fullName',
        'Links': 'link',
        'Currency': 'currency',
        'Address': 'address',
        'EMAILS': 'emails',
        'PHONES': 'phones',
        'BOOLEAN': 'boolean',
        'TEXT': 'simple',
        'NUMBER': 'simple',
        'DATE_TIME': 'simple',
        'DATE': 'simple',
        'UUID': 'simple',
        'RAW_JSON': 'simple',
        'RELATION': 'relation',
    };
    
    return typeMap[twentyType] || 'simple';
}
```

---

### Phase 3: Convert Field Type to Hidden Parameter

#### File: `Twenty.node.ts`

**Change 3.1**: Update Field Type parameter from `type: 'options'` to `type: 'hidden'`

**Location**: Lines ~155-201

**Before**:
```typescript
{
    displayName: 'Field Type',
    name: 'fieldType',
    type: 'options',  // ❌ Visible dropdown
    default: 'simple',
    options: [
        { name: 'Simple (Text/Number/Date)', value: 'simple' },
        { name: 'SELECT', value: 'select' },
        // ... 8 more options
    ],
    displayOptions: {
        show: {
            '/operation': ['create', 'update'],
            '/resource': ['company', 'person', 'opportunity'],
        },
    },
}
```

**After**:
```typescript
{
    displayName: 'Field Type',
    name: 'fieldType',
    type: 'hidden',  // ✅ Hidden from user
    default: '={{$parameter["&fieldName"].split("|")[1]}}',  // ⭐ Extract from pipe value
    displayOptions: {
        show: {
            '/operation': ['create', 'update'],
            '/resource': ['company', 'person', 'opportunity'],
        },
    },
}
```

**Key changes**:
1. `type: 'hidden'` - User never sees it
2. `default` uses expression to extract type from pipe-separated `fieldName`
3. No more `options` array needed
4. Auto-populated when user selects field name

---

### Phase 4: Update getOptionsForSelectField() for Dual-Source

#### File: `Twenty.node.ts`

**Change 4.1**: Implement dual-source strategy in `getOptionsForSelectField()`

**Location**: Lines ~704-740

**Before** (metadata only):
```typescript
async getOptionsForSelectField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const resource = this.getCurrentNodeParameter('resource') as string;
    const fieldName = this.getCurrentNodeParameter('fieldName') as string;  // ❌ No type info
    
    const apiClient = new TwentyApiClient(this);
    const schema = await apiClient.getObjectSchema(resource, false);
    
    const field = schema.fields?.edges
        ?.map((edge: any) => edge.node)
        .find((f: any) => f.name === fieldName);
    
    if (!field?.options) return [];
    
    // ... transform options
}
```

**After** (dual-source):
```typescript
async getOptionsForSelectField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const resource = this.getCurrentNodeParameter('resource') as string;
    const fieldNameWithType = this.getCurrentNodeParameter('fieldName') as string;
    
    // Extract field name and type from pipe-separated value
    const [fieldName, fieldType] = fieldNameWithType.split('|');
    
    // Validate it's a SELECT type
    if (!['select', 'multiSelect'].includes(fieldType)) {
        return [];
    }
    
    const apiClient = new TwentyApiClient(this);
    
    // Strategy 1: Try Metadata API first (custom SELECT fields)
    const metadataSchema = await apiClient.getObjectSchema(resource, false);
    const metadataField = metadataSchema.fields?.edges
        ?.map((edge: any) => edge.node)
        .find((f: any) => f.name === fieldName);
    
    if (metadataField?.options) {
        // Found in metadata - parse and return
        let options = typeof metadataField.options === 'string' 
            ? JSON.parse(metadataField.options) 
            : metadataField.options;
        
        return options
            .sort((a: any, b: any) => a.position - b.position)
            .map((opt: any) => ({
                name: opt.label,
                value: opt.value,
                description: `Color: ${opt.color}`,
            }));
    }
    
    // Strategy 2: Try GraphQL Introspection (built-in enum fields)
    const typeName = resource.charAt(0).toUpperCase() + resource.slice(1);
    const graphqlSchema = await apiClient.queryGraphQLType(typeName);
    const graphqlField = graphqlSchema.__type?.fields?.find((f: any) => f.name === fieldName);
    
    if (graphqlField) {
        // Check if it's an enum type
        let enumTypeName = null;
        
        if (graphqlField.type.kind === 'ENUM') {
            enumTypeName = graphqlField.type.name;
        } else if (graphqlField.type.kind === 'LIST' && graphqlField.type.ofType?.kind === 'ENUM') {
            enumTypeName = graphqlField.type.ofType.name;
        }
        
        if (enumTypeName) {
            // Get enum values
            const enumValues = await apiClient.queryEnumValues(enumTypeName);
            
            return enumValues.map((enumValue: any) => ({
                name: enumValue.label,
                value: enumValue.name,
                description: 'Built-in enum value',
            }));
        }
    }
    
    // No options found from either source
    return [];
}
```

**Key changes**:
1. Extract `fieldName` and `fieldType` from pipe-separated value
2. Try metadata API first (faster, has colors)
3. Fall back to GraphQL introspection (slower, no colors)
4. Handle both SELECT and MULTI_SELECT identically
5. Return empty array if field not found or not SELECT type

---

### Phase 5: Update Field Transformation

#### File: `FieldTransformation.ts`

**Change 5.1**: Handle pipe-separated field names in `transformFieldsData()`

**Location**: Lines ~57-60

**Before**:
```typescript
for (const field of fieldsData) {
    const fieldName = field.fieldName;  // ❌ Assumes plain name
    const fieldType = field.fieldType;
```

**After**:
```typescript
for (const field of fieldsData) {
    // Handle backward compatibility: support both pipe-separated and plain names
    const fieldNameRaw = field.fieldName;
    const fieldName = fieldNameRaw.includes('|') 
        ? fieldNameRaw.split('|')[0]  // ✅ Extract name from "name|type"
        : fieldNameRaw;                // Legacy: plain name
    
    const fieldType = field.fieldType;
```

**Key changes**:
1. Check if `fieldName` contains pipe separator
2. Extract just the name part if pipe-separated
3. Maintain backward compatibility with old workflows

---

### Phase 6: Code Cleanup

#### File: `Twenty.node.ts`

**Change 6.1**: Remove obsolete `getFieldTypeOptions()` method

**Location**: Lines ~745-832

**Action**: Delete entire method (no longer needed with hidden field type)

**Change 6.2**: Update imports

**Location**: Top of file

**Add**:
```typescript
// No new imports needed - using existing ILoadOptionsFunctions
```

---

## 🧪 Testing Plan

### Test Case 1: Custom SELECT Field (job.status)
✅ Already validated in `test-select-field.js`
- Source: Metadata API
- 9 options with colors
- Pipe-separated value works
- Transformation successful

### Test Case 2: Built-in MULTI_SELECT Field (company.category)
✅ Already validated in `test-multiselect-field.js`
- Source: GraphQL Introspection
- 5 enum values
- Pipe-separated value works
- Transformation successful

### Test Case 3: Dual-Source Strategy
✅ Already validated in `test-combined-dual-source.js`
- Both sources working together
- Metadata API tried first
- GraphQL fallback successful
- All fields discoverable

### Test Case 4: Field Discovery
- [ ] List fields for Company - should show 29+ fields (not just 5)
- [ ] List fields for Job - should show all fields
- [ ] Verify built-in enums included (category, etc.)

### Test Case 5: SELECT Options Loading
- [ ] Select `job.status` - options should populate from metadata
- [ ] Select `company.category` - options should populate from GraphQL
- [ ] Both should show in dropdown correctly

### Test Case 6: Field Type Auto-Detection
- [ ] Select a field - type should auto-populate (hidden)
- [ ] Correct input should appear (multiSelect for category, select for status)
- [ ] No manual type selection needed

### Test Case 7: Backward Compatibility
- [ ] Existing workflows with plain field names still work
- [ ] Field transformation handles both formats
- [ ] No breaking changes for users

---

## 📦 Success Criteria

### Must Have ✅
- [x] Both metadata API and GraphQL introspection working
- [x] Dual-source field discovery (29+ fields per object)
- [x] Dual-source options loading (custom + built-in enums)
- [ ] Field type auto-detection (hidden parameter)
- [ ] Pipe-separated values implemented
- [ ] SELECT/MULTI_SELECT options populating correctly
- [ ] Backward compatibility maintained

### Nice to Have 🎯
- [ ] Cache GraphQL introspection results (10-minute TTL like metadata)
- [ ] Better enum value labels (convert SNAKE_CASE to Title Case)
- [ ] Field categorization in dropdown (Built-in vs Custom)
- [ ] Performance optimization for large schemas

---

## ⏱️ Time Estimates

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 1 | Dual-source discovery in TwentyApi.client.ts | 45 min |
| 2 | Update getFieldsForResource() | 30 min |
| 3 | Convert Field Type to hidden | 20 min |
| 4 | Update getOptionsForSelectField() | 30 min |
| 5 | Field transformation updates | 15 min |
| 6 | Code cleanup | 10 min |
| **Total** | **Implementation** | **~2.5 hours** |
| Testing | All 7 test cases | 1 hour |
| **Grand Total** | | **~3.5 hours** |

---

## 🔄 Rollback Plan

If issues arise:

1. **Revert to v0.4.3**: `git checkout v0.4.3`
2. **Incremental rollback**: Revert phases in reverse order
3. **Metadata-only mode**: Comment out GraphQL introspection, use metadata only
4. **Emergency fix**: Convert hidden field type back to visible dropdown

---

## 📝 Documentation Updates

### README.md
- [ ] Add note about dual-source field discovery
- [ ] Update field count (29+ fields instead of 5)
- [ ] Explain built-in enum support
- [ ] Add troubleshooting section

### CHANGELOG.md
- [ ] Document v0.5.0 changes
- [ ] Note dual-source architecture
- [ ] Mention improved field coverage
- [ ] List breaking changes (if any)

---

## 🚀 Deployment Steps

1. **Implement changes** (Phases 1-6)
2. **Run all tests** (7 test cases)
3. **Manual testing** with real Twenty instance
4. **Update version** in `package.json` to `0.5.0`
5. **Build**: `npm run build`
6. **Test locally** in n8n
7. **Commit**: `git commit -m "v0.5.0: Dual-source field discovery + Notion-style UX"`
8. **Tag**: `git tag v0.5.0`
9. **Publish**: `npm publish`
10. **Docker test**: Verify in n8n Docker container

---

## 💡 Key Learnings from Testing

1. **Twenty has dual architecture**:
   - Metadata API: Custom user-created fields (~5 per object)
   - GraphQL: All fields including built-in enums (~29 per object)

2. **Built-in enums are invisible** to metadata API:
   - Cannot be discovered via `/metadata` endpoint
   - Must use `__type` introspection query
   - Includes critical fields like `company.category`

3. **Options have different formats**:
   - Metadata: `{id, color, label, value, position}` (rich)
   - GraphQL: `{name, description}` (basic)
   - Both transform to n8n format successfully

4. **Performance considerations**:
   - Metadata API: Fast, cached
   - GraphQL introspection: Slower, not cached (yet)
   - Need to cache GraphQL results for production

---

**Ready to implement!** 🎉

All tests passing, dual-source strategy validated, plan complete.
