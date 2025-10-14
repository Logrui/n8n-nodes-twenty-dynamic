# Fixes for v0.5.1

## Date: October 14, 2025

### Issues Fixed

#### 1. **SELECT/MULTI_SELECT Dropdown Population Not Working**

**Problem:**
- When selecting a SELECT or MULTI_SELECT field, dropdown options were not populating
- Users saw "No data" or "Error fetching options from Twenty CRM - Dynamic"
- Silent error catching prevented users from seeing what was wrong

**Root Cause:**
- The `getOptionsForSelectField` method was catching all errors and returning empty arrays
- No error messages were being shown to users
- Difficult to diagnose what was failing (Metadata API? GraphQL introspection? Field not found?)

**Fix:**
1. **Better Error Handling:**
   - Removed silent `catch` that returned empty arrays
   - Now throws `NodeOperationError` with descriptive messages
   - Users will see exactly what went wrong

2. **Improved Parameter Validation:**
   - Added check for valid pipe-separated format (`fieldName|fieldType`)
   - Validates that field type is actually `select` or `multiSelect`
   - Better handling when field hasn't been selected yet

3. **Clearer Error Messages:**
   - "No resource selected" - when resource dropdown empty
   - "Invalid field format" - when pipe parsing fails
   - "No options found for field X" - when field exists but has no options
   - "Error fetching options: [message]" - for unexpected errors

**Code Changes:**
```typescript
// BEFORE (Silent failure)
} catch (error) {
    return [];  // ❌ User sees "No data" with no explanation
}

// AFTER (Helpful errors)
} catch (error) {
    if (error instanceof NodeOperationError) {
        throw error;  // ✅ Shows descriptive error message
    }
    throw new NodeOperationError(
        this.getNode(),
        `Error fetching options: ${error.message}`,
    );
}
```

---

#### 2. **Field Names Too Cluttered**

**Problem:**
- Field dropdown showed: `"name (Name) - Twenty Type: TEXT (required)"`
- Parentheses were confusing
- "Twenty Type" prefix was verbose
- Required/optional status cluttered the description

**Fix:**
- **Name:** Changed from `name (Label)` to just `Label` (or `name` if no label)
- **Description:** Changed from `Twenty Type: TEXT (required)` to just `TEXT`

**Before:**
```
Field Name: "name (Name)"
Description: "Twenty Type: TEXT (required)"
```

**After:**
```
Field Name: "Name"
Description: "TEXT"
```

**Code Changes:**
```typescript
// BEFORE
return {
    name: `${field.name} (${field.label})`,
    value: `${field.name}|${n8nType}`,
    description: `Twenty Type: ${field.type}${field.isNullable ? ' (optional)' : ' (required)'}`,
};

// AFTER
return {
    name: field.label || field.name,  // ✅ Just the label
    value: `${field.name}|${n8nType}`,
    description: field.type,  // ✅ Just the type
};
```

---

### Testing

**To verify dropdown fix:**
1. Open n8n and add Twenty CRM node
2. Select an object (e.g., "company")
3. Choose "Create One" operation
4. Add a field
5. Select a SELECT field (e.g., "idealCustomerProfile")
6. The dropdown should now populate with options OR show a clear error message

**Expected behavior:**
- ✅ Dropdown shows options (e.g., "NONE", "SMB", "MID_MARKET", "ENTERPRISE")
- ✅ If no options found, shows helpful error message explaining why

**To verify field name cleanup:**
1. Look at field dropdown
2. Should see clean names like "Name", "Domain Name", "Employees"
3. Descriptions should show just "TEXT", "SELECT", "NUMBER"

---

### Files Modified

1. **nodes/Twenty/Twenty.node.ts**
   - Line 654-656: Field name cleanup
   - Line 699-804: Dropdown error handling improvements

---

### Deployment

**Build:**
```bash
npm run build
```

**Publish:**
```bash
npm version patch  # 0.5.0 → 0.5.1
npm publish
```

---

### Future Improvements (Noted in NOTION_STYLE_IMPROVEMENTS.md)

While fixing these issues, identified additional improvements:
- Resource Locator pattern for better object selection
- listSearch methods for searchable dropdowns
- Simplify option for cleaner responses
- Structured filter/sort builders

See `NOTION_STYLE_IMPROVEMENTS.md` for complete roadmap.

---

**Status:** ✅ Ready to build and publish  
**Version:** 0.5.1 (patch)  
**Impact:** High - Fixes critical UX issues with dropdown population
