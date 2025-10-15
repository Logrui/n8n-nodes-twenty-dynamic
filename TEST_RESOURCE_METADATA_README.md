# Resource Metadata Explorer Test

This test script explores the Twenty CRM Metadata API to discover what properties are available for intelligent resource grouping.

## Purpose

- Discover all available fields on Twenty object metadata
- Understand what properties can be used for grouping (beyond `isCustom`)
- Provide insights for improving the Resource Group feature

## Setup

1. **Get your Twenty API Key**:
   - Go to your Twenty instance
   - Navigate to Settings → Developers
   - Create a new API key or use an existing one
   - Copy the API key

2. **Configure the test script**:
   ```javascript
   // In test-resource-metadata.js, update these lines:
   const TWENTY_DOMAIN = 'http://localhost:3000'; // Your Twenty URL
   const API_KEY = 'YOUR_ACTUAL_API_KEY';          // Your API key
   ```

## Running the Test

```bash
node test-resource-metadata.js
```

## What It Does

### Test 1: Get All Object Metadata
- Queries the Twenty Metadata API for all objects
- Retrieves all available fields including:
  - `id`, `nameSingular`, `namePlural`
  - `labelSingular`, `labelPlural`
  - `isCustom`, `isSystem`, `isActive`
  - `description`, `icon`, `createdAt`, `updatedAt`
- Outputs:
  - Raw JSON response
  - Statistics (total, custom, standard, system objects)
  - Sample objects from each category
  - Grouping strategy recommendations

### Test 2: GraphQL Introspection
- Uses GraphQL introspection to discover ALL possible fields on Object type
- Shows fields that might not be documented
- Helps discover new grouping opportunities

## Expected Output

```
🚀 Twenty CRM Resource Metadata Explorer
Purpose: Discover properties for intelligent resource grouping

================================================================================
TEST 1: Get All Object Metadata (Complete Fields)
================================================================================

📦 Raw API Response:
{
  "objects": {
    "edges": [
      {
        "node": {
          "id": "...",
          "nameSingular": "company",
          "labelSingular": "Company",
          "isCustom": false,
          "isSystem": false,
          "isActive": true,
          ...
        }
      },
      ...
    ]
  }
}

📊 Object Statistics:
Total Objects: 25
Custom Objects: 2
Standard Objects: 20
System Objects: 3
Active Objects: 24
Inactive Objects: 1

💡 Grouping Strategy Insights:
Based on the API response, we can group resources as follows:

1. ALL RESOURCES: Show all objects (25 total)
2. SYSTEM RESOURCES: isSystem === true (3 objects)
3. STANDARD RESOURCES: !isCustom && !isSystem (20 objects)
4. CUSTOM RESOURCES: isCustom === true (2 objects)
5. INACTIVE RESOURCES: isActive === false (1 objects)
```

## Key Findings

After running this test, you should be able to answer:

1. ✅ Does the API expose `isSystem` property?
   - If YES: We can properly filter System Resources
   - If NO: We need to use a different approach

2. ✅ Does the API expose `isActive` property?
   - If YES: We should filter out inactive objects by default
   - If NO: All objects are shown

3. ✅ Are there other grouping properties?
   - namespace, category, module, etc.
   - Could enable more sophisticated grouping

4. ✅ What about Database vs Database Item?
   - Check if there's a `type` or `category` field
   - Or if we need to hardcode known database objects

## Next Steps

Based on the test results:

1. **If `isSystem` exists**: Update `getResources()` to use it for System Resources group
2. **If `isActive` exists**: Filter out inactive objects by default
3. **If additional properties exist**: Consider adding more Resource Group options
4. **Update implementation** in `nodes/Twenty/Twenty.node.ts` accordingly

## Troubleshooting

### Error: "Failed to fetch"
- Check that TWENTY_DOMAIN is correct
- Ensure your Twenty instance is running
- Verify the URL includes the protocol (http:// or https://)

### Error: "Unauthorized" or "Invalid API key"
- Verify your API key is correct
- Check that the API key hasn't been revoked
- Ensure you have proper permissions

### Error: "GraphQL Error"
- The query might be incompatible with your Twenty version
- Check the error message for details
- Try updating Twenty to the latest version

## Cleanup

After running the test, you can safely delete this file and test-resource-metadata.js if you don't need them anymore.
