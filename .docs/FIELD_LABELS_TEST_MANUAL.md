# Testing Field Labels - Manual Instructions

## Goal
Determine if Twenty CRM API provides display labels (user-friendly names) for fields, and if so, use them in the dropdown instead of API names.

## Quick Test in n8n

1. **Open your n8n instance**
2. **Add a Twenty node**
3. **Open Browser Developer Tools** (F12)
4. **Go to Console tab**
5. **Add a field** and watch the network request

### What to Look For:

When you click "Add Field", n8n makes a request to load options. Check the response for:

```json
{
  "name": "idealCustomerProfile",  // API name
  "label": "Ideal Customer Profile",  // Display label (if available)
  "description": "Indicates whether...",  // Description (if available)
  "type": "SELECT"
}
```

## Manual GraphQL Test

You can also test directly in Twenty's GraphQL playground:

1. **Go to** `https://twenty.envisicapital.com/graphql`
2. **Run this query:**

```graphql
query GetCompanyFields {
  objects(filter: { nameSingular: { eq: "company" } }) {
    edges {
      node {
        nameSingular
        labelSingular
        fields(paging: { first: 50 }) {
          edges {
            node {
              id
              name
              label
              description
              type
              isActive
              isCustom
            }
          }
        }
      }
    }
  }
}
```

### What to Check:

Look at the response for a few fields:

```json
{
  "name": "idealCustomerProfile",
  "label": "Ideal Customer Profile",  // ← Do we have this?
  "description": "...",  // ← Or this?
  "type": "SELECT"
}
```

## Expected Results

### Scenario 1: Labels Available ✅
If `label` is present and different from `name`:
- **Solution**: Use `label` for display, `name` for value
- **Format**: 
  ```javascript
  {
    name: field.label,  // "Ideal Customer Profile"
    value: `${field.name}|${type}`,  // "idealCustomerProfile|select"
    description: field.type
  }
  ```

### Scenario 2: Only Descriptions Available
If `description` is present but no `label`:
- **Solution**: Use `description` for display
- **Format**:
  ```javascript
  {
    name: field.description,  // "Indicates whether..."
    value: `${field.name}|${type}`,
    description: field.type
  }
  ```

### Scenario 3: No Labels or Descriptions ❌
If neither `label` nor `description` exists:
- **Solution**: Humanize the field name
- **Format**:
  ```javascript
  {
    name: humanize(field.name),  // "Ideal Customer Profile"
    value: `${field.name}|${type}`,  // "idealCustomerProfile|select"
    description: field.type
  }
  ```

## Current Implementation (v0.5.3)

Currently showing **API names only**:
```typescript
{
  name: field.name,  // "idealCustomerProfile"
  value: `${field.name}|${n8nType}`,
  description: field.type
}
```

## Proposed Fix (v0.5.4)

Show **display labels** if available:
```typescript
{
  name: field.label || humanize(field.name),  // "Ideal Customer Profile"
  value: `${field.name}|${n8nType}`,  // "idealCustomerProfile|select"
  description: field.type
}
```

## Implementation Location

File: `nodes/Twenty/Twenty.node.ts`
Line: ~656

```typescript
// Current (v0.5.3)
return {
    name: field.name,
    value: `${field.name}|${n8nType}`,
    description: field.type,
};

// Proposed (v0.5.4)
return {
    name: field.label || field.name,  // Use label if available
    value: `${field.name}|${n8nType}`,
    description: field.type,
};
```

## Helper Function Needed

Add this function to humanize field names as fallback:

```typescript
function humanize(str: string): string {
    return str
        .replace(/([A-Z])/g, ' $1')  // Add space before capitals
        .replace(/^./, (match) => match.toUpperCase())  // Capitalize first letter
        .trim();
}

// Examples:
// "idealCustomerProfile" → "Ideal Customer Profile"
// "domainName" → "Domain Name"
// "ARR" → "ARR"
```

## Next Steps

1. **Test in GraphQL playground** to confirm `label` field exists
2. **Check a few fields** to see quality of labels
3. **Decide on strategy**:
   - Use `label` if available
   - Fall back to `humanize(name)` if not
4. **Implement in v0.5.4**
5. **Test in n8n** to verify dropdown shows friendly names

---

**Once you confirm labels are available, I can implement this fix immediately!**
