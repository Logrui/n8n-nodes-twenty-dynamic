# Implementation Checklist - v0.5.0 Notion-Style Refactoring

**Target**: Fix field type auto-detection and SELECT option loading  
**Pattern**: Based on Notion node implementation  
**Status**: 🟡 Ready to Start

---

## 📋 Quick Reference

### Core Changes Summary
1. **Field values**: `"fieldName"` → `"fieldName|fieldType"`
2. **Field Type param**: `type: 'options'` → `type: 'hidden'` with expression
3. **SELECT loader**: Split pipe value to get name and type

### Estimated Time: 3 hours
- Implementation: 1.5 hours
- Testing: 1 hour
- Documentation: 0.5 hours

---

## Phase 1: Pipe-Separated Field Values (30 min)

### Task 1.1: Add Type Mapping Helper Function
**File**: `Twenty.node.ts`  
**Location**: After line ~700 (after `getFieldsForResource` method)

```typescript
/**
 * Map Twenty CRM field types to n8n field type identifiers
 * @param twentyType The field type from Twenty's schema
 * @returns The corresponding n8n field type identifier
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
        'RELATION': 'relation',
    };
    
    return typeMap[twentyType] || 'simple';
}
```

**Checklist**:
- [ ] Function added after `getFieldsForResource`
- [ ] All Twenty types mapped correctly
- [ ] Default fallback to 'simple'

---

### Task 1.2: Modify getFieldsForResource to Return Pipe-Separated Values
**File**: `Twenty.node.ts`  
**Location**: Lines ~622-670 (inside the map function)

**Find this code**:
```typescript
// Transform to dropdown options with Twenty field type and suggested n8n Field Type
const options: INodePropertyOptions[] = filteredFields.map((field) => {
    // Map Twenty field types to suggested n8n Field Types
    let suggestedFieldType = '';
    switch (field.type) {
        case 'FullName':
            suggestedFieldType = ' ⭐ Use "Full Name"';
            break;
        // ... more cases
    }

    return {
        name: `${field.name} (${field.label})`,
        value: field.name,  // ❌ CHANGE THIS
        description: `Twenty Type: ${field.type}${suggestedFieldType}${field.isNullable ? ' (optional)' : ' (required)'}`,
    };
});
```

**Replace with**:
```typescript
// Transform to dropdown options with embedded type information
const options: INodePropertyOptions[] = filteredFields.map((field) => {
    // Map Twenty type to n8n field type identifier
    const n8nFieldType = mapTwentyTypeToN8nType(field.type);

    return {
        name: `${field.name} (${field.label})`,
        value: `${field.name}|${n8nFieldType}`,  // ✅ Pipe-separated!
        description: `Type: ${field.type}${field.isNullable ? ' (optional)' : ' (required)'}`,
    };
});
```

**Checklist**:
- [ ] Switch statement removed (now handled by helper function)
- [ ] Value changed to `${field.name}|${n8nFieldType}`
- [ ] Description simplified
- [ ] Code compiles without errors

---

### Task 1.3: Test Field Selection
**Test Steps**:
1. [ ] Run `npm run build`
2. [ ] Open n8n in browser
3. [ ] Add Twenty node
4. [ ] Select an object (e.g., "Company")
5. [ ] Click "Add Field"
6. [ ] Open browser console (F12)
7. [ ] Select a field name
8. [ ] Check console - field value should be "fieldName|type" format
9. [ ] Verify no errors in console

**Expected Result**: Field selection works, value format changed but UI still functional

---

## Phase 2: Hidden Field Type (20 min)

### Task 2.1: Convert Field Type to Hidden Field
**File**: `Twenty.node.ts`  
**Location**: Lines ~155-201

**Find this code**:
```typescript
{
    displayName: 'Field Type',
    name: 'fieldType',
    type: 'options',
    options: [
        { name: 'Address (Street, City, State, Etc.)', value: 'address' },
        { name: 'Boolean (True/False)', value: 'boolean' },
        { name: 'Currency (Amount + Currency Code)', value: 'currency' },
        { name: 'Emails (Primary Email Address)', value: 'emails' },
        { name: 'Full Name (First/Last Name)', value: 'fullName' },
        { name: 'Link (URL With Label)', value: 'link' },
        { name: 'Multi-Select (Multiple Choices)', value: 'multiSelect' },
        { name: 'Phones (Primary Phone Details)', value: 'phones' },
        { name: 'Select (Single Choice)', value: 'select' },
        { name: 'Simple Value (Text, Number, Date, Etc.)', value: 'simple' },
    ],
    default: 'simple',
    description: 'The type of field. Check the Field Name description for the recommended type based on Twenty\'s schema.',
},
```

