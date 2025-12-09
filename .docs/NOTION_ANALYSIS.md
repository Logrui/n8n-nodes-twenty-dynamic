# Notion Node Analysis - How to Fix Twenty Dynamic Node

## Executive Summary

The Notion node demonstrates a **superior pattern** for dynamic property loading that we should adopt for the Twenty node. The key insight: **Notion uses `fixedCollection` with nested `loadOptionsMethod` calls** that work perfectly in the UI.

---

## How Notion Handles Dynamic Properties

### 1. **Database Selection** (Resource Locator)
```typescript
{
    displayName: 'Database',
    name: 'databaseId',
    type: 'resourceLocator',  // Searchable dropdown with multiple input modes
    modes: [
        {
            displayName: 'Database',
            name: 'list',
            typeOptions: {
                searchListMethod: 'getDatabases',  // Uses listSearch, not loadOptions
                searchable: true,
            },
        },
        // ... URL and ID modes
    ],
}
```

**Key**: Uses `resourceLocator` + `listSearch` for database selection (like Google Drive).

---

### 2. **Properties Collection** (fixedCollection)
```typescript
{
    displayName: 'Properties',
    name: 'propertiesUi',
    type: 'fixedCollection',
    typeOptions: {
        multipleValues: true,
    },
    options: [
        {
            name: 'propertyValues',
            displayName: 'Property',
            values: [
                // Property configuration fields here
            ],
        },
    ],
}
```

**Key**: Uses `fixedCollection` for repeatable property entries, just like our fields!

---

### 3. **Property Name Selection** (Dynamic from Database)
```typescript
{
    displayName: 'Key Name or ID',
    name: 'key',
    type: 'options',
    typeOptions: {
        loadOptionsMethod: 'getDatabaseProperties',  // ✅ loadOptionsMethod WORKS here!
        loadOptionsDependsOn: ['databaseId'],  // ✅ Depends on parent parameter!
    },
    default: '',
}
```

**Critical Discovery**: `loadOptionsMethod` **DOES WORK** in `fixedCollection.values`!

---

### 4. **Hidden Type Field** (Auto-Detection)
```typescript
{
    displayName: 'Type',
    name: 'type',
    type: 'hidden',  // ✅ User doesn't see this!
    default: '={{$parameter["&key"].split("|")[1]}}',  // ✅ Expression extracts type!
}
```

**BRILLIANT SOLUTION**: 
- The `loadOptionsMethod` returns `value: 'propertyName|type'` (pipe-separated)
- A hidden field extracts the type using an expression
- This hidden type is used in `displayOptions.show` conditions

---

### 5. **Type-Specific Fields** (Conditional Display)
```typescript
// For select type
{
    displayName: 'Option Name or ID',
    name: 'selectValue',
    type: 'options',
    typeOptions: {
        loadOptionsMethod: 'getPropertySelectValues',  // ✅ Another loadOptionsMethod!
    },
    displayOptions: {
        show: {
            type: ['select'],  // ✅ Shows when hidden type field = 'select'
        },
    },
}

// For multi_select type
{
    displayName: 'Option Names or IDs',
    name: 'multiSelectValue',
    type: 'multiOptions',
    typeOptions: {
        loadOptionsMethod: 'getPropertySelectValues',  // Same method, different context
    },
    displayOptions: {
        show: {
            type: ['multi_select'],
        },
    },
}
```

**Key**: Conditional fields load their OWN options dynamically based on the selected property.

---

## How Notion's LoadOptions Methods Work

### Method 1: `getDatabaseProperties` (Get Field List)
```typescript
export async function getDatabaseProperties(
    this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
    const returnData: INodePropertyOptions[] = [];
    const databaseId = this.getCurrentNodeParameter('databaseId', {
        extractValue: true,  // ✅ Extracts value from resourceLocator
    }) as string;
    
    const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
    
    for (const key of Object.keys(properties as IDataObject)) {
        if (!['created_time', 'last_edited_time', ...].includes(properties[key].type)) {
            returnData.push({
                name: key,
                value: `${key}|${properties[key].type}`,  // ✅ Pipe-separated value!
            });
        }
    }
    
    return returnData.sort(...);
}
```

**Returns**: `{ name: 'fieldName', value: 'fieldName|FIELD_TYPE' }`

---

### Method 2: `getPropertySelectValues` (Get SELECT Options)
```typescript
export async function getPropertySelectValues(
    this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
    // ✅ Extracts property name AND type from the pipe-separated value
    const [name, type] = (this.getCurrentNodeParameter('&key') as string).split('|');
    
    const databaseId = this.getCurrentNodeParameter('databaseId', {
        extractValue: true,
    }) as string;
    
    const { properties } = await notionApiRequest.call(this, 'GET', `/databases/${databaseId}`);
    
    // ✅ Returns options for this specific property
    return properties[name][type].options.map((option: IDataObject) => ({
        name: option.name,
        value: option.name,
    }));
}
```

