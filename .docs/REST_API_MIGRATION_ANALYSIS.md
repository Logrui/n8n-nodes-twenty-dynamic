# REST API Migration Analysis for n8n-nodes-twenty-dynamic

**Date:** October 15, 2025  
**Current Version:** v0.5.26 (Just Published)  
**Purpose:** Identify which operations would benefit from migrating from GraphQL introspection to REST API

---

## Executive Summary

Twenty CRM provides **both REST and GraphQL APIs**. Our current implementation uses GraphQL with introspection, which adds complexity and potential failure points. After analyzing Twenty's REST API, we recommend migrating specific operations to REST for improved reliability and maintainability.

---

## Available Twenty CRM REST API Endpoints

Based on Twenty CRM source code analysis (`twenty-server/src/engine/api/rest/core/`):

### Core REST Endpoints

| HTTP Method | Endpoint Pattern | Purpose | Handler |
|------------|------------------|---------|---------|
| `GET` | `/rest/{resource}` | List/Search records | `RestApiFindManyHandler` |
| `GET` | `/rest/{resource}/{id}` | Get single record | `RestApiFindOneHandler` |
| `POST` | `/rest/{resource}` | Create one record | `RestApiCreateOneHandler` |
| `POST` | `/rest/batch/{resource}` | Create many records | `RestApiCreateManyHandler` |
| `POST` | `/rest/{resource}/duplicates` | Find duplicate records | `RestApiFindDuplicatesHandler` |
| `PATCH` | `/rest/{resource}/{id}` | Update record | `RestApiUpdateOneHandler` |
| `PUT` | `/rest/{resource}/{id}` | Update record (legacy) | `RestApiUpdateOneHandler` |
| `DELETE` | `/rest/{resource}/{id}` | Delete record | `RestApiDeleteOneHandler` |

**Examples:**
- `GET /rest/people/{id}` - Get person by ID
- `GET /rest/companies?filter=...` - List/search companies
- `POST /rest/people` - Create person
- `PATCH /rest/people/{id}` - Update person
- `DELETE /rest/people/{id}` - Delete person

---

## Current n8n Node Operations

Our node currently supports 5 operations:

1. **Create** - Create a new record
2. **Get** - Retrieve a single record by ID
3. **Update** - Update an existing record
4. **Delete** - Delete a record by ID
5. **List/Search** (findMany) - Get multiple records with filters

---

## GraphQL vs REST Comparison by Operation

### 1. GET Operation ⭐ **HIGHEST PRIORITY FOR MIGRATION**

**Current GraphQL Approach:**
```typescript
// Step 1: Introspect Person type (may fail)
query IntrospectPerson {
    __type(name: "Person") {
        fields { name, type { kind, name } }
    }
}

// Step 2: Build field selections based on introspection
// - Map complex types (FullName, Emails, Phones, etc.)
// - Handle unknown types
// - Apply fallback if introspection fails

// Step 3: Execute Get query
query GetPerson($id: UUID!) {
    people(filter: { id: { eq: $id } }) {
        edges {
            node {
                id
                name { firstName lastName }
                emails { primaryEmail additionalEmails }
                // ... 20+ more fields
            }
        }
    }
}
```

**REST API Approach:**
```typescript
// Single HTTP request
GET /rest/people/{id}

// Response automatically includes ALL fields with complex types handled
{
    "data": {
        "person": {
            "id": "...",
            "name": { "firstName": "...", "lastName": "..." },
            "emails": { "primaryEmail": "...", "additionalEmails": [] },
            "phones": { "primaryPhoneNumber": "...", ... },
            // ALL fields returned automatically
        }
    }
}
```

**Complexity Comparison:**
| Metric | GraphQL | REST |
|--------|---------|------|
| **API Calls** | 2 (introspect + get) | 1 (get) |
| **Lines of Code** | ~200+ | ~10 |
| **Complex Type Mapping** | 8+ types manually defined | Server handles automatically |
| **Fallback Logic** | Required (3-tier) | Not needed |
| **Failure Points** | Introspection auth, network, server config | Standard HTTP errors only |
| **Maintenance** | High (update type mappings) | Low (server manages types) |

