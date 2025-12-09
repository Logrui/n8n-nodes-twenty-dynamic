# Complex Fields UI Examples

## Current Behavior (Broken)

**User Action:** Select Person → Create One → Add Field "name"

**Current UI:**
```
┌─────────────────────────────────────┐
│ Resource: Person                    │
├─────────────────────────────────────┤
│ Operation: Create One               │
├─────────────────────────────────────┤
│ Fields to Set:                      │
│   ┌─────────────────────────────┐   │
│   │ Field Name: name            │   │
│   │ Field Value: [John Doe]     │   │ ❌ Breaks - expects object
│   └─────────────────────────────┘   │
│   [+ Add Field]                     │
└─────────────────────────────────────┘
```

**Error:**
```json
{
  "errors": [{
    "message": "Expected type \"FullNameCreateInput\" to be an object."
  }]
}
```

---

## OPTION 1: Dynamic Field Expansion ⭐

**User Action:** Select Person → Create One → Add Field "name"

**New UI:**
```
┌─────────────────────────────────────────────────────┐
│ Resource: Person                                    │
├─────────────────────────────────────────────────────┤
│ Operation: Create One                               │
├─────────────────────────────────────────────────────┤
│ Fields to Set:                                      │
│   ┌─────────────────────────────────────────────┐   │
│   │ Field: name (Full Name)                     │   │
│   │   ⤷ First Name: [John        ]              │   │ ← Auto-expanded
│   │   ⤷ Last Name:  [Doe         ]              │   │ ← Auto-expanded
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │ Field: email (Email)                        │   │
│   │   Email Address: [john@example.com]         │   │ ← Simple field
│   └─────────────────────────────────────────────┘   │
│   [+ Add Field]                                     │
└─────────────────────────────────────────────────────┘
```

**Data Transformation (internal):**
```javascript
// User inputs:
{
  "name_firstName": "John",
  "name_lastName": "Doe",
  "email": "john@example.com"
}

// Transformed to GraphQL:
{
  "name": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "email": "john@example.com"
}
```

---

## OPTION 2: JSON Input

**User Action:** Select Person → Create One → Add Field "name"

**New UI:**
```
┌─────────────────────────────────────────────────────┐
│ Resource: Person                                    │
├─────────────────────────────────────────────────────┤
│ Operation: Create One                               │
├─────────────────────────────────────────────────────┤
│ Fields to Set:                                      │
│   ┌─────────────────────────────────────────────┐   │
│   │ Field Name: name (JSON Object)              │   │
│   │ Field Value:                                │   │
│   │ ┌─────────────────────────────────────────┐ │   │
│   │ │ {                                       │ │   │
│   │ │   "firstName": "John",                  │ │   │ ← JSON editor
│   │ │   "lastName": "Doe"                     │ │   │
│   │ │ }                                       │ │   │
│   │ └─────────────────────────────────────────┘ │   │
│   └─────────────────────────────────────────────┘   │
│   [+ Add Field]                                     │
└─────────────────────────────────────────────────────┘
```

