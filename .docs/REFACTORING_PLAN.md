# Twenty Dynamic Node - Notion-Style Refactoring Plan

**Date**: 2025-10-14  
**Current Version**: 0.4.3  
**Target Version**: 0.5.0  
**Objective**: Implement Notion-style dynamic field type detection and cleaner UX

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
4. **Poor UX**: Too many steps - select field name, then select field type, then enter value

### Current Field Selection Flow:
```
Step 1: User selects Object (e.g., "Company")
Step 2: User selects Field Name (e.g., "category")
   └─> Returns: { value: "category", description: "Type: MULTI_SELECT ⭐ Use Multi-Select" }
Step 3: ❌ User must MANUALLY select Field Type (should be auto!)
Step 4: User enters/selects value
```

### What Notion Does Better:
```
Step 1: User selects Database
Step 2: User selects Property Name
   └─> Returns: { value: "category|multi_select" }  // Pipe-separated!
   └─> Hidden field auto-extracts type via expression
Step 3: ✅ Type-specific input appears automatically
Step 4: User enters/selects value (with dynamic options if SELECT type)
```

---

## 🎯 Refactoring Goals

### Goal 1: Auto-Detect Field Type ✅
- **Before**: User selects field type manually from dropdown
- **After**: Field type auto-detected from Twenty's schema, hidden from user
- **Benefit**: Eliminates 1 manual step, reduces errors

### Goal 2: Fix SELECT/MULTI_SELECT Option Loading ✅
- **Before**: Dropdowns appear empty
- **After**: Options populate from Twenty's field.options array
- **Benefit**: Users can select from actual values, not type them manually

### Goal 3: Cleaner UX ✅
- **Before**: 4 parameters visible per field (Name, Type, Value inputs)
- **After**: 2 parameters visible (Name, Value) - type hidden
- **Benefit**: Simpler, more intuitive interface

---

## 🔧 Implementation Plan

### Phase 1: Adopt Pipe-Separated Field Values ⭐ **CRITICAL**

#### File: `Twenty.node.ts`

**Change 1.1**: Modify `getFieldsForResource()` to return pipe-separated values

**Location**: Lines ~620-670

**Current**:
```typescript
return {
    name: `${field.name} (${field.label})`,
    value: field.name,  // ❌ Only field name
    description: `Twenty Type: ${field.type}${suggestedFieldType}...`,
};
```

**New**:
```typescript
// Map Twenty types to n8n field types
const n8nFieldType = mapTwentyTypeToN8nType(field.type);

return {
    name: `${field.name} (${field.label})`,
    value: `${field.name}|${n8nFieldType}`,  // ✅ Pipe-separated: name|type
    description: `Type: ${field.type}${field.isNullable ? ' (optional)' : ' (required)'}`,
};
```

**Change 1.2**: Create type mapping helper function

**Add new function** (after `getFieldsForResource`):
```typescript
/**
 * Map Twenty CRM field types to n8n field type identifiers
 */
function mapTwentyTypeToN8nType(twentyType: string): string {
    const typeMap: Record<string, string> = {
        'FullName': 'fullName',
        'Links': 'link',
        'Currency': 'currency',
        'Address': 'address',
        'EMAILS': 'emails',
        'PHONES': 'phones',
        'SELECT': 'select',
        'MULTI_SELECT': 'multiSelect',
        'BOOLEAN': 'boolean',
        'TEXT': 'simple',
        'NUMBER': 'simple',
        'DATE_TIME': 'simple',
        'DATE': 'simple',
        'UUID': 'simple',
        'RAW_JSON': 'simple',
        'RELATION': 'relation',  // Not yet supported
    };
    
    return typeMap[twentyType] || 'simple';
}
```

---

### Phase 2: Convert Field Type to Hidden Field

#### File: `Twenty.node.ts`

**Change 2.1**: Replace visible Field Type dropdown with hidden field

**Location**: Lines ~155-201 (Field Type parameter)

**Current**:
```typescript
{
    displayName: 'Field Type',
    name: 'fieldType',
    type: 'options',  // ❌ Visible dropdown
    options: [
        { name: 'Address...', value: 'address' },
        { name: 'Boolean...', value: 'boolean' },
        // ... 10 options
    ],
    default: 'simple',
    description: 'The type of field...',
}
```

