# Twenty CRM Field Types - Implementation Status & Reference

## Overview

This document tracks all field types in Twenty CRM, their characteristics, and implementation status in the n8n node.

Last Updated: October 12, 2025

---

## Field Type Categories

### ✅ Simple Scalar Types (Non-Object) - WORKING

These types are simple values that don't require complex object structures.

| Field Type | GraphQL Type | n8n Type | Status | Example Value | Notes |
|------------|-------------|----------|--------|---------------|-------|
| **Text** | `String` | `string` | ✅ Working | `"John Doe"` | Basic string input |
| **Number** | `Float` / `Int` | `number` | ✅ Working | `42` | Integer or decimal |
| **Boolean** | `Boolean` | `boolean` | ✅ Working | `true` | True/False checkbox |
| **Date Time** | `DateTime` | `dateTime` | ✅ Working | `"2025-10-12T15:30:00Z"` | ISO 8601 timestamp |
| **Date** | `Date` | `dateTime` | ⚠️ Partial | `"2025-10-12"` | Date only (no time) |
| **Time** | `Time` | `string` | ⚠️ Partial | `"15:30:00"` | Time only (no date) |
| **Email** | `String` | `string` | ✅ Working | `"user@example.com"` | Email validation |
| **Phone** | `String` | `string` | ✅ Working | `"+1-555-0123"` | Phone number |
| **UUID** | `UUID` | `string` | ✅ Working | `"550e8400-e29b-41d4-a716-446655440000"` | Unique identifier |

**Implementation:** These work with current implementation - no changes needed.

---

### 🔧 Complex Object Types - NEEDS IMPLEMENTATION

These types require nested object structures in GraphQL.

#### **HIGH PRIORITY** (Blocking core workflows)

| Field Type | GraphQL Input Type | Status | Priority | Notes |
|------------|-------------------|--------|----------|-------|
| **Full Name** | `FullNameCreateInput` | 🚧 In Progress | 🔴 HIGH | Person.name - critical for Person records |
| **Links** | `LinksCreateInput` | 🚧 In Progress | 🔴 HIGH | Company.domainName, linkedinLink, website, etc. |
| **Currency** | `CurrencyCreateInput` | 🚧 In Progress | 🟡 MEDIUM | Company.annualRecurringRevenue |
| **Address** | `AddressCreateInput` | 📋 Planned | 🟡 MEDIUM | Company/Person address |

#### **MEDIUM PRIORITY** (Enhanced functionality)

| Field Type | GraphQL Type | Status | Priority | Notes |
|------------|-------------|--------|----------|-------|
| **Actor** | `ActorCreateInput` | 📋 Planned | 🟢 LOW | System field - usually auto-populated |
| **Position** | `Position` (Scalar) | ⚠️ Unknown | 🟢 LOW | System-managed ordering field |
| **TSVector** | `TSVector` (Scalar) | ⚠️ Unknown | 🟢 LOW | Search vector - system-managed |

---

### ⚡ Enum & Select Types - NEEDS UI ENHANCEMENT

| Field Type | GraphQL Type | Status | Priority | Notes |
|------------|-------------|--------|----------|-------|
| **Select** | Custom Enum (e.g., `CompanyStatusEnum`) | ⚠️ Partial | 🟡 MEDIUM | Need dropdown with enum values |
| **Multi-Select** | `LIST<Enum>` | ❌ Not Started | 🟡 MEDIUM | Need multi-select dropdown |

**Current Issue:** These show as text input, but should be dropdowns with available options.

**Required Enhancement:**
- Introspect enum types to get available values
- Show dropdown UI in n8n
- For multi-select, show multi-select dropdown

---

### 🔗 Relation Types - COMPLEX

| Field Type | GraphQL Type | Status | Priority | Notes |
|------------|-------------|--------|----------|-------|
| **Relation (One-to-Many)** | `{Type}Connection` | ❌ Not Started | 🟢 LOW | Company.people, Company.opportunities |
| **Relation (Many-to-One)** | Object type | ❌ Not Started | 🟢 LOW | Person.accountOwner |