**Issues Solved by REST:**
- ✅ No more "Field 'name' of type 'FullName' must have a selection of subfields" errors
- ✅ No introspection failures requiring fallback
- ✅ No manual complex type mapping (FullName, Emails, Phones, etc.)
- ✅ Faster response (single request)
- ✅ Simpler code (90% reduction)

**Recommendation:** ⭐ **MIGRATE TO REST IMMEDIATELY**

---

### 2. LIST/SEARCH Operation (findMany) ⭐ **HIGH PRIORITY**

**Current GraphQL Approach:**
```typescript
// Same introspection complexity as Get
// Step 1: Introspect type
// Step 2: Build field selections
// Step 3: Execute query with filters

query ListPeople($filter: PersonFilterInput, $limit: Int) {
    people(filter: $filter, paging: { first: $limit }) {
        edges {
            node {
                // All fields with complex type mapping
            }
        }
        pageInfo { hasNextPage, endCursor }
    }
}
```

**REST API Approach:**
```typescript
GET /rest/people?filter=...&limit=...

// Response with all fields, automatic pagination
{
    "data": {
        "people": [
            { /* all fields */ },
            { /* all fields */ }
        ],
        "pageInfo": { ... }
    }
}
```

**Benefits:**
- Same field selection issues as Get operation
- Pagination handled by REST API
- Filter syntax may differ but simpler

**Recommendation:** ⭐ **MIGRATE TO REST** (after Get operation proven)

---

### 3. CREATE Operation ⚠️ **EVALUATE CAREFULLY**

**Current GraphQL Approach:**
```typescript
// NO INTROSPECTION NEEDED (we already have metadata from schema cache)
mutation CreatePerson($data: PersonCreateInput!) {
    createPerson(data: $data) {
        id
        name { firstName lastName }
        // ... return fields
    }
}
```

**REST API Approach:**
```typescript
POST /rest/people
{
    "name": { "firstName": "...", "lastName": "..." },
    "emails": { "primaryEmail": "..." }
}

// Response includes created record
{
    "data": {
        "person": { /* all fields */ }
    }
}
```

**Complexity Comparison:**
| Aspect | GraphQL | REST |
|--------|---------|------|
| **Introspection** | Not needed (uses cached schema) | Not needed |
| **Input Transformation** | Required (n8n values → GraphQL input) | Required (n8n values → REST body) |
| **Complex Types** | Must format correctly | Must format correctly |
| **Response Fields** | Must specify (can use introspection) | Automatic (all fields) |

**Advantages of REST:**
- Simpler response (all fields automatically)
- Standard HTTP status codes (201 Created)
- May have clearer error messages

**Disadvantages of REST:**
- Still need to transform input data (same as GraphQL)
- Input validation errors may differ
- May lose typed input benefits

**Recommendation:** ⚠️ **EVALUATE** - Benefits are marginal. Current GraphQL works well for Create since we already have schema metadata. REST advantage is mainly in automatic response field selection.

---

### 4. UPDATE Operation ⚠️ **EVALUATE CAREFULLY**

**Current GraphQL Approach:**
```typescript
mutation UpdatePerson($id: UUID!, $data: PersonUpdateInput!) {
    updatePerson(data: $data, id: $id) {
        id
        name { firstName lastName }
        // ... return fields
    }
}
```

**REST API Approach:**
```typescript
PATCH /rest/people/{id}
{
    "name": { "firstName": "Updated" }
}

// Response includes updated record
{
    "data": {
        "person": { /* all fields */ }
    }
}
```

**Similar Trade-offs to Create:**
- Input transformation complexity is the same
- REST provides automatic response fields
- GraphQL works well with cached schema

**Recommendation:** ⚠️ **EVALUATE** - Same reasoning as Create. Marginal benefits. Consider migrating for consistency if Create/Get use REST.

---

### 5. DELETE Operation ✅ **KEEP GRAPHQL OR MIGRATE FOR CONSISTENCY**

**Current GraphQL Approach:**
```typescript
mutation DeletePerson($id: UUID!) {
    deletePerson(id: $id) {
        id
    }
}
```

