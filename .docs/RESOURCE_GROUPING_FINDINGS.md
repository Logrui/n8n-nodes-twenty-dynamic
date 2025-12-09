# Resource Grouping Analysis - Findings

**Date:** October 14, 2025  
**Test Results:** From live Twenty CRM instance at twenty.envisicapital.com

---

## 📊 Current Statistics

- **Total Objects:** 39
- **System Objects (isSystem):** 26 (67%)
- **Standard Objects:** 8 (21%)
- **Custom Objects (isCustom):** 5 (13%)
- **Remote Objects (isRemote):** 0
- **Read-Only (isUIReadOnly):** 3
- **Searchable (isSearchable):** 11
- **Inactive (isActive=false):** 0

---

## 🎯 Key Findings

### 1. **isSystem Property is Available** ✅
- The Twenty API exposes `isSystem` boolean field
- **26 out of 39 objects** are marked as System
- System objects are internal meta-objects (Views, Filters, Attachments, Message Threads, etc.)
- These are typically hidden from regular users in Twenty UI

### 2. **Standard Resources are the Minority**
- Only **8 objects** are standard user-facing resources:
  1. Workflow
  2. Task
  3. Note
  4. Workflow Run
  5. Person
  6. Opportunity
  7. Workflow Version
  8. Company

### 3. **Custom Objects are Working**
- User has **5 custom objects** created:
  1. Upcoming Event
  2. Job
  3. Document
  4. Inbox
  5. Email

### 4. **Other Useful Properties**
- `isActive` - All objects currently active (none inactive)
- `isRemote` - None currently configured (for external data sources)
- `isUIReadOnly` - 3 objects (Workflow Run, Workflow Version, Calendar event)
- `isSearchable` - 11 objects can be searched
- `shortcut` - Some objects have keyboard shortcuts (C, P, O, T, N, W)

---

## 💡 Recommended Resource Group Structure

Based on the analysis, here's the optimal grouping strategy:

### Group 1: **All Resources** (Default)
- **Count:** 39 objects
- **Filter:** None (show everything)
- **Use Case:** Advanced users, debugging, seeing everything
- **Default:** Yes

### Group 2: **Standard Resources** ⭐ MOST USEFUL
- **Count:** 8 objects
- **Filter:** `!isCustom && !isSystem && isActive`
- **Objects:** Company, Person, Opportunity, Task, Note, Workflow, Workflow Run, Workflow Version
- **Use Case:** 90% of regular users - these are the main Twenty CRM objects
- **Recommendation:** Make this the default for better UX

### Group 3: **Custom Resources**
- **Count:** 5 objects (user-specific)
- **Filter:** `isCustom === true && isActive`
- **Objects:** User-created custom objects
- **Use Case:** Users with many custom objects who want to filter them separately
- **Recommendation:** Very useful when users have 10+ custom objects

### Group 4: **System Resources**
- **Count:** 26 objects
- **Filter:** `isSystem === true && isActive`
- **Objects:** Internal meta-objects (Views, Filters, Attachments, etc.)
- **Use Case:** Advanced users, integration developers, debugging
- **Recommendation:** Keep but label as "Advanced"

### Group 5: **Remote Resources** (Future)
- **Count:** 0 objects currently
- **Filter:** `isRemote === true && isActive`
- **Objects:** Connected external data sources
- **Use Case:** Users with remote data connections
- **Recommendation:** Hide this option if count === 0

---

## 🔧 Implementation Recommendations

### Current Implementation (v0.5.8)
```typescript
// Resource Groups defined but using incorrect filters
'all' -> show all
'system' -> filter by !isCustom (WRONG - should use isSystem)
'custom' -> filter by isCustom (CORRECT)
'database' -> show all (placeholder)
'databaseItem' -> show all (placeholder)
```

