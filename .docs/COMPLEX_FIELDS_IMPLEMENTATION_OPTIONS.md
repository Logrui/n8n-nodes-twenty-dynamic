# Dynamic Complex Field Input System - Implementation Options

## Problem Statement

When creating/updating records in Twenty CRM, certain fields are complex objects (FullName, Links, Address, Currency, Actor) that require nested input structures. Currently, the n8n node treats all field values as simple strings/primitives, which causes GraphQL errors like:

```
Expected type "FullNameCreateInput" to be an object.
```

## Discovered Complex Input Types

From GraphQL introspection:

### 1. **FullNameCreateInput** (Person.name)
```typescript
{
  firstName: string;    // optional
  lastName: string;     // optional
}
```

### 2. **LinksCreateInput** (Company.domainName, linkedinLink, xLink, website, etc.)
```typescript
{
  primaryLinkLabel: string;   // optional
  primaryLinkUrl: string;     // optional
  secondaryLinks: JSON;       // optional - can be null
}
```

### 3. **AddressCreateInput** (Company.address, Person.address)
```typescript
{
  addressStreet1: string;
  addressStreet2: string;
  addressCity: string;
  addressPostcode: string;
  addressState: string;
  addressCountry: string;
  addressLat: number;         // BigFloat
  addressLng: number;         // BigFloat
}
```

### 4. **CurrencyCreateInput** (Company.annualRecurringRevenue)
```typescript
{
  amountMicros: number;       // BigFloat - amount in micros (e.g., $100 = 100,000,000)
  currencyCode: string;       // e.g., "USD", "EUR"
}
```

### 5. **ActorCreateInput** (createdBy field)
```typescript
{
  source: ActorSourceEnum;    // ENUM value
  context: JSON;              // JSON object
}
```

---

## Implementation Options

### **OPTION 1: Dynamic Field Expansion (Recommended ⭐)**

**Concept:** When a field is detected as a complex object type, dynamically expand it into multiple sub-fields in the n8n UI.

**How it works:**
1. During field introspection, detect object types (FullName, Links, Address, Currency, Actor)
2. Store object type metadata including sub-field definitions
3. In the n8n UI field parameter, use `displayOptions` to conditionally show sub-fields
4. Transform the collected sub-field values into the proper nested object structure before sending to GraphQL

**Pros:**
- ✅ Fully dynamic - no hardcoding
- ✅ User-friendly - each sub-field is a separate input
- ✅ Type-safe - validates each sub-field individually
- ✅ Works for all current and future complex types
- ✅ Clear UI - users see exactly what fields are needed

**Cons:**
- ⚠️ More complex implementation
- ⚠️ UI becomes longer when many complex fields are selected
- ⚠️ Need to handle field dependencies (show/hide logic)

**Implementation Steps:**

1. **Enhance `getDataSchemaForObject()` to introspect complex input types:**
```typescript
// For each field of type Links, FullName, Address, Currency, Actor:
// Query __type(name: "LinksCreateInput") to get its inputFields
```

2. **Store sub-field metadata in IFieldMetadata:**
```typescript
interface IFieldMetadata {
  // ... existing fields
  isComplexObject?: boolean;
  complexObjectType?: string;  // "FullName", "Links", "Address", etc.
  subFields?: ISubFieldMetadata[];
}

interface ISubFieldMetadata {
  name: string;
  type: string;
  isNullable: boolean;
  description?: string;
}
```

3. **Generate dynamic field parameters in Twenty.node.ts:**
```typescript
// For a field like "name" of type FullName:
{
  displayName: 'Name - First Name',
  name: 'name_firstName',
  type: 'string',
  displayOptions: {
    show: {
      'fields.field': [{ fieldName: 'name' }],
    },
  },
  default: '',
  description: 'First name of the person',
}
{
  displayName: 'Name - Last Name',
  name: 'name_lastName',
  type: 'string',
  displayOptions: {
    show: {
      'fields.field': [{ fieldName: 'name' }],
    },
  },
  default: '',
  description: 'Last name of the person',
}
```