**Replace with**:
```typescript
{
    displayName: 'Field Type',
    name: 'fieldType',
    type: 'hidden',
    default: '={{$parameter["&fieldName"].split("|")[1]}}',
    description: 'Auto-detected field type from Twenty schema',
},
```

**Checklist**:
- [ ] `type` changed from `'options'` to `'hidden'`
- [ ] `options` array removed
- [ ] `default` changed to expression
- [ ] Expression uses `&fieldName` (with ampersand)
- [ ] Code compiles without errors

---

### Task 2.2: Test Auto-Detection
**Test Steps**:
1. [ ] Run `npm run build`
2. [ ] Refresh n8n browser page
3. [ ] Add Twenty node
4. [ ] Select object: "Company"
5. [ ] Click "Add Field"
6. [ ] Select field: "name" (FullName type)
7. [ ] **Verify**: First Name and Last Name inputs appear automatically
8. [ ] Select field: "category" (MULTI_SELECT type)
9. [ ] **Verify**: "Option Names or IDs" dropdown appears
10. [ ] Select field: "idealCustomerProfile" (BOOLEAN type)
11. [ ] **Verify**: True/False dropdown appears

**Expected Result**: Correct input fields appear automatically based on field type

---

## Phase 3: Fix SELECT Options Loading (20 min)

### Task 3.1: Update getOptionsForSelectField Method
**File**: `Twenty.node.ts`  
**Location**: Lines ~704-740

**Find this code**:
```typescript
async getOptionsForSelectField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    try {
        const resource = this.getCurrentNodeParameter('resource') as string;
        if (!resource) {
            return [];
        }

        // Get the field name - in loadOptions context for fixedCollection items,
        // we can access sibling parameters using getCurrentNodeParameter
        const fieldName = this.getCurrentNodeParameter('fieldName') as string;
        
        if (!fieldName) {
            return [];
        }

        // Get full schema to find field options
        const allFields = await getDataSchemaForObject.call(this, resource);
        const selectedField = allFields.find(f => f.name === fieldName);
```

**Replace with**:
```typescript
async getOptionsForSelectField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    try {
        const resource = this.getCurrentNodeParameter('resource') as string;
        if (!resource) {
            return [];
        }

        // Get the pipe-separated field value (fieldName|fieldType)
        const fieldNameWithType = this.getCurrentNodeParameter('fieldName') as string;
        
        if (!fieldNameWithType) {
            return [];
        }

        // Extract field name and type from pipe-separated value
        const [fieldName, fieldType] = fieldNameWithType.split('|');
        
        // Only proceed if this is a SELECT or MULTI_SELECT field
        if (!['select', 'multiSelect'].includes(fieldType)) {
            return [];
        }

        // Get full schema to find field options
        const allFields = await getDataSchemaForObject.call(this, resource);
        const selectedField = allFields.find(f => f.name === fieldName);
```

**Checklist**:
- [ ] Variable renamed to `fieldNameWithType`
- [ ] Added `split('|')` to extract name and type
- [ ] Added type validation check
- [ ] Code compiles without errors

---

### Task 3.2: Test SELECT Options Loading
**Test Steps**:
1. [ ] Run `npm run build`
2. [ ] Refresh n8n browser page
3. [ ] Add Twenty node
4. [ ] Select object: "Company"
5. [ ] Click "Add Field"
6. [ ] Select field: "category" (MULTI_SELECT)
7. [ ] **Verify**: Dropdown shows actual options from Twenty (e.g., Tech, Finance, Healthcare)
8. [ ] **Verify**: Can select multiple options
9. [ ] Try another object: "Opportunity"
10. [ ] Select field: "stage" (SELECT)
11. [ ] **Verify**: Dropdown shows stages (e.g., New, Qualified, Won, Lost)
12. [ ] **Verify**: Can select one option

**Expected Result**: SELECT and MULTI_SELECT dropdowns populate with real data from Twenty CRM

---

## Phase 4: Update Field Transformation (15 min)

### Task 4.1: Handle Pipe-Separated Field Names in Transform
**File**: `FieldTransformation.ts`  
**Location**: Lines ~57-60

**Find this code**:
```typescript
for (const field of fields) {
    const fieldName = field.fieldName;
    const fieldType = field.fieldType || 'simple';
```

