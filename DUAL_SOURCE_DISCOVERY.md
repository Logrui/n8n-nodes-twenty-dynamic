# 🚨 CRITICAL DISCOVERY: Dual-Source Architecture Required

**Date:** 2025-10-14  
**Impact:** HIGH - Refactoring plan must be updated  
**Status:** Validated with tests ✅

---

## TL;DR

Twenty CRM stores field data in **TWO separate places**:
1. **Metadata API** - Custom user fields only (~5 per object)
2. **GraphQL Introspection** - ALL fields including built-ins (~29 per object)

**The `company.category` field (MULTI_SELECT) only exists in GraphQL, NOT in metadata API!**

This means our refactoring MUST support **dual-source field discovery** and **dual-source options loading**.

---

## The Problem

### What We Thought:
```
Metadata API (/metadata) → Returns ALL fields → Use for everything ✅
```

### What's Actually True:
```
Metadata API (/metadata) → Returns only CUSTOM fields (~5) 😱
GraphQL Introspection     → Returns ALL fields (29+) including built-ins ✅
```

---

## Test Results

### Test 1: job.status (Custom SELECT)
- ✅ Found in Metadata API
- ✅ 9 options with colors
- ✅ Rich metadata: `{id, color, label, value, position}`
- **Source:** `/metadata` endpoint

### Test 2: company.category (Built-in MULTI_SELECT)
- ❌ **NOT in Metadata API**
- ✅ Found via GraphQL `__type` query
- ✅ 5 enum values (VENTURE_FIRM, STARTUP, etc.)
- **Source:** GraphQL introspection

### Test 3: Combined Strategy
- ✅ Try Metadata API first → Works for custom fields
- ✅ Fall back to GraphQL → Works for built-in fields
- ✅ Both transform to n8n format successfully

---

## Impact on Refactoring

### Original Plan (Metadata Only):
```typescript
// ❌ This misses built-in fields!
const fields = await getFieldsFromMetadataAPI(resource);
// Only returns ~5 fields per object
```

### Updated Plan (Dual-Source):
```typescript
// ✅ This finds ALL fields
const metadataFields = await getFieldsFromMetadataAPI(resource);  // ~5 fields
const graphqlFields = await getFieldsFromGraphQL(resource);       // ~29 fields
const allFields = mergeAndDeduplicate(metadataFields, graphqlFields);
// Now returns ALL fields!
```

---

## What Changed

### Updated Files:

1. **REFACTORING_PLAN_V2.md** (NEW)
   - Phase 1: Dual-source field discovery
   - Phase 4: Dual-source options loading
   - GraphQL introspection methods
   - Time estimate: 3.5 hours (up from 3 hours)

2. **TEST_RESULTS_SUMMARY.md** (UPDATED)
   - Documents dual-source architecture
   - Shows both test results
   - Confirms strategy works

3. **Test Files Created:**
   - `test-select-field.js` - Custom SELECT (job.status) ✅
   - `test-multiselect-field.js` - Built-in MULTI_SELECT (company.category) ✅
   - `test-combined-dual-source.js` - Dual-source strategy ✅

---

## What to Implement

### TwentyApi.client.ts - Add Methods:
```typescript
async queryGraphQLType(typeName: string) {
    // Get GraphQL type schema
}

async queryEnumValues(enumName: string) {
    // Get enum values for SELECT/MULTI_SELECT
}
```

### Twenty.node.ts - Update Methods:
```typescript
async getFieldsForResource() {
    // Query BOTH metadata API and GraphQL
    // Merge results
    // Return pipe-separated values
}

async getOptionsForSelectField() {
    // Try metadata API first
    // Fall back to GraphQL
    // Transform both formats
}
```

---

## Why This Matters

### Before (Metadata Only):
- Company object: 5 fields visible
- Missing: category, idealCustomerProfile, etc.
- Users can't access 80%+ of fields!

### After (Dual-Source):
- Company object: 29 fields visible
- Includes: ALL built-in + custom fields
- Complete field coverage ✅

---

## Next Steps

1. ✅ Tests complete and passing
2. ✅ Dual-source strategy validated
3. ✅ Updated refactoring plan created
4. 🚀 **READY TO IMPLEMENT** following REFACTORING_PLAN_V2.md
5. 🧪 Integration test after implementation
6. 📦 Publish v0.5.0

---

## Files to Review

1. **REFACTORING_PLAN_V2.md** - Complete implementation guide
2. **TEST_RESULTS_SUMMARY.md** - Detailed test findings
3. **test-combined-dual-source.js** - Working dual-source code example
4. **COMBINED_TEST_RESULTS.json** - Test output with both fields

---

**Bottom Line:** Your instinct was correct! The category field IS a MULTI_SELECT, but Twenty stores it differently (GraphQL enum) than custom SELECT fields (metadata API). We now have a complete solution that handles both. 🎯