4. **Transform field values before GraphQL mutation:**
```typescript
// In execute() before buildCreateMutation:
const transformedFields = transformComplexFields(fieldsData, fieldMetadata);

function transformComplexFields(data, metadata) {
  const transformed = {};
  for (const [key, value] of Object.entries(data)) {
    const fieldMeta = metadata.find(f => f.name === key);
    if (fieldMeta?.isComplexObject) {
      // Collect sub-fields with pattern: fieldName_subFieldName
      const subFieldValues = {};
      for (const subField of fieldMeta.subFields) {
        const subFieldKey = `${key}_${subField.name}`;
        if (data[subFieldKey]) {
          subFieldValues[subField.name] = data[subFieldKey];
        }
      }
      transformed[key] = subFieldValues;
    } else {
      transformed[key] = value;
    }
  }
  return transformed;
}
```

---

### **OPTION 2: JSON Input with Validation**

**Concept:** Allow users to input complex objects as JSON strings, then parse and validate them.

**How it works:**
1. Detect complex object fields during introspection
2. Show a JSON text area for complex fields
3. Parse JSON input and validate structure
4. Send parsed object to GraphQL

**Pros:**
- ✅ Simple implementation
- ✅ Flexible - users can input any valid JSON
- ✅ Works with deeply nested structures

**Cons:**
- ❌ Poor UX - users must know JSON syntax
- ❌ Error-prone - easy to make JSON syntax errors
- ❌ No validation until execution
- ❌ Not beginner-friendly

**Implementation:**
```typescript
{
  displayName: 'Name (JSON)',
  name: 'name',
  type: 'string',
  typeOptions: {
    editor: 'json',
  },
  default: '{"firstName": "", "lastName": ""}',
  description: 'Full name as JSON object with firstName and lastName',
}
```

---

### **OPTION 3: Hybrid - Auto-expand Common Types, JSON for Complex**

**Concept:** Automatically expand simple complex types (FullName, Links) into sub-fields, but use JSON input for very complex types (Actor with JSON context).

**How it works:**
1. Define a list of "auto-expand" types: FullName, Links, Address, Currency
2. For these types, use dynamic field expansion (Option 1)
3. For other complex types, use JSON input (Option 2)

**Pros:**
- ✅ Good UX for common cases
- ✅ Still handles edge cases
- ✅ Balanced complexity

**Cons:**
- ⚠️ Inconsistent UX (some fields expanded, some JSON)
- ⚠️ Requires maintaining list of auto-expand types

---

### **OPTION 4: Smart Field Wizard (Advanced)**

**Concept:** Create a custom n8n component that shows a wizard-like interface for complex fields.

**How it works:**
1. When user selects a complex field, show a modal/popover
2. Wizard has tabs or sections for each sub-field
3. Collect all sub-field values in one place
4. Store as structured data

**Pros:**
- ✅ Best UX
- ✅ Clear separation of concerns
- ✅ Guided experience

**Cons:**
- ❌ Requires custom n8n component development
- ❌ High complexity
- ❌ May not be compatible with n8n architecture

---

## Recommended Approach: **OPTION 1 (Dynamic Field Expansion)**

### Why Option 1?

1. **Dynamic & Future-Proof**: Works with any complex type Twenty adds in the future
2. **User-Friendly**: Each sub-field is a clear, labeled input
3. **Type-Safe**: Can validate each sub-field individually
4. **n8n Native**: Uses standard n8n field types and displayOptions
5. **No Custom UI**: Works within n8n's existing architecture

### Implementation Plan

#### Phase 1: Enhanced Field Introspection
- Detect complex object types during schema introspection
- For each complex type, introspect its CreateInput type
- Store sub-field metadata in field definitions

#### Phase 2: Dynamic Field Parameter Generation
- When building node properties, generate sub-field parameters
- Use naming convention: `{parentField}_{subField}` (e.g., `name_firstName`)
- Apply `displayOptions` to show sub-fields only when parent is selected

