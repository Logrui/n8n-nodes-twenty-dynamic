# Critical Fix - v0.5.2

## Issue: SELECT Dropdown Still Showing "No Data"

### Root Cause Found ✅

The problem was in how we were accessing parameters within a fixedCollection context.

**Wrong approach (v0.5.1):**
```typescript
fieldNameWithType = this.getCurrentNodeParameter('fieldName') as string;
```

**Correct approach (v0.5.2):**
```typescript
fieldNameWithType = this.getCurrentNodeParameter('&fieldName') as string;
```

### Why the `&` Prefix?

In n8n, when you're inside a fixedCollection and need to reference another parameter **within the same collection item**, you must use the `&` prefix.

This is the standard pattern used by:
- Notion node (`'&key'`)
- All other n8n core nodes with fixedCollections
- Documented in n8n's internal parameter resolution system

### What Was Happening

1. User selects field "intakeStatus"
2. Field type auto-detects as "select" (via pipe-separated value)
3. UI shows SELECT dropdown
4. `getOptionsForSelectField()` is called
5. **BUG**: `getCurrentNodeParameter('fieldName')` returns `undefined` (wrong context)
6. Method returns empty array
7. UI shows "No data"

### What Happens Now (v0.5.2)

1. User selects field "intakeStatus"  
2. Field type auto-detects as "select"
3. UI shows SELECT dropdown
4. `getOptionsForSelectField()` is called
5. **FIX**: `getCurrentNodeParameter('&fieldName')` correctly gets "intakeStatus|select"
6. Method queries metadata/GraphQL for options
7. Dropdown populates with values (or shows helpful error if truly no options)

### Testing Instructions

1. **Update the node:**
   ```bash
   npm install n8n-nodes-twenty-dynamic@0.5.2
   ```

2. **Restart n8n**

3. **Test SELECT field:**
   - Select "company" object
   - Choose "Create" operation
   - Add a field
   - Select "intakeStatus" (or any SELECT field)
   - **Expected**: Dropdown should populate with options

4. **Test MULTI_SELECT field:**
   - Same steps, but choose a MULTI_SELECT field
   - **Expected**: Multi-select dropdown should show available options

### Known SELECT Fields in Twenty CRM

**Company object:**
- `intakeStatus` - SELECT
- `idealCustomerProfile` - SELECT (built-in enum)

**Person object:**
- `whatsapp` - SELECT (built-in enum)

**Opportunity object:**
- `stage` - SELECT (built-in enum)

### If Still Showing "No Data"

If you still see "No data" after updating to v0.5.2:

1. **Check browser console** for error messages
2. **Check n8n logs** for API errors
3. **Verify field actually has options:**
   - Go to Twenty CRM → Settings → Data Model
   - Find the object and field
   - Check if options are defined

4. **Try Force Refresh Schema:**
   - Toggle "Force Refresh Schema" ON
   - Wait a few seconds
   - Toggle it back OFF
   - Try the dropdown again

5. **Report the issue** with:
   - Field name
   - Object name
   - Error message from console
   - Screenshot

### Files Changed

**Twenty.node.ts** - Line 710:
```typescript
// BEFORE (v0.5.1)
fieldNameWithType = this.getCurrentNodeParameter('fieldName') as string;

// AFTER (v0.5.2)
fieldNameWithType = this.getCurrentNodeParameter('&fieldName') as string;
```

### Version History

- **v0.5.0**: Initial dual-source architecture
- **v0.5.1**: Better error messages, cleaner field names (but dropdown still broken)
- **v0.5.2**: **FIXED** dropdown parameter access with `&` prefix ✅

---

**Published**: October 14, 2025  
**npm**: `n8n-nodes-twenty-dynamic@0.5.2`  
**Status**: ✅ Critical fix deployed