**Replace with**:
```typescript
for (const field of fields) {
    // Extract actual field name (remove type suffix if present)
    // This ensures backward compatibility with old workflows
    const fieldName = field.fieldName.includes('|') 
        ? field.fieldName.split('|')[0] 
        : field.fieldName;
    const fieldType = field.fieldType || 'simple';
```

**Checklist**:
- [ ] Added pipe-separator handling
- [ ] Maintains backward compatibility
- [ ] Code compiles without errors

---

### Task 4.2: Test Field Transformation
**Test Steps**:
1. [ ] Run `npm run build`
2. [ ] Refresh n8n browser page
3. [ ] Create test workflow:
   - Trigger: Manual
   - Node 1: Set node with test data
   - Node 2: Twenty node (Create One)
4. [ ] Configure Twenty node:
   - Object: "Company"
   - Add fields:
     * name: "Test Company" (FullName - auto-detected)
     * category: "Tech" (SELECT - auto-detected)
     * idealCustomerProfile: True (BOOLEAN - auto-detected)
5. [ ] Execute workflow
6. [ ] **Verify**: Company created in Twenty CRM
7. [ ] **Verify**: All fields set correctly
8. [ ] Check Twenty CRM UI to confirm data

**Expected Result**: All field types transform correctly and save to Twenty

---

## Phase 5: Code Cleanup (10 min)

### Task 5.1: Remove Unused getFieldTypeOptions Method
**File**: `Twenty.node.ts`  
**Location**: Lines ~745-832 (approximately)

**Find this code block and DELETE IT**:
```typescript
/**
 * Auto-detect field type based on selected field
 * Returns suggested field type options based on Twenty's metadata
 */
async getFieldTypeOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    // ... entire method body ...
}
```

**Checklist**:
- [ ] Entire method deleted (including JSDoc comment)
- [ ] Code compiles without errors
- [ ] No references to this method remain

---

### Task 5.2: Verify No Broken References
**Steps**:
1. [ ] Search codebase for `getFieldTypeOptions`
2. [ ] Verify no other files reference it
3. [ ] Run `npm run build` - should succeed
4. [ ] Run `npm run lint` - should pass

---

## Phase 6: Testing (45 min)

### Test Case 1: Auto-Detection - FullName Field
- [ ] Select Object: "Company"
- [ ] Select Field: "name"
- [ ] **Verify**: First Name and Last Name inputs appear
- [ ] Enter: First Name = "John", Last Name = "Doe"
- [ ] Save and execute
- [ ] **Verify**: Company created with full name in Twenty

---

### Test Case 2: SELECT Field with Options
- [ ] Select Object: "Opportunity"
- [ ] Select Field: "stage"
- [ ] **Verify**: Dropdown appears
- [ ] **Verify**: Options loaded (New, Qualified, etc.)
- [ ] Select: "Qualified"
- [ ] Save and execute
- [ ] **Verify**: Opportunity created with stage in Twenty

---

### Test Case 3: MULTI_SELECT Field with Options
- [ ] Select Object: "Company"
- [ ] Select Field: "category"
- [ ] **Verify**: Multi-select dropdown appears
- [ ] **Verify**: Options loaded (Tech, Finance, etc.)
- [ ] Select multiple: "Tech", "Healthcare"
- [ ] Save and execute
- [ ] **Verify**: Company created with categories in Twenty

---

### Test Case 4: Boolean Field
- [ ] Select Object: "Company"
- [ ] Select Field: "idealCustomerProfile"
- [ ] **Verify**: True/False dropdown appears
- [ ] Select: True
- [ ] Save and execute
- [ ] **Verify**: Company created with ICP=true in Twenty

---

### Test Case 5: Simple Fields (Text, Number)
- [ ] Select Object: "Person"
- [ ] Select Field: "email"
- [ ] **Verify**: Simple text input appears
- [ ] Enter: "john@example.com"
- [ ] Save and execute
- [ ] **Verify**: Person created with email in Twenty

---

### Test Case 6: Multiple Fields Mixed Types
- [ ] Select Object: "Company"
- [ ] Add 4 fields:
  * name: "Acme Corp" (FullName)
  * category: ["Tech"] (MULTI_SELECT)
  * employees: 50 (NUMBER - simple)
  * idealCustomerProfile: true (BOOLEAN)
- [ ] **Verify**: Each field shows correct input type
- [ ] Save and execute
- [ ] **Verify**: All fields saved correctly in Twenty

---

### Test Case 7: Backward Compatibility
- [ ] Load an old workflow (if available) created with v0.4.3
- [ ] **Verify**: Workflow still loads without errors
- [ ] Execute workflow
- [ ] **Verify**: Still works correctly
- [ ] Note: Old workflows won't have auto-detection, but should function