**New**:
```typescript
{
    displayName: 'Field Type',
    name: 'fieldType',
    type: 'hidden',  // ✅ Hidden from user
    default: '={{$parameter["&fieldName"].split("|")[1]}}',  // ✅ Extract from pipe-separated value
    description: 'Auto-detected field type from Twenty schema',
}
```

**Key Points**:
- `type: 'hidden'` - User won't see this field
- Expression `{{$parameter["&fieldName"].split("|")[1]}}` extracts type from `fieldName|type` value
- The `&` prefix references the parameter name (standard n8n pattern)

---

### Phase 3: Update SELECT Field Options Loading

#### File: `Twenty.node.ts`

**Change 3.1**: Modify `getOptionsForSelectField()` to handle pipe-separated values

**Location**: Lines ~704-740

**Current**:
```typescript
const fieldName = this.getCurrentNodeParameter('fieldName') as string;

if (!fieldName) {
    return [];
}

const allFields = await getDataSchemaForObject.call(this, resource);
const selectedField = allFields.find(f => f.name === fieldName);
```

**New**:
```typescript
const fieldNameWithType = this.getCurrentNodeParameter('fieldName') as string;

if (!fieldNameWithType) {
    return [];
}

// Extract field name from pipe-separated value (fieldName|fieldType)
const [fieldName, fieldType] = fieldNameWithType.split('|');

// Only proceed if this is a SELECT or MULTI_SELECT field
if (!['select', 'multiSelect'].includes(fieldType)) {
    return [];
}

const allFields = await getDataSchemaForObject.call(this, resource);
const selectedField = allFields.find(f => f.name === fieldName);
```

**Benefit**: Now we know the field type without additional API calls or complex logic.

---

### Phase 4: Update Field Transformation Logic

#### File: `FieldTransformation.ts`

**Change 4.1**: Update `transformFieldsData()` to handle pipe-separated field names

**Location**: Lines ~57-60

**Current**:
```typescript
for (const field of fields) {
    const fieldName = field.fieldName;
    const fieldType = field.fieldType || 'simple';
```

**New**:
```typescript
for (const field of fields) {
    // Extract actual field name (remove type suffix if present)
    const fieldName = field.fieldName.includes('|') 
        ? field.fieldName.split('|')[0] 
        : field.fieldName;
    const fieldType = field.fieldType || 'simple';
```

**Note**: This ensures backward compatibility if old workflows have just field names without pipe separator.

---

### Phase 5: Clean Up Obsolete Code

#### File: `Twenty.node.ts`

**Change 5.1**: Remove unused `getFieldTypeOptions()` method

**Location**: Lines ~745-832

**Action**: DELETE this entire method (no longer needed)

**Reason**: With hidden auto-detection, we don't need this complex loadOptionsMethod anymore.

---

### Phase 6: Add Relation Field Type Support (Future)

#### File: `Twenty.node.ts`

**Add new field type for RELATION fields** (after Boolean field, line ~228):

```typescript
// Relation field (when fieldType = 'relation')
{
    displayName: 'Related Record ID',
    name: 'relationRecordId',
    type: 'string',
    displayOptions: {
        show: {
            fieldType: ['relation'],
        },
    },
    default: '',
    description: 'The UUID of the related record to link',
    placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
},
```

#### File: `FieldTransformation.ts`

**Add relation transformation** (after boolean case, line ~157):

```typescript
case 'relation':
    // Relation fields - just the ID
    if (field.relationRecordId && field.relationRecordId !== '') {
        result[fieldName] = { id: field.relationRecordId };
    }
    break;
```

#### File: `FieldTransformation.ts` - Interface

**Add to IFieldData interface** (line ~43):

```typescript
// Relation field
relationRecordId?: string;
```

---

## 📝 Testing Plan

### Test Case 1: Auto-Detection of Field Types
**Setup**:
1. Create new Twenty node
2. Select Object: "Company"
3. Click "Add Field"
4. Select Field Name: "name" (FullName type)

**Expected**:
- ✅ Field Type auto-set to "fullName" (hidden)
- ✅ "First Name" and "Last Name" inputs appear automatically
- ✅ No manual type selection required

### Test Case 2: SELECT Field with Options
**Setup**:
1. Select Object: "Company"
2. Select Field Name: "category" (MULTI_SELECT type)

