# Runtime Test Plan: Twenty CRM n8n Node

**Status**: Code-complete, awaiting runtime validation  
**Created**: 2025-10-11  
**Test Environment Required**: n8n instance + Twenty CRM instance with API access

## Static Validations Completed ✅

- [x] TypeScript compilation (zero errors)
- [x] ESLint validation (all n8n-nodes-base rules pass)
- [x] Function exports verified (all 5 CRUD builders present)
- [x] Operation handlers implemented (all 5 operations in execute method)
- [x] Data immutability confirmed (no mutation of input items)
- [x] GraphQL syntax verified (proper parameterization, no SQL injection risks)
- [x] Error handling uses NodeOperationError (n8n standard)
- [x] Imports/exports resolve correctly

## Runtime Tests Required ⚠️

### Phase 1: Environment Setup

**Prerequisites**:
- [ ] n8n instance running (desktop or self-hosted)
- [ ] Twenty CRM instance accessible
- [ ] Valid API key for Twenty CRM
- [ ] Test domain configured in credentials

**Setup Steps**:
1. Link node to n8n: `npm link` in project directory
2. Link in n8n: `npm link n8n-nodes-twenty-dynamic` in n8n directory
3. Restart n8n
4. Configure Twenty API credentials

---

### Phase 2: Schema Discovery Tests (User Story 1)

#### Test 1.1: Basic Schema Retrieval
- [ ] Add Twenty node to workflow
- [ ] Open Resource dropdown
- [ ] **Expected**: Standard objects appear (Company, Person, Opportunity, etc.)
- [ ] **Verify**: No errors in console
- [ ] **Verify**: Objects sorted (standard before custom)

#### Test 1.2: Custom Object Discovery
- [ ] Create custom object in Twenty CRM (e.g., "Project")
- [ ] In n8n, toggle "Force Refresh Schema" ON
- [ ] Open Resource dropdown
- [ ] **Expected**: Custom object "Project" appears in list
- [ ] **Verify**: Custom objects marked/separated from standard

#### Test 1.3: Cache Behavior
- [ ] Select a resource (cache is warm)
- [ ] Wait 30 seconds
- [ ] Select different resource
- [ ] **Expected**: No new API call (cache hit)
- [ ] Check browser network tab
- [ ] **Verify**: No /metadata request sent

#### Test 1.4: Cache Expiration
- [ ] Wait 11 minutes (cache TTL = 10 min)
- [ ] Open Resource dropdown
- [ ] **Expected**: New API call to /metadata
- [ ] **Verify**: Fresh schema data loaded

#### Test 1.5: Force Refresh
- [ ] Toggle "Force Refresh Schema" ON
- [ ] Open Resource dropdown
- [ ] **Expected**: Immediate API call regardless of cache age
- [ ] Toggle OFF
- [ ] **Verify**: Returns to normal caching behavior

---

### Phase 3: Create Operation Tests (User Story 2 - Part 1)

#### Test 2.1: Create Standard Object Record
- [ ] Select Resource: "Company"
- [ ] Select Operation: "Create One"
- [ ] Open Fields dropdown
- [ ] **Expected**: All writable fields appear (name, domainName, employees, etc.)
- [ ] **Verify**: Fields have type hints (Type: TEXT, Type: NUMBER)

#### Test 2.2: Execute Create with Required Fields
- [ ] Add field: "name" = "Test Company"
- [ ] Execute workflow
- [ ] **Expected**: New company created in Twenty CRM
- [ ] **Output**: JSON with created record (includes id, createdAt)
- [ ] **Verify**: Record visible in Twenty CRM UI

#### Test 2.3: Create with All Field Types
- [ ] Add fields:
  - TEXT: "name" = "Full Test Company"
  - NUMBER: "employees" = 150
  - URL: "domainName" = "example.com"
  - DATE: (if available)
  - BOOLEAN: (if available)
- [ ] Execute
- [ ] **Expected**: All fields saved correctly
- [ ] **Verify**: Data types preserved in Twenty CRM

#### Test 2.4: Create with Missing Required Field
- [ ] Omit required field (e.g., "name")
- [ ] Execute
- [ ] **Expected**: NodeOperationError with validation message
- [ ] **Verify**: User-friendly error (not raw GraphQL error)

#### Test 2.5: Create Custom Object Record
- [ ] Select custom object (e.g., "Project")
- [ ] Add fields from custom schema
- [ ] Execute
- [ ] **Expected**: Custom record created
- [ ] **Verify**: Dynamic field discovery works

---

### Phase 4: Get Operation Tests (User Story 2 - Part 2)

#### Test 3.1: Get Existing Record
- [ ] Copy record ID from Test 2.2
- [ ] Select Operation: "Get One"
- [ ] Enter Record ID
- [ ] Execute
- [ ] **Expected**: Record data returned
- [ ] **Verify**: All fields present in output