### Recommended Implementation (v0.5.9)
```typescript
switch (resourceGroup) {
    case 'all':
        // Show all active resources
        filteredObjects = schema.objects.filter(obj => obj.isActive);
        break;
        
    case 'standard':  // Rename from 'system'
        // Main user-facing Twenty objects
        filteredObjects = schema.objects.filter(obj => 
            !obj.isCustom && !obj.isSystem && obj.isActive
        );
        break;
        
    case 'custom':
        // User-created custom objects
        filteredObjects = schema.objects.filter(obj => 
            obj.isCustom && obj.isActive
        );
        break;
        
    case 'system':  // Rename from 'database'
        // Internal meta-objects (advanced users only)
        filteredObjects = schema.objects.filter(obj => 
            obj.isSystem && obj.isActive
        );
        break;
        
    case 'remote':  // Rename from 'databaseItem'
        // Remote/connected data sources
        filteredObjects = schema.objects.filter(obj => 
            obj.isRemote && obj.isActive
        );
        break;
}
```

### Updated Resource Group Options
```typescript
options: [
    {
        name: 'All Resources',
        value: 'all',
        description: 'Show all available resources (39 total)',
    },
    {
        name: 'Standard Resources',  // NEW - most useful!
        value: 'standard',
        description: 'Main Twenty CRM objects (Company, Person, Opportunity, etc.)',
    },
    {
        name: 'Custom Resources',
        value: 'custom',
        description: 'User-created custom objects',
    },
    {
        name: 'System Resources',  // Renamed
        value: 'system',
        description: 'Internal meta-objects (Views, Filters, Attachments, etc.) - Advanced',
    },
    {
        name: 'Remote Resources',  // Renamed
        value: 'remote',
        description: 'Connected external data sources',
    },
]
```

---

## 🎨 UX Improvements

### Better Default
Change default from `'all'` to `'standard'`:
```typescript
default: 'standard',  // Instead of 'all'
```

**Reasoning:**
- Most users only care about the 8 standard objects
- Showing 39 objects is overwhelming for new users
- System objects are rarely needed for normal operations
- Matches Twenty's own UI which hides system objects by default

### Dynamic Option Hiding
```typescript
// Hide Remote Resources option if no remote objects exist
if (remoteObjects.length === 0) {
    // Don't show the 'remote' option
}
```

---

## 📈 Impact Analysis

### Before (v0.5.8)
- User sees 39 objects by default
- Confusing mix of user-facing and internal objects
- "Database" and "Database Item" groups don't filter anything

### After (v0.5.9)
- User sees 8 standard objects by default (Company, Person, etc.)
- Clear separation: Standard, Custom, System, Remote
- Better matches Twenty's own UI philosophy
- 67% fewer objects to scroll through for typical use cases

---

## ✅ Action Items

1. **Update `getResources()` method** in `Twenty.node.ts`
   - Use `isSystem` property instead of just `!isCustom`
   - Add `standard` group filter
   - Update `system` group to use `isSystem === true`
   - Update `remote` group to use `isRemote === true`
   - Filter out inactive objects: `obj.isActive`

2. **Update Resource Group options**
   - Rename "System Resources" → clearer description
   - Rename "Database" → "System Resources"
   - Rename "Database Item" → "Remote Resources"
   - Add new "Standard Resources" option
   - Reorder: All → Standard → Custom → System → Remote

3. **Change default value**
   - From: `default: 'all'`
   - To: `default: 'standard'`

4. **Update IObjectMetadata interface** in `TwentyApi.client.ts`
   - Add missing properties: `isRemote`, `isUIReadOnly`, `isSearchable`, `shortcut`

5. **Update documentation**
   - README.md - explain new grouping
   - CHANGELOG.md - v0.5.9 entry
   - Update descriptions to be more user-friendly

---

## 🧪 Test Results

All data verified against live Twenty CRM instance:
- ✅ `isSystem` property exists and works
- ✅ `isCustom` property exists and works
- ✅ `isActive` property exists and works
- ✅ `isRemote` property exists (no remote objects in test instance)
- ✅ `isUIReadOnly` property exists
- ✅ `isSearchable` property exists
- ✅ Clear distinction between System (26), Standard (8), and Custom (5)

---

## 🎯 Conclusion

The Twenty API provides excellent metadata for intelligent resource grouping. We should:

1. **Fix the current implementation** to actually use `isSystem` property
2. **Add "Standard Resources"** as the most useful group (and make it default)
3. **Rename groups** to be clearer about what they contain
4. **Filter out inactive objects** across all groups
5. **Update to v0.5.9** with these improvements

This will dramatically improve UX for most users while still providing power users access to system and remote objects when needed.
