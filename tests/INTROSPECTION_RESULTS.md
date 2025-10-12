# Company vs People Introspection Results

**Test Date:** October 12, 2025  
**Twenty Instance:** https://twenty.envisicapital.com  
**Test Script:** `introspect-company-vs-people.js`

## 🎯 Executive Summary

**CRITICAL FINDING:** The `/metadata` endpoint only returns **custom fields**, NOT standard fields like `id`, `name`, `createdAt`, etc.

This means our assumptions about FULL_NAME fields were **INCORRECT**.

## 📊 Metadata Results

### Company Object
- **Total Fields Returned:** 8 (custom fields only)
- **Complex Field Types Found:**
  - ✅ **LINKS:** 1 field (`domainName`)
  - ✅ **CURRENCY:** 1 field (`annualRecurringRevenue`)
  - ✅ **ADDRESS:** 1 field (`address`)
  - ❌ **FULL_NAME:** 0 fields

### People Object
- **Total Fields Returned:** 9 (custom fields only)
- **Complex Field Types Found:**
  - ✅ **LINKS:** 1 field (`linkedinLink`)
  - ❌ **CURRENCY:** 0 fields
  - ❌ **ADDRESS:** 0 fields
  - ❌ **FULL_NAME:** 0 fields
- **Notable:** `fullName` exists but is type `TEXT`, NOT `FULL_NAME`!

## 🔍 Key Discoveries

### 1. No FULL_NAME Type Exists in Metadata
- **People** has a `fullName` field, but it's type `TEXT`
- **Company** has NO `name` field in metadata at all
- **Conclusion:** The FULL_NAME complex type doesn't exist in your Twenty instance's custom fields

### 2. Missing Standard Fields
The metadata endpoint doesn't return standard fields like:
- `id` - Record identifier
- `name` - Object name (for Company)
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp (except in People where it's custom?)
- `deletedAt` - Deletion timestamp

### 3. People's fullName is Just TEXT
```json
{
  "id": "96352da8-6727-48ed-810d-20f6921a5b46",
  "name": "fullName",
  "label": "Full Name",
  "type": "TEXT",  // ← NOT FULL_NAME!
  "isNullable": false,
  "defaultValue": "''"
}
```

This means it's a simple string field, not a complex object with firstName/lastName.

## ⚠️ Impact on n8n Node

### Current Implementation Issues

**FieldParameters.ts currently defines:**
```typescript
export const fullNameFields: INodeProperties[] = [
  {
    displayName: 'First Name',
    name: 'firstName',
    displayOptions: {
      show: { fieldName: ['name', 'pointOfContact'] }
    }
  },
  {
    displayName: 'Last Name',
    name: 'lastName',
    displayOptions: {
      show: { fieldName: ['name', 'pointOfContact'] }
    }
  }
];
```

**Problems:**
1. **`name` field doesn't exist in metadata** (neither Company nor People)
2. **`pointOfContact` doesn't exist** in either object
3. **`fullName` is TEXT, not FULL_NAME** - should be a simple string input
4. **These fields won't appear in the dynamic field dropdown** because they're not in metadata

### What Actually Exists

**Company Complex Fields:**
- ✅ `domainName` (LINKS) - URL field
- ✅ `annualRecurringRevenue` (CURRENCY) - Amount + currency code
- ✅ `address` (ADDRESS) - Full address object

**People Complex Fields:**
- ✅ `linkedinLink` (LINKS) - URL field
- ❌ No CURRENCY fields
- ❌ No ADDRESS fields

**People Simple Fields:**
- `fullName` (TEXT) - Simple string, not firstName/lastName
- `notes` (TEXT)
- `city` (TEXT)
- `emails` (EMAILS) - Complex but different type
- `category` (MULTI_SELECT)

## 💡 Recommendations

### Option 1: Remove FULL_NAME Parameters (Recommended)
Since FULL_NAME complex type doesn't exist in your Twenty instance:

1. **Remove** `fullNameFields` from `FieldParameters.ts`
2. **Remove** `name` and `pointOfContact` from `getComplexFieldNames()`
3. **Remove** FULL_NAME handling from `FieldTransformation.ts`
4. Let `fullName` in People be handled as a simple TEXT field

### Option 2: Keep FULL_NAME for Future Custom Fields
If users might create custom FULL_NAME fields:

1. Keep the FULL_NAME parameters but don't hardcode field names
2. Dynamically detect FULL_NAME type fields from metadata
3. Only show firstName/lastName inputs for fields with `type: "FULL_NAME"`

### Option 3: Make Field Parameters Fully Dynamic
Query the metadata to determine which fields are complex:

```typescript
// Pseudo-code
async function getComplexFieldNames(resource, credentials) {
  const metadata = await getObjectMetadata(resource);
  const complexFields = metadata.fields
    .filter(f => ['LINKS', 'CURRENCY', 'ADDRESS', 'FULL_NAME'].includes(f.type))
    .map(f => f.name);
  return complexFields;
}
```

## 📋 Action Items

### Immediate (v0.3.2):
1. ✅ Run introspection script to confirm findings
2. ⚠️ Remove or fix FULL_NAME field parameters
3. ⚠️ Update `getComplexFieldNames()` to only include fields that exist:
   ```typescript
   // Current (WRONG):
   ['name', 'pointOfContact', 'domainName', ...]
   
   // Should be (for your instance):
   ['domainName', 'annualRecurringRevenue', 'address', 'linkedinLink']
   ```
4. ⚠️ Remove FULL_NAME transformation from `FieldTransformation.ts`

### Short-term (v0.4.0):
1. Make field parameters resource-aware
2. Query metadata to determine complex field types dynamically
3. Only show complex field inputs for fields that actually have those types

### Long-term (v1.0.0):
1. Implement fully dynamic field parameter generation
2. Support all complex types (EMAILS, PHONES, RATING, etc.)
3. Add field type detection and validation

## 🧪 Testing Recommendations

### Test with Real Data:
1. Create a Company with `domainName`, `annualRecurringRevenue`, `address`
2. Create a Person with `fullName` (as simple text), `linkedinLink`
3. Verify field inputs match the actual field types
4. Check GraphQL mutations are correct

### Validate Field Types:
```bash
# Check what fields are actually available
npm run test:data-introspect

# Test creating records with complex fields
npm run test:create
```

## 📎 Attachments

- **Full Introspection Report:** `introspect-report.json`
- **Test Script:** `introspect-company-vs-people.js`
- **Console Output:** See above

## 🎓 Lessons Learned

1. **Never assume field types** - always query metadata first
2. **Metadata endpoint shows custom fields only** - standard fields are hidden
3. **Field types vary by instance** - what exists in one Twenty instance may not exist in another
4. **Dynamic discovery is better than hardcoding** - query metadata instead of assuming field names
5. **Test with real data** - introspection reveals the truth!

---

**Next Steps:** Update `FieldParameters.ts` to remove non-existent FULL_NAME fields and align with actual metadata from your Twenty instance.