**Key**: Uses `getCurrentNodeParameter('&key')` to get the selected property's value, then splits it to extract name and type.

---

## Why This Works (and Why Ours Doesn't)

| Aspect | Notion (Working) | Twenty v0.4.3 (Broken) | Why Ours Fails |
|--------|-----------------|------------------------|----------------|
| **Field Name** | `type: 'options'` with `loadOptionsMethod` | `type: 'options'` with `loadOptionsMethod` | ✅ Both work |
| **Field Type** | `type: 'hidden'` with expression | `type: 'options'` static list | ❌ We show it to user, adding friction |
| **Type Detection** | `value: 'name\|type'` then extract | Separate loadOptionsMethod | ❌ Over-complicated |
| **SELECT Options** | Nested `loadOptionsMethod` with `getCurrentNodeParameter('&key')` | Same approach | ✅ Should work |
| **displayOptions Path** | `type: ['select']` (relative) | `fieldType: ['select']` (relative) | ✅ We fixed this in v0.4.3 |

---

## Root Cause of Our Issue

### Problem 1: We're Using the Wrong Pattern for Type Detection
**Notion's Pattern** (Works):
```typescript
// 1. Field Name returns pipe-separated value
value: 'fieldName|FIELD_TYPE'

// 2. Hidden type field extracts it
{
    name: 'type',
    type: 'hidden',
    default: '={{$parameter["&key"].split("|")[1]}}',
}
```

**Our Pattern** (Doesn't work well):
```typescript
// 1. Field Name returns just the name
value: 'fieldName'

// 2. Separate loadOptionsMethod tries to auto-detect
typeOptions: {
    loadOptionsMethod: 'getFieldTypeOptions',  // Adds complexity
}
```

### Problem 2: Potential Parameter Resolution Issue
Our `getOptionsForSelectField` might be:
1. Being called BEFORE `fieldName` is set
2. Not being re-triggered when `fieldName` changes (despite `loadOptionsDependsOn`)
3. Returning empty array due to error handling

---

## Recommended Solution for Twenty Node

### Approach A: **Copy Notion's Pattern Exactly** (RECOMMENDED)

1. **Change Field Name to return pipe-separated values**:
```typescript
// In getFieldsForResource loadOptionsMethod
return {
    name: `${field.name} (${field.label})`,
    value: `${field.name}|${field.type}`,  // Add pipe separator
    description: `Type: ${field.type}${field.isNullable ? ' (optional)' : ' (required)'}`,
};
```

2. **Add hidden type field**:
```typescript
{
    displayName: 'Type',
    name: 'fieldType',
    type: 'hidden',
    default: '={{$parameter["&fieldName"].split("|")[1]}}',  // Extract from fieldName
}
```

3. **Update getOptionsForSelectField to use pipe-separated value**:
```typescript
async getOptionsForSelectField(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const resource = this.getCurrentNodeParameter('resource') as string;
    const [fieldName, fieldType] = (this.getCurrentNodeParameter('fieldName') as string).split('|');
    
    // Now we know the type without a second API call!
    // ...
}
```

### Approach B: **Keep Current Pattern, Debug Why Options Don't Load**

1. Add console.log / error tracking to `getOptionsForSelectField`
2. Check if method is being called
3. Check if `fieldName` parameter is accessible
4. Check if API is returning options

---

## Action Plan

### Phase 1: Adopt Notion's Hidden Type Pattern ✅ **DO THIS**
1. Modify `getFieldsForResource` to return `value: 'name|type'`
2. Change `fieldType` from `type: 'options'` to `type: 'hidden'` with expression
3. Update `getOptionsForSelectField` to split the pipe-separated value
4. Test that SELECT dropdowns now populate

### Phase 2: Consider Resource Locator for Object Selection
1. Change `resource` parameter from static `options` to `resourceLocator`
2. Implement `listSearch.getObjects` method for searchable object dropdown
3. Provides better UX for users with many objects

### Phase 3: Clean Up Field Type Options
1. Remove `getFieldTypeOptions` loadOptionsMethod (no longer needed)
2. Simplify parameter structure
3. Update documentation

---

## Key Takeaways

1. **`loadOptionsMethod` DOES WORK in fixedCollection** - Our approach wasn't wrong
2. **Hidden fields with expressions** are the key to auto-detection
3. **Pipe-separated values** (`name|type`) are a clever pattern for embedding metadata
4. **`getCurrentNodeParameter('&key')`** - The `&` prefix refers to the parameter name
5. **Notion's pattern is battle-tested** - Just copy it instead of reinventing

---

## Next Steps

Implement Approach A (Notion's pattern) in the Twenty node. This should fix:
- ✅ Field type auto-detection
- ✅ SELECT/MULTI_SELECT option loading
- ✅ Better UX with hidden type field
- ✅ Simplified code structure

The pattern is proven to work in Notion, which is a very similar use case (CRM-like database with typed fields and SELECT options).