**REST API Approach:**
```typescript
DELETE /rest/people/{id}

// Response confirms deletion
{
    "data": {
        "person": { "id": "..." }
    }
}
```

**Analysis:**
- Delete is the simplest operation
- GraphQL works perfectly fine
- REST would be equally simple
- No field selection complexity (just ID)

**Recommendation:** ✅ **KEEP GRAPHQL** - Works well, no complexity. Migrate only for API consistency.

---

## Migration Priority Ranking

### Tier 1: Critical - Immediate Benefits ⭐⭐⭐

**1. GET Operation**
- **Priority:** CRITICAL
- **Effort:** Medium (1-2 hours)
- **Impact:** HIGH
  - Eliminates introspection failures
  - Fixes all complex type errors
  - 90% code reduction
  - Faster performance (1 vs 2 requests)
- **Risk:** Low (REST API is stable)
- **User Impact:** Fixes current "FullName error" issues immediately

### Tier 2: High Value - Significant Benefits ⭐⭐

**2. LIST/SEARCH Operation (findMany)**
- **Priority:** HIGH
- **Effort:** Medium (2-3 hours)
- **Impact:** MEDIUM-HIGH
  - Same field selection benefits as Get
  - Better pagination handling
  - Simpler filtering syntax
- **Risk:** Low-Medium (filter syntax may differ)
- **Dependencies:** Prove REST works with Get first

### Tier 3: Moderate Value - Consistency Benefits ⭐

**3. CREATE Operation**
- **Priority:** MEDIUM
- **Effort:** Medium (2-3 hours)
- **Impact:** MEDIUM
  - Automatic response fields
  - Clearer error messages
  - API consistency
- **Risk:** Low-Medium (input transformation still needed)
- **Note:** Current GraphQL works well

**4. UPDATE Operation**
- **Priority:** MEDIUM
- **Effort:** Medium (2-3 hours)
- **Impact:** MEDIUM
  - Same benefits as Create
  - API consistency
- **Risk:** Low-Medium
- **Note:** Current GraphQL works well

### Tier 4: Low Priority - Optional

**5. DELETE Operation**
- **Priority:** LOW
- **Effort:** Low (1 hour)
- **Impact:** LOW
  - Minor consistency benefit only
- **Risk:** Low
- **Note:** Current GraphQL is perfect for this simple operation

---

## Recommended Migration Path

### Phase 1: Immediate (v0.6.0) ⭐ **DO THIS NOW**

**Goal:** Fix the persistent "FullName" errors users are experiencing

**Changes:**
1. Implement REST-based Get operation
2. Keep GraphQL as fallback (feature flag or automatic fallback)
3. Test with People database (complex types)
4. Test with Company database (simpler types)

**Expected Outcomes:**
- Users can reliably get Person records
- No more introspection failures
- Faster Get operations
- Simpler codebase

**Effort:** 2-4 hours  
**Risk:** Low (REST API is production-ready in Twenty CRM)

---

### Phase 2: High Value (v0.7.0) ⭐

**Goal:** Extend REST benefits to List/Search operation

**Changes:**
1. Implement REST-based findMany operation
2. Test pagination with REST API
3. Test filter syntax compatibility
4. Keep GraphQL as fallback

**Expected Outcomes:**
- Consistent field handling across Get and List
- Better pagination performance
- Simpler list queries

**Effort:** 3-5 hours  
**Dependencies:** Phase 1 complete

---

### Phase 3: Consistency (v0.8.0)

**Goal:** Migrate Create/Update for API consistency

**Changes:**
1. Implement REST-based Create operation
2. Implement REST-based Update operation
3. Unified input transformation for REST
4. Consistent error handling

**Expected Outcomes:**
- All major operations use REST
- Consistent API patterns
- Automatic response fields

**Effort:** 4-6 hours  
**Decision:** Re-evaluate after Phase 2. May keep GraphQL if working well.

---

### Phase 4: Complete (v0.9.0)

**Goal:** Full REST API migration (optional)

**Changes:**
1. Migrate Delete operation (optional - works fine in GraphQL)
2. Remove GraphQL fallback code (if REST proven stable)
3. Simplify codebase (remove introspection logic)