#### Test 3.2: Get Non-Existent Record
- [ ] Enter fake UUID: "00000000-0000-0000-0000-000000000000"
- [ ] Execute
- [ ] **Expected**: NodeOperationError "Record with ID not found"
- [ ] **Verify**: Clear error message, no crash

#### Test 3.3: Get with Invalid UUID Format
- [ ] Enter invalid ID: "not-a-uuid"
- [ ] Execute
- [ ] **Expected**: Error about invalid UUID format
- [ ] **Verify**: Validation happens before API call

---

### Phase 5: Update Operation Tests (User Story 2 - Part 3)

#### Test 4.1: Update Single Field (Partial Update)
- [ ] Use existing record ID
- [ ] Select Operation: "Update One"
- [ ] Add ONE field: "name" = "Updated Name"
- [ ] Execute
- [ ] **Expected**: Only "name" changes, other fields unchanged
- [ ] **Verify**: Partial update works (not replacing entire record)

#### Test 4.2: Update Multiple Fields
- [ ] Add fields:
  - "name" = "Multi Update Test"
  - "employees" = 200
- [ ] Execute
- [ ] **Expected**: Both fields updated
- [ ] **Verify**: Changes reflected in Twenty CRM

#### Test 4.3: Update Non-Existent Record
- [ ] Use fake UUID
- [ ] Execute
- [ ] **Expected**: "Record not found" error
- [ ] **Verify**: User-friendly message

#### Test 4.4: Update with Empty Fields
- [ ] Add zero fields
- [ ] Execute
- [ ] **Expected**: Either error or no-op (document behavior)
- [ ] **Verify**: Doesn't crash

---

### Phase 6: Delete Operation Tests (User Story 2 - Part 4)

#### Test 5.1: Delete Existing Record
- [ ] Create test record first
- [ ] Select Operation: "Delete One"
- [ ] Enter record ID
- [ ] Execute
- [ ] **Expected**: Output `{ success: true, id: "<uuid>" }`
- [ ] **Verify**: Record deleted in Twenty CRM (404 on subsequent Get)

#### Test 5.2: Delete Non-Existent Record
- [ ] Use fake UUID
- [ ] Execute
- [ ] **Expected**: "Record not found" error
- [ ] **Verify**: Clear error message

#### Test 5.3: Verify Deletion Warning
- [ ] Check node UI
- [ ] **Verify**: Record ID field shows warning about permanent deletion

---

### Phase 7: List/Search Operation Tests (User Story 2 - Part 5)

#### Test 6.1: List with Default Limit
- [ ] Select Operation: "List/Search"
- [ ] Leave limit at default (50)
- [ ] Execute
- [ ] **Expected**: Array of records (up to 50)
- [ ] **Verify**: Each record has all fields
- [ ] **Verify**: pairedItem links correct

#### Test 6.2: List with Custom Limit
- [ ] Set limit: 10
- [ ] Execute
- [ ] **Expected**: Exactly 10 records (or fewer if less data)
- [ ] **Verify**: Pagination respected

#### Test 6.3: List Empty Object
- [ ] Select object with zero records
- [ ] Execute
- [ ] **Expected**: Empty array `[]`
- [ ] **Verify**: No error on empty result

#### Test 6.4: List with Limit = 1
- [ ] Set limit: 1
- [ ] Execute
- [ ] **Expected**: Single record in array
- [ ] **Verify**: Still returns array, not single object

---

### Phase 8: Error Handling Tests

#### Test 7.1: Invalid API Key
- [ ] Configure credentials with wrong API key
- [ ] Execute any operation
- [ ] **Expected**: "Authentication failed. Check your API key."
- [ ] **Verify**: No raw 401 error exposed

#### Test 7.2: Wrong Domain
- [ ] Configure credentials with invalid domain
- [ ] Execute
- [ ] **Expected**: "Connection failed. Check your Twenty CRM domain."
- [ ] **Verify**: Clear network error message

#### Test 7.3: Network Timeout
- [ ] Simulate slow network (browser dev tools)
- [ ] Execute
- [ ] **Expected**: Timeout error with helpful message
- [ ] **Verify**: Doesn't hang indefinitely

#### Test 7.4: Malformed GraphQL Response
- [ ] (Requires mock/proxy to inject bad response)
- [ ] **Expected**: Graceful error handling
- [ ] **Verify**: Doesn't crash n8n

---

### Phase 9: Integration Tests

#### Test 8.1: Multi-Step Workflow
1. [ ] Create record (createOne)
2. [ ] Get record (findOne) using output from step 1
3. [ ] Update record (updateOne) using same ID
4. [ ] List records (findMany) to verify changes
5. [ ] Delete record (deleteOne)
- [ ] **Verify**: All steps succeed in sequence
- [ ] **Verify**: Data flows between nodes correctly

#### Test 8.2: Loop Through List Results
- [ ] List/Search returns 10 records
- [ ] Connect to Function node
- [ ] Access each item in `$items` array
- [ ] **Verify**: pairedItem tracks correctly
- [ ] **Verify**: All 10 items processable