**Current Behavior:** Filtered out from Create/Update operations (correct - should be set via separate relation operations).

**Future Consideration:** May need dedicated "Add Relation" / "Remove Relation" operations.

---

### ❓ Unknown/Special Types

| Field Type | Status | Notes |
|------------|--------|-------|
| **JSON** | ❓ Unknown | Introspected as `JSON` type - need to test |
| **Array** | ❓ Unknown | May be `LIST<Type>` in GraphQL |
| **RawJSON** | ❓ Unknown | Appears in some fields |
| **BigFloat** | ⚠️ Partial | Used for lat/lng, amountMicros - treated as number |

---

## Detailed Type Specifications (From Introspection)

### 1. FullName (FullNameCreateInput)

**Used In:** Person.name

**Structure:**
```typescript
{
  firstName: string;   // optional
  lastName: string;    // optional
}
```

**Implementation Plan:**
```
Field: name (Full Name)
  ⤷ First Name: [         ]  (string input)
  ⤷ Last Name:  [         ]  (string input)
```

**Status:** 🚧 Template-Based implementation in progress

---

### 2. Links (LinksCreateInput)

**Used In:** 
- Company.domainName
- Company.linkedinLink
- Company.xLink
- Company.website
- Company.cvcWebsite

**Structure:**
```typescript
{
  primaryLinkUrl: string;      // optional - e.g., "https://example.com"
  primaryLinkLabel: string;    // optional - e.g., "example.com"
  secondaryLinks: JSON;        // optional - null or JSON object
}
```

**Implementation Plan:**
```
Field: domainName (Domain)
  ⤷ URL:   [                ]  (string input)
  ⤷ Label: [                ]  (string input)
```

**Status:** 🚧 Template-Based implementation in progress

**Note:** Ignoring `secondaryLinks` for now (rarely used, JSON type)

---

### 3. Address (AddressCreateInput)

**Used In:**
- Company.address
- Person.address (if exists)

**Structure:**
```typescript
{
  addressStreet1: string;    // optional
  addressStreet2: string;    // optional
  addressCity: string;       // optional
  addressPostcode: string;   // optional
  addressState: string;      // optional
  addressCountry: string;    // optional
  addressLat: number;        // optional - BigFloat
  addressLng: number;        // optional - BigFloat
}
```

**Implementation Plan:**
```
Field: address (Address)
  ⤷ Street 1:  [         ]  (string input)
  ⤷ Street 2:  [         ]  (string input)
  ⤷ City:      [         ]  (string input)
  ⤷ Postcode:  [         ]  (string input)
  ⤷ State:     [         ]  (string input)
  ⤷ Country:   [         ]  (string input)
  ⤷ Latitude:  [         ]  (number input - optional)
  ⤷ Longitude: [         ]  (number input - optional)
```

**Status:** 📋 Planned (8 sub-fields - higher complexity)

---

### 4. Currency (CurrencyCreateInput)

**Used In:**
- Company.annualRecurringRevenue

**Structure:**
```typescript
{
  amountMicros: number;      // optional - BigFloat (e.g., $100 = 100,000,000)
  currencyCode: string;      // optional - e.g., "USD", "EUR", "GBP"
}
```

**Implementation Plan:**
```
Field: annualRecurringRevenue (Annual Recurring Revenue)
  ⤷ Amount:   [         ]  (number input - converted to micros)
  ⤷ Currency: [USD ▼   ]  (select dropdown with common currencies)
```

**Status:** 🚧 Template-Based implementation in progress

**Note:** Need to convert user input to micros (multiply by 1,000,000)

**Common Currency Codes:**
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)

---

### 5. Actor (ActorCreateInput)

**Used In:**
- createdBy (usually system-populated)

**Structure:**
```typescript
{
  source: ActorSourceEnum;   // optional - ENUM value
  context: JSON;             // optional - JSON object
}
```

**Status:** 🟢 LOW Priority (system field - rarely set manually)

**Note:** This is typically auto-populated by Twenty CRM based on the authenticated user.

---

### 6. Select (Enum Types)

**Examples:**
- Company.status: `CompanyStatusEnum`
- Company.category: `LIST<CompanyCategoryEnum>`