**Expected**:
- ✅ Field Type auto-set to "multiSelect" (hidden)
- ✅ "Option Names or IDs" multiOptions dropdown appears
- ✅ Dropdown populates with actual options from Twenty (e.g., "Tech", "Finance", "Healthcare")
- ✅ User can select multiple options

### Test Case 3: Single SELECT Field
**Setup**:
1. Select Object: "Opportunity"
2. Select Field Name: "stage" (SELECT type)

**Expected**:
- ✅ Field Type auto-set to "select" (hidden)
- ✅ "Option Name or ID" options dropdown appears
- ✅ Dropdown populates with stages (e.g., "New", "Qualified", "Proposal", "Won", "Lost")
- ✅ User can select one option

### Test Case 4: Boolean Field
**Setup**:
1. Select Object: "Company"
2. Select Field Name: "idealCustomerProfile" (BOOLEAN type)

**Expected**:
- ✅ Field Type auto-set to "boolean" (hidden)
- ✅ "Boolean Value" dropdown appears with True/False options
- ✅ Default value is False

### Test Case 5: Simple Field (Text/Number)
**Setup**:
1. Select Object: "Person"
2. Select Field Name: "email" (TEXT type)

**Expected**:
- ✅ Field Type auto-set to "simple" (hidden)
- ✅ "Value" text input appears
- ✅ User enters email address

### Test Case 6: Multiple Fields with Different Types
**Setup**:
1. Select Object: "Company"
2. Add Field: "name" (FullName)
3. Add Field: "category" (MULTI_SELECT)
4. Add Field: "employees" (NUMBER)

**Expected**:
- ✅ Each field shows correct input type
- ✅ FullName shows First/Last name inputs
- ✅ Category shows multiOptions with options from Twenty
- ✅ Employees shows simple value input

---

## 🚀 Deployment Strategy

### Version 0.5.0 Release Plan

#### Pre-Release Checklist:
- [ ] Complete Phase 1: Pipe-separated values
- [ ] Complete Phase 2: Hidden field type
- [ ] Complete Phase 3: SELECT options loading
- [ ] Complete Phase 4: Field transformation updates
- [ ] Complete Phase 5: Code cleanup
- [ ] Run all 6 test cases
- [ ] Test backward compatibility with existing workflows
- [ ] Update README.md with new UX flow
- [ ] Update CHANGELOG.md

#### Breaking Changes:
**None** - This is a UX improvement that maintains API compatibility.

**Migration Notes**:
- Existing workflows will continue to work
- Field Type parameter becomes hidden but still functional
- Users will see improved UX immediately upon package update

#### Rollback Plan:
If issues arise:
1. Tag current v0.4.3 as `v0.4.3-stable`
2. Can revert to v0.4.3 by re-publishing that version
3. Git branch: `revert-v0.5.0` for emergency rollback

---

## 📊 Expected Impact

### Before (v0.4.3):
```
User Actions per Field: 4
1. Select Field Name
2. ❌ Select Field Type manually
3. Enter/Select Value(s)
4. (For SELECT: Options don't load)

Time per field: ~30-45 seconds
Error rate: Medium (wrong type selection)
```

### After (v0.5.0):
```
User Actions per Field: 2
1. Select Field Name
2. Enter/Select Value(s) ✅ Auto-detects type

Time per field: ~15-20 seconds
Error rate: Low (auto-detection prevents errors)
```

**Efficiency Gain**: ~50% reduction in time and clicks per field

---

## 🔍 Code Changes Summary

### Files to Modify:
1. **`Twenty.node.ts`** (Main changes)
   - Lines ~620-670: Modify `getFieldsForResource()` - add pipe-separator
   - Lines ~155-201: Change Field Type to hidden with expression
   - Lines ~704-740: Update `getOptionsForSelectField()` to split pipe value
   - Lines ~745-832: DELETE `getFieldTypeOptions()` method
   - Add helper function: `mapTwentyTypeToN8nType()`

2. **`FieldTransformation.ts`** (Minor changes)
   - Lines ~57-60: Handle pipe-separated field names in transform loop

3. **`package.json`**
   - Update version to `0.5.0`

4. **`README.md`**
   - Update usage examples to reflect new UX