---

## Phase 7: Documentation (30 min)

### Task 7.1: Update README.md
**File**: `README.md`

**Add section**:
```markdown
### v0.5.0 - Automatic Field Type Detection

The Twenty node now automatically detects field types from your Twenty CRM schema:

- **Before**: Select field name → manually select field type → enter value
- **After**: Select field name → enter value (type auto-detected!)

#### SELECT and MULTI_SELECT Fields

SELECT and MULTI_SELECT fields now load options directly from your Twenty CRM:

1. Select a field with SELECT or MULTI_SELECT type
2. A dropdown automatically appears with available options
3. Select your value(s) - no need to type them manually

#### Supported Field Types

All field types are automatically detected:
- Simple fields (Text, Number, Date, etc.)
- Full Name (First/Last name)
- Links (URL with label)
- Currency (Amount + currency code)
- Address (Street, City, State, etc.)
- Emails (Primary email)
- Phones (Phone number details)
- **Boolean (True/False)**
- **SELECT (Single choice)**
- **MULTI_SELECT (Multiple choices)**
```

**Checklist**:
- [ ] New section added
- [ ] Examples updated
- [ ] Screenshots updated (if applicable)

---

### Task 7.2: Update CHANGELOG.md
**File**: `CHANGELOG.md`

**Add at top**:
```markdown
## [0.5.0] - 2025-10-14

### Added
- **Automatic field type detection** based on Twenty CRM schema
- **Dynamic SELECT/MULTI_SELECT option loading** from Twenty CRM
- Boolean field type support for True/False values

### Changed
- Field Type parameter now hidden (auto-detected from schema)
- Simplified user interface - 50% fewer clicks per field
- Field values now embed type information for reliability

### Fixed
- SELECT and MULTI_SELECT dropdowns now populate with actual options from Twenty
- Field type detection now matches Twenty's schema exactly
- Eliminated manual field type selection errors

### Technical
- Implemented Notion-style pipe-separated field values (`fieldName|fieldType`)
- Added expression-based type extraction from field selection
- Improved `getOptionsForSelectField` method with type validation
- Removed obsolete `getFieldTypeOptions` loadOptionsMethod
```

**Checklist**:
- [ ] Version header added
- [ ] All changes documented
- [ ] Breaking changes section (if any)

---

### Task 7.3: Update package.json Version
**File**: `package.json`

**Change**:
```json
{
  "version": "0.5.0",
```

**Checklist**:
- [ ] Version updated to 0.5.0
- [ ] No other changes to package.json

---

## Final Checks

### Build & Publish
- [ ] Run `npm run build` - success
- [ ] Run `npm run lint` - pass
- [ ] Check dist/ folder created correctly
- [ ] Test locally in n8n Docker container
- [ ] Run all 7 test cases - all pass
- [ ] Git commit with message: "feat: implement Notion-style field type auto-detection (v0.5.0)"
- [ ] Git tag: `v0.5.0`
- [ ] Run `npm publish`
- [ ] Verify on npmjs.com

---

### Documentation
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] REFACTORING_PLAN.md saved for reference
- [ ] VISUAL_COMPARISON.md saved for reference
- [ ] NOTION_ANALYSIS.md saved for reference

---

## Success Criteria

✅ **All tests pass**:
- [ ] Test Case 1-7 all successful

✅ **Field type auto-detection works**:
- [ ] No manual type selection needed
- [ ] Correct inputs appear for each type

✅ **SELECT options load**:
- [ ] Single SELECT shows options
- [ ] MULTI_SELECT shows options
- [ ] Options match Twenty CRM data

✅ **No regressions**:
- [ ] All existing field types still work
- [ ] Backward compatibility maintained
- [ ] No errors in console

✅ **Published**:
- [ ] Version 0.5.0 on npm
- [ ] Documentation updated
- [ ] Git tagged

---

## Rollback Plan (If Needed)

If critical issues discovered after publish:

1. **Immediate**:
   ```bash
   npm unpublish n8n-nodes-twenty-dynamic@0.5.0
   npm publish  # Re-publish v0.4.3
   ```

2. **Git**:
   ```bash
   git revert v0.5.0
   git tag v0.4.3-stable
   git push --tags
   ```

3. **Communicate**:
   - Update npm description with notice
   - Create GitHub issue documenting problem
   - Plan fix in v0.5.1

---

**Checklist Created**: 2025-10-14  
**Status**: 🟡 Ready to Begin  
**Estimated Time**: 3 hours total