**Current Behavior:** Shown as text input

**Needed Enhancement:**
1. Introspect enum type to get available values
2. Query: `__type(name: "CompanyStatusEnum") { enumValues { name description } }`
3. Show dropdown with enum values
4. For LIST types, show multi-select

**Example Enum Values (CompanyStatusEnum):**
- ACTIVE
- INACTIVE
- PROSPECT
- (need to introspect actual values)

**Status:** ⚠️ Partial - needs dropdown UI

---

## Implementation Roadmap

### Phase 1: Template-Based Complex Objects (Current Sprint)

**Goal:** Get basic CRUD working for Person and Company

**Tasks:**
1. ✅ Introspect complex input types (Done)
2. 🚧 Implement FullName template (In Progress)
3. 🚧 Implement Links template (In Progress)
4. 🚧 Implement Currency template (In Progress)
5. 📋 Implement Address template (Planned)
6. 🧪 Test Person.name creation
7. 🧪 Test Company.domainName creation
8. 📦 Publish v0.2.3

**Target:** Complete within 4-6 hours

---

### Phase 2: Enum/Select Dropdown Support (Next Sprint)

**Goal:** Better UX for enum fields

**Tasks:**
1. Add enum introspection to `getDataSchemaForObject()`
2. Detect enum types and fetch enum values
3. Generate dropdown options in UI
4. Handle multi-select for LIST<Enum>
5. Test with Company.status, Company.category

**Target:** 1-2 days

---

### Phase 3: Dynamic Complex Objects (Future)

**Goal:** Replace templates with dynamic introspection system

**Tasks:**
1. Enhance introspection to query input types
2. Build dynamic field generator
3. Replace hardcoded templates
4. Support any future complex types Twenty adds
5. Handle nested complex types (if they exist)

**Target:** 2-3 days

---

### Phase 4: Advanced Features (Future)

**Tasks:**
- Date/Time picker UI component
- Relation management operations
- JSON field editor
- Validation and error handling improvements

---

## Testing Matrix

| Object | Field | Type | Test Status | Notes |
|--------|-------|------|-------------|-------|
| Person | name | FullName | 🧪 To Test | High priority |
| Person | email | String | ✅ Works | Simple type |
| Company | name | String | ✅ Works | Simple type |
| Company | domainName | Links | 🧪 To Test | High priority |
| Company | employees | Number | ✅ Works | Simple type |
| Company | idealCustomerProfile | Boolean | ✅ Works | Simple type |
| Company | annualRecurringRevenue | Currency | 🧪 To Test | Medium priority |
| Company | address | Address | 📋 Planned | 8 sub-fields |
| Company | status | Enum (Select) | ⚠️ Text Input | Needs dropdown |
| Company | category | LIST<Enum> | ⚠️ Text Input | Needs multi-select |

---

## Known Limitations (Current Implementation)

1. ❌ Complex object fields (FullName, Links, Address, Currency) not supported - **FIXING NOW**
2. ⚠️ Enum fields show as text input instead of dropdown
3. ⚠️ Multi-select fields not supported
4. ❌ Relation fields filtered out from Create/Update (correct behavior)
5. ⚠️ Complex object fields filtered from response (returns only scalars)
6. ⚠️ Date/Time uses text input (no calendar picker)

---

## Questions to Answer (Future Research)

1. **JSON Fields:** How are they used? What format does Twenty expect?
2. **Position Field:** Can it be manually set or is it always system-managed?
3. **TSVector Field:** Is this ever manually populated?
4. **Custom Object Fields:** How do custom complex types work?
5. **Nested Complex Types:** Can a complex type contain another complex type?
6. **Enum Values:** Need to introspect all enum types to get available values

---

## References

- **Introspection Test:** `tests/graphql_introspect_fullname.ts`
- **Implementation Options:** `COMPLEX_FIELDS_IMPLEMENTATION_OPTIONS.md`
- **UI Examples:** `COMPLEX_FIELDS_UI_EXAMPLES.md`
- **Twenty GraphQL Schema:** Accessed via `__type` introspection queries