#### Test 8.3: Conditional Logic
- [ ] Get record
- [ ] Use IF node to check field value
- [ ] Route to different operations based on data
- [ ] **Verify**: Node outputs work with n8n conditionals

---

### Phase 10: Edge Cases

#### Test 9.1: Special Characters in Field Values
- [ ] Create with name: "Test & Company <>"
- [ ] **Expected**: Special chars stored correctly
- [ ] **Verify**: No HTML encoding issues

#### Test 9.2: Very Long Field Values
- [ ] Create with 5000+ character text field
- [ ] **Expected**: Saves successfully
- [ ] **Verify**: No truncation

#### Test 9.3: Null/Empty Values
- [ ] Update optional field to empty string
- [ ] **Expected**: Field cleared or set to null
- [ ] **Verify**: Behavior documented

#### Test 9.4: Schema Change Mid-Workflow
- [ ] Start workflow
- [ ] Add custom field in Twenty CRM
- [ ] Continue workflow (cache may be stale)
- [ ] **Expected**: Either uses cached schema or auto-refreshes
- [ ] **Document**: Cache behavior

---

## Why I Believe It Will Work (Confidence Factors)

### 1. **Code Architecture Matches n8n Patterns**
- Follows official n8n node structure
- Uses `INodeType` interface correctly
- Implements required methods: `execute()`, `loadOptions`
- Error handling with `NodeOperationError` (n8n standard)

### 2. **GraphQL Queries Follow Twenty CRM Conventions**
Based on contracts/twenty-graphql-queries.md:
- Create: `mutation { createX(data: $data) { fields } }`
- Get: `query { x(filter: { id: { eq: $id } }) { edges { node { fields } } } }`
- Update: `mutation { updateX(id: $id, data: $data) { fields } }`
- Delete: `mutation { deleteX(id: $id) { id } }`
- List: `query { xs(paging: { first: $limit }) { edges { node { fields } } } }`

All match the documented Twenty GraphQL schema.

### 3. **Type Safety**
- TypeScript compilation ensures:
  - Function signatures match
  - Return types are correct
  - No undefined references
  - Proper async/await usage

### 4. **Static Analysis Passes**
- ESLint with n8n-nodes-base rules
- No common anti-patterns detected
- Proper error propagation

### 5. **Follows Spec Requirements**
From tasks.md Phase 4 checklist:
- ✅ T021-T027: Create and Get operations
- ✅ T028-T030: Update operation
- ✅ T031-T033: Delete operation
- ✅ T034-T036: List/Search operation
- ✅ T037: Data immutability
- ✅ T038: Subtitle display

### 6. **Previous Working Components**
Phase 2-3 foundation already tested in previous session:
- Schema discovery (T008-T017) worked
- API authentication working
- Cache mechanism functional

---

## Risks & Unknowns ⚠️

### Known Unknowns:
1. **Actual GraphQL schema variations**: Twenty CRM versions may differ
2. **Field type coercion**: How Twenty handles type mismatches
3. **Rate limiting**: API throttling behavior not tested
4. **Large dataset performance**: 1000+ record queries
5. **Relational fields**: Not implemented yet (User Story 4)

### Mitigation:
- User Story 4-5 (filters, relations) not in MVP scope
- Core CRUD tested first before advanced features
- Error messages designed to guide troubleshooting

---

## Test Execution Plan

### Recommended Order:
1. **Day 1**: Environment setup + Schema tests (Phase 1-2)
2. **Day 2**: CRUD operations on standard objects (Phase 3-7)
3. **Day 3**: Error handling + edge cases (Phase 8-10)
4. **Day 4**: Integration workflows + documentation

### Success Criteria:
- [ ] All 5 CRUD operations work on standard object (Company)
- [ ] Schema discovery shows custom objects
- [ ] Cache behavior validated
- [ ] Error messages user-friendly
- [ ] No n8n crashes or hangs

### Failure Scenarios:
If any test fails:
1. Document exact error message
2. Check browser console for stack trace
3. Verify GraphQL query in network tab
4. Test same query in Twenty CRM GraphQL playground
5. Report in GitHub issue with reproduction steps

---

## Automated Testing Future Work

**Not in current scope**, but recommended:
- Unit tests for query builders (Jest)
- Mock Twenty API responses (MSW)
- Integration tests with test Twenty instance
- CI/CD pipeline with test suite

Current approach: **Manual testing first, automate common scenarios later**

---

## Checklist Before Declaring "Production Ready"

- [ ] All Phase 2-7 tests pass
- [ ] At least 2 error scenarios tested (Phase 8)
- [ ] Multi-step workflow works (Phase 9.1)
- [ ] Documentation updated with examples
- [ ] CHANGELOG.md reflects new features
- [ ] README.md has usage instructions
- [ ] Known issues documented

**Current Status**: Code-complete, awaiting runtime validation