**Data Handling:**
```javascript
// User inputs JSON string:
'{"firstName": "John", "lastName": "Doe"}'

// Parsed to GraphQL:
{
  "name": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## OPTION 3: Hybrid Approach

**User Action:** Select Person → Create One → Add Fields "name" and "address"

**New UI:**
```
┌─────────────────────────────────────────────────────┐
│ Resource: Person                                    │
├─────────────────────────────────────────────────────┤
│ Operation: Create One                               │
├─────────────────────────────────────────────────────┤
│ Fields to Set:                                      │
│   ┌─────────────────────────────────────────────┐   │
│   │ Field: name (Full Name)                     │   │
│   │   ⤷ First Name: [John        ]              │   │ ← Auto-expanded (simple)
│   │   ⤷ Last Name:  [Doe         ]              │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │ Field: address (Address - JSON)             │   │
│   │ ┌─────────────────────────────────────────┐ │   │
│   │ │ {                                       │ │   │ ← JSON (complex)
│   │ │   "addressStreet1": "123 Main St",     │ │   │
│   │ │   "addressCity": "New York",           │ │   │
│   │ │   "addressCountry": "USA"              │ │   │
│   │ │ }                                       │ │   │
│   │ └─────────────────────────────────────────┘ │   │
│   └─────────────────────────────────────────────┘   │
│   [+ Add Field]                                     │
└─────────────────────────────────────────────────────┘
```

---

## Template-Based Approach (Quick Win)

**Implementation:** Hardcoded templates for known types

**User Action:** Select Person → Create One → Add Field "name"

**UI (similar to Option 1):**
```
┌─────────────────────────────────────────────────────┐
│ Resource: Person                                    │
├─────────────────────────────────────────────────────┤
│ Operation: Create One                               │
├─────────────────────────────────────────────────────┤
│ Fields to Set:                                      │
│   ┌─────────────────────────────────────────────┐   │
│   │ Field: name (Full Name)                     │   │
│   │   ⤷ First Name: [         ]                 │   │ ← From template
│   │   ⤷ Last Name:  [         ]                 │   │ ← From template
│   └─────────────────────────────────────────────┘   │
│   [+ Add Field]                                     │
└─────────────────────────────────────────────────────┘
```

**Code (simplified):**
```typescript
// Hardcoded in Twenty.node.ts
if (fieldType === 'FullName') {
  return [
    {
      displayName: 'First Name',
      name: `${fieldName}_firstName`,
      type: 'string',
      default: '',
    },
    {
      displayName: 'Last Name',
      name: `${fieldName}_lastName`,
      type: 'string',
      default: '',
    },
  ];
}
```

---

## Complex Example: Company with Multiple Complex Fields

**Scenario:** Creating a Company with domainName (Links), address (Address), and annualRecurringRevenue (Currency)

### Option 1 UI:
```
┌───────────────────────────────────────────────────────────┐
│ Resource: Company                                         │
├───────────────────────────────────────────────────────────┤
│ Operation: Create One                                     │
├───────────────────────────────────────────────────────────┤
│ Fields to Set:                                            │
│   ┌───────────────────────────────────────────────────┐   │
│   │ Field: name (Company Name)                        │   │
│   │   Company Name: [Acme Corp         ]              │   │
│   └───────────────────────────────────────────────────┘   │
│                                                           │
│   ┌───────────────────────────────────────────────────┐   │
│   │ Field: domainName (Domain)                        │   │
│   │   ⤷ URL:   [https://acme.com]                     │   │
│   │   ⤷ Label: [acme.com        ]                     │   │
│   └───────────────────────────────────────────────────┘   │
│                                                           │
│   ┌───────────────────────────────────────────────────┐   │
│   │ Field: address (Address)                          │   │
│   │   ⤷ Street 1: [123 Main St    ]                   │   │
│   │   ⤷ City:     [New York       ]                   │   │
│   │   ⤷ Postcode: [10001          ]                   │   │
│   │   ⤷ Country:  [USA            ]                   │   │
│   │   ⤷ State:    [NY             ]                   │   │
│   └───────────────────────────────────────────────────┘   │
│                                                           │
│   ┌───────────────────────────────────────────────────┐   │
│   │ Field: annualRecurringRevenue (ARR)               │   │
│   │   ⤷ Amount:   [100000         ]                   │   │
│   │   ⤷ Currency: [USD            ]                   │   │
│   └───────────────────────────────────────────────────┘   │
│                                                           │
│   [+ Add Field]                                           │
└───────────────────────────────────────────────────────────┘
```

**Internal transformation:**
```javascript
// User inputs (flat structure):
{
  "name": "Acme Corp",
  "domainName_primaryLinkUrl": "https://acme.com",
  "domainName_primaryLinkLabel": "acme.com",
  "address_addressStreet1": "123 Main St",
  "address_addressCity": "New York",
  "address_addressPostcode": "10001",
  "address_addressCountry": "USA",
  "address_addressState": "NY",
  "annualRecurringRevenue_amountMicros": 100000000000,  // $100k in micros
  "annualRecurringRevenue_currencyCode": "USD"
}

// Transformed to GraphQL (nested structure):
{
  "name": "Acme Corp",
  "domainName": {
    "primaryLinkUrl": "https://acme.com",
    "primaryLinkLabel": "acme.com"
  },
  "address": {
    "addressStreet1": "123 Main St",
    "addressCity": "New York",
    "addressPostcode": "10001",
    "addressCountry": "USA",
    "addressState": "NY"
  },
  "annualRecurringRevenue": {
    "amountMicros": 100000000000,
    "currencyCode": "USD"
  }
}
```

---

## Recommendation Summary

**Best UX:** Option 1 (Dynamic Field Expansion)
**Fastest Implementation:** Template-Based Approach
**Most Flexible:** Option 1 (Dynamic)
**Easiest for Users:** Option 1 (Dynamic)

**Suggested Path:**
1. Start with Template-Based for FullName, Links (most common)
2. Refactor to Option 1 (Dynamic) for long-term solution
3. This gives you a working solution quickly, then improves it