**Expected Outcomes:**
- Pure REST API implementation
- Maximum code simplicity
- Unified error handling

**Effort:** 2-3 hours  
**Decision:** Only if Phases 1-3 prove REST superior

---

## Technical Implementation Notes

### REST API Request Pattern

```typescript
// Base URL construction
const baseUrl = credentials.url.replace(/\/graphql$/, '');
const restUrl = `${baseUrl}/rest`;

// GET single record
const response = await fetch(`${restUrl}/people/${recordId}`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    },
});

const result = await response.json();
const person = result.data.person; // All fields included automatically
```

### Response Format

```typescript
// REST API response structure
{
    "data": {
        "{resourceSingular}": {
            // All fields with complex types properly structured
            "id": "uuid",
            "name": { "firstName": "...", "lastName": "..." },
            "emails": { "primaryEmail": "...", "additionalEmails": [] },
            "phones": { "primaryPhoneNumber": "...", ... },
            // ... all other fields
        }
    }
}
```

### Error Handling

```typescript
// REST uses standard HTTP status codes
200 - Success (GET, DELETE, PATCH)
201 - Created (POST)
400 - Bad Request (validation errors)
401 - Unauthorized (invalid API key)
404 - Not Found (record doesn't exist)
500 - Server Error
```

### Depth Parameter Support

Twenty's REST API supports a `depth` parameter for controlling related record loading:

```typescript
// Depth 0: No relations loaded (just foreign key IDs)
GET /rest/people/{id}?depth=0

// Depth 1: Load direct relations (e.g., person.company)
GET /rest/people/{id}?depth=1

// Depth 2+: Not supported (returns 400 error)
```

---

## Code Complexity Reduction Estimate

### Current Implementation (GraphQL)

```
introspection/fieldIntrospection.ts: ~150 lines
operations/get.operation.ts: ~80 lines
COMPLEX_TYPE_SUBFIELDS mapping: ~40 lines
Fallback logic: ~30 lines
Total: ~300 lines of complex logic
```

### Future Implementation (REST)

```
operations/get.operation.ts: ~30 lines (simple HTTP GET)
Error handling: ~10 lines
Total: ~40 lines of simple logic
```

**Reduction:** ~87% less code for Get operation

---

## Risk Assessment

### Low Risk ✅
- Twenty CRM REST API is production-ready (has integration tests)
- REST endpoints are stable and documented
- Fallback to GraphQL always possible
- Can implement gradually (operation by operation)

### Medium Risk ⚠️
- Filter syntax may differ between REST and GraphQL (for findMany)
- Input transformation still needed for Create/Update
- Need to test with all resource types (standard + custom)

### Mitigation Strategies
1. **Feature Flag:** Add `useRestApi` credential option for gradual rollout
2. **Automatic Fallback:** If REST fails, try GraphQL
3. **Comprehensive Testing:** Test with People, Company, custom resources
4. **Version Incrementally:** v0.6.0 (Get), v0.7.0 (List), etc.

---

## Conclusion

**Immediate Action Required:** Migrate **Get operation** to REST API in v0.6.0

**Rationale:**
- Solves persistent user issues (FullName errors)
- Eliminates introspection complexity
- Reduces code by 87%
- Improves performance (1 request vs 2)
- Low risk, high reward

**Next Steps:**
1. ✅ v0.5.26 published (GraphQL fallback fix)
2. 🔨 Implement REST-based Get operation (v0.6.0)
3. 📊 Monitor user feedback on REST vs GraphQL
4. 🚀 Migrate findMany to REST if Get proves successful (v0.7.0)
5. ❓ Re-evaluate Create/Update migration based on data

---

## Questions for User

1. ✅ **IMPLEMENTED in v0.6.0:** Hybrid approach for Get operation
   - GraphQL for database/field selection (metadata)
   - REST API for actual data retrieval
   - Best of both worlds!

2. **Next Steps:** Should we migrate List/Search operation to REST in v0.7.0?

3. **Testing Needed:** Can you test the new REST Get operation with your Twenty instance?

---

**Document Version:** 2.0  
**Last Updated:** October 15, 2025  
**Status:** v0.6.0 Implemented - Ready for Testing