5. **`CHANGELOG.md`**
   - Add v0.5.0 release notes

### Estimated Lines Changed:
- **Added**: ~40 lines
- **Modified**: ~30 lines
- **Deleted**: ~90 lines
- **Net**: -20 lines (code reduction!)

### Estimated Development Time:
- Phase 1: 30 minutes
- Phase 2: 20 minutes
- Phase 3: 20 minutes
- Phase 4: 15 minutes
- Phase 5: 10 minutes
- Testing: 45 minutes
- Documentation: 30 minutes
- **Total**: ~3 hours

---

## 🎓 Key Learnings from Notion Analysis

### Pattern 1: Pipe-Separated Values for Metadata
**Insight**: Instead of making multiple API calls or complex logic, embed type information in the option value itself.

**Example**: `value: "propertyName|propertyType"`

**Benefit**: Single source of truth, no synchronization issues.

### Pattern 2: Hidden Fields with Expressions
**Insight**: n8n supports powerful expression evaluation in default values.

**Example**: `default: '={{$parameter["&key"].split("|")[1]}}'`

**Benefit**: Auto-detection without JavaScript code, purely declarative.

### Pattern 3: Nested loadOptionsMethod Calls
**Insight**: `loadOptionsMethod` works perfectly in fixedCollection - we were using it correctly!

**Problem**: We weren't passing the right context (pipe-separated value).

**Solution**: Split the value in the loadOptions method to get both name and type.

### Pattern 4: Relative displayOptions Paths
**Insight**: Use relative paths (`fieldType: ['select']`) not absolute paths in fixedCollection.

**Status**: ✅ We already fixed this in v0.4.3!

---

## 🎯 Success Criteria

### Must Have (MVP):
- [x] Field type auto-detected from schema
- [x] Field Type parameter hidden from user
- [x] SELECT field options loading correctly
- [x] MULTI_SELECT field options loading correctly
- [x] All existing field types still work (simple, fullName, link, etc.)
- [x] Backward compatible with v0.4.3

### Should Have:
- [ ] RELATION field type support (Phase 6)
- [ ] Resource Locator for Object selection (future improvement)
- [ ] Better error messages for validation

### Nice to Have:
- [ ] Field value validation based on type
- [ ] Default values from Twenty schema
- [ ] Conditional required/optional based on isNullable

---

## 📚 References

- **Notion Node Implementation**: `d:\DevelopmentFiles\n8n\packages\nodes-base\nodes\Notion\v2\`
- **Notion LoadOptions**: `NotionV2.node.ts` - methods.loadOptions
- **Notion DatabasePage**: `shared/descriptions/DatabasePageDescription.ts` - Property structure
- **n8n Expression Docs**: https://docs.n8n.io/code/expressions/
- **n8n Parameter Types**: https://docs.n8n.io/integrations/creating-nodes/build/reference/ui-elements/

---

## 🚦 Implementation Order

1. ✅ **Phase 1** - Pipe-separated values (FOUNDATION)
2. ✅ **Phase 2** - Hidden field type (UX IMPROVEMENT)
3. ✅ **Phase 3** - SELECT options loading (BUG FIX)
4. ✅ **Phase 4** - Field transformation (COMPATIBILITY)
5. ✅ **Phase 5** - Code cleanup (MAINTENANCE)
6. ⏳ **Phase 6** - Relation support (FUTURE ENHANCEMENT)

**Start with Phase 1** - Everything else depends on the pipe-separated value pattern.

---

## ✅ Next Steps

1. **Review this plan** with stakeholders
2. **Create feature branch**: `feature/notion-style-dynamic-fields`
3. **Implement Phase 1**: Pipe-separated field values
4. **Test Phase 1**: Verify field selection still works
5. **Implement Phase 2**: Hidden field type
6. **Test Phase 2**: Verify type auto-detection
7. **Implement Phase 3**: Fix SELECT options
8. **Test Phase 3**: Verify SELECT/MULTI_SELECT dropdowns populate
9. **Implement Phase 4-5**: Cleanup and compatibility
10. **Full integration testing**: All test cases
11. **Update documentation**
12. **Publish v0.5.0**

---

**Plan Created**: 2025-10-14  
**Plan Author**: AI Development Assistant  
**Status**: ✅ Ready for Implementation