#### Phase 3: Field Transformation Layer
- Before sending to GraphQL, transform flat sub-fields into nested objects
- Example: `{ name_firstName: "John", name_lastName: "Doe" }` → `{ name: { firstName: "John", lastName: "Doe" } }`

#### Phase 4: Testing & Validation
- Test with all complex types: FullName, Links, Address, Currency
- Validate optional vs required sub-fields
- Handle null/undefined values properly

---

## Alternative: Quick Win - Template-Based Approach

If you want a faster implementation with less complexity:

### Template Field System
Create pre-defined templates for known complex types:

```typescript
const COMPLEX_FIELD_TEMPLATES = {
  FullName: {
    fields: [
      { name: 'firstName', type: 'string', required: false },
      { name: 'lastName', type: 'string', required: false },
    ],
  },
  Links: {
    fields: [
      { name: 'primaryLinkUrl', type: 'string', required: false },
      { name: 'primaryLinkLabel', type: 'string', required: false },
    ],
  },
  Address: {
    fields: [
      { name: 'addressStreet1', type: 'string', required: false },
      { name: 'addressCity', type: 'string', required: false },
      { name: 'addressPostcode', type: 'string', required: false },
      { name: 'addressCountry', type: 'string', required: false },
      // ... more fields
    ],
  },
  Currency: {
    fields: [
      { name: 'amountMicros', type: 'number', required: false },
      { name: 'currencyCode', type: 'string', required: false },
    ],
  },
};
```

**Pros:**
- ✅ Simpler implementation
- ✅ Faster to implement
- ✅ Works for current types

**Cons:**
- ❌ Not dynamic - requires updates when Twenty adds new types
- ❌ Maintenance overhead
- ❌ Less flexible

---

## Decision Matrix

| Criteria | Option 1 (Dynamic) | Option 2 (JSON) | Option 3 (Hybrid) | Option 4 (Wizard) | Template |
|----------|-------------------|-----------------|-------------------|-------------------|----------|
| User Experience | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Implementation Complexity | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| Future-Proof | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Maintenance | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Time to Implement | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |

---

## Recommendation

**Start with OPTION 1 (Dynamic Field Expansion)** for the most robust, future-proof solution.

If you need a quicker win, implement the **Template-Based Approach** first, then refactor to dynamic later.

---

## DECIDED APPROACH: Two-Phase Implementation ✅

### Phase 1: Template-Based (Immediate - 4-6 hours)

Implement hardcoded templates for high-priority complex types:

**Priority 1 (CRITICAL):**
- ✅ FullName (Person.name)
- ✅ Links (Company.domainName, linkedinLink, xLink, website)

**Priority 2 (HIGH):**
- ✅ Currency (Company.annualRecurringRevenue)
- ✅ Address (Company/Person.address)

**Deliverable:** v0.2.3 with working Person and Company creation

### Phase 2: Dynamic Introspection (Next Sprint - 2-3 days)

Replace templates with fully dynamic system:
- Query input types via introspection
- Generate fields dynamically
- Support any future complex types Twenty adds
- Better architecture for long-term maintenance

**Deliverable:** v0.3.0 with dynamic complex field support

---

## Field Type Implementation Status

See `FIELD_TYPES_REFERENCE.md` for detailed tracking of all Twenty CRM field types and implementation status.

**Summary:**
- ✅ Simple Scalars: Working (Text, Number, Boolean, DateTime, UUID, etc.)
- 🚧 Complex Objects: In Progress (FullName, Links, Currency, Address)
- 📋 Enums/Selects: Planned (Need dropdown UI with introspected values)
- ❌ Relations: Not Started (Low priority - separate operations needed)

---

Next steps:
1. Confirm approach selection
2. Implement enhanced introspection for complex input types
3. Build field transformation layer
4. Test with FullName, Links, Address, Currency types
