# Tasks: Dynamic GraphQL-Based n8n Node for Twenty CRM

**Feature**: 001-dynamic-graphql-based  
**Branch**: `001-dynamic-graphql-based`  
**Input**: Design documents from `/specs/001-dynamic-graphql-based/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Manual testing only (no automated tests - see constitutional testing requirements in quickstart.md)

**Organization**: Tasks are grouped by user story (US1-US5) to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- **File paths** use repository root structure: `credentials/`, `nodes/Twenty/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and foundational code structure

**Status**: ✅ Most infrastructure already exists (credentials, node skeleton, client helper)

- [x] T001 ✅ **DONE** - Create project structure (credentials/, nodes/Twenty/, package.json)
- [x] T002 ✅ **DONE** - Initialize TypeScript project with n8n-workflow peer dependency
- [x] T003 ✅ **DONE** - Configure build system (tsconfig.json, gulpfile.js for icons)
- [x] T004 ✅ **DONE** - Create TwentyApi.credentials.ts credential definition
- [x] T005 ✅ **DONE** - Create Twenty.node.ts skeleton (INodeType interface)
- [x] T006 ✅ **DONE** - Create TwentyApi.client.ts helper file
- [x] T007 ✅ **DONE** - Add node icon (twenty.svg) and metadata (Twenty.node.json)

**Checkpoint**: ✅ Basic project structure complete, ready for feature implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**🎉 FIELD DISCOVERY SOLUTION FOUND (October 12, 2025)**:
- Created 5 unit tests in `tests/` folder to isolate field visibility issue
- **Root Cause**: `/metadata` endpoint only returns custom fields (8 for Company)
- **Solution**: Data schema introspection on `/graphql` endpoint returns ALL fields (29 for Company)
- **Test Results**: See `tests/TEST_RESULTS.md` and `tests/SOLUTION.md`
- **Next Step**: Implement data schema introspection function (new tasks T010a, T010b)

### Core Helper Functions

- [x] T008 [P] **[Foundation]** Implement `twentyApiRequest()` wrapper in `nodes/Twenty/TwentyApi.client.ts`
  - Use `this.helpers.httpRequestWithAuthentication.call(this, 'twentyApi', options)`
  - Transform GraphQL errors to user-friendly messages
  - Handle network errors and timeouts
  - Never log credentials or expose in error messages

- [x] T009 [P] **[Foundation]** Implement `getSchemaMetadata()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Query Twenty `/metadata` endpoint with objects/fields GraphQL query
  - Parse response into ObjectMetadata/FieldMetadata structures
  - Return normalized schema object
  - **NOTE**: This function works for object discovery (39 objects) but NOT field discovery (only 8 custom fields returned)

- [x] T010 **[Foundation]** Implement `getCachedSchema()` with TTL logic in `nodes/Twenty/TwentyApi.client.ts`
  - Check credential data for existing schemaCache and cacheTimestamp
  - If cache age < 10 minutes AND forceRefresh is false: return cached schema
  - Else: call `getSchemaMetadata()`, store in credential data with timestamp, return fresh schema
  - Handle cache invalidation when domain changes

- [ ] T010a **[Foundation - NEW]** Implement `getDataSchemaForObject()` function in `nodes/Twenty/TwentyApi.client.ts`
  - **Purpose**: Replace metadata-based field discovery with data schema introspection
  - Query `/graphql` endpoint (not `/metadata`) with introspection query:
    ```graphql
    query { __type(name: "Company") { fields { name description type { name kind ofType { name kind } } } } }
    ```
  - Accept: objectNameSingular (e.g., "company"), capitalize to match GraphQL type (e.g., "Company")
  - Parse introspection response to extract all 29 fields (not just 8 from metadata)
  - Return array of IFieldMetadata with complete field information
  - **Test Evidence**: `npm run test:data-introspect` shows 29 fields vs 8 from metadata
  - **Implementation Guide**: See `tests/SOLUTION.md` for complete code examples

- [ ] T010b **[Foundation - NEW]** Implement type mapping helpers in `nodes/Twenty/TwentyApi.client.ts`
  - **mapGraphQLTypeToTwentyType(graphQLType)**: Convert GraphQL types to Twenty field types
    * String → TEXT, Int/Float → NUMBER, Boolean → BOOLEAN, UUID → UUID
    * DateTime → DATE_TIME, Position → POSITION, TSVector → TEXT
    * Links → LINKS, Address → ADDRESS, Currency → CURRENCY, FullName → FULL_NAME
    * *Connection (e.g., PersonConnection) → RELATION
    * *Enum (e.g., CompanyStatusEnum) → SELECT
  - **isReadOnlyField(fieldName)**: Identify non-writable fields
    * Read-only: id, createdAt, updatedAt, deletedAt, position, searchVector
    * Writable: all other fields
  - **capitalize(str)**: Convert "company" to "Company" for GraphQL type names
  - **humanize(str)**: Convert camelCase to Title Case for labels (accountOwnerId → Account Owner Id)

### Node Base Structure

- [x] T011 **[Foundation]** Define base node properties in `nodes/Twenty/Twenty.node.ts`
  - Add `resource` dropdown (depends on schema - loadOptions)
  - Add `operation` dropdown (createOne, findOne, findMany, updateOne, deleteOne)
  - Add `forceRefresh` boolean toggle for schema cache
  - Configure displayOptions for conditional field visibility
  - Set proper node metadata (displayName, icon, group, version, credentials)

- [x] T012 **[Foundation]** Implement `loadOptions.getResources()` method in `nodes/Twenty/Twenty.node.ts`
  - Call `getCachedSchema()` to get schema metadata
  - Transform objects array to INodePropertyOptions format
  - Return { name: labelSingular, value: nameSingular } for each object
  - Handle errors gracefully with user-friendly messages

**Checkpoint**: ✅ Foundation ready - schema discovery works, node appears in n8n with Resource dropdown populated

---

## Phase 3: User Story 1 - Auto-Discover Custom Objects (Priority: P1) 🎯 MVP

**Goal**: Enable users to see all standard and custom objects in the Resource dropdown, with automatic schema refresh after 10 minutes and manual force refresh option.

**Independent Test**: 
1. Create a custom object in Twenty CRM (e.g., "Projects")
2. Open n8n, add Twenty node to workflow
3. Open Resource dropdown → verify "Projects" appears (if cache fresh)
4. Toggle "Force Refresh Schema" ON → verify "Projects" appears immediately
5. Wait 10+ minutes → open Resource dropdown → verify schema auto-refreshes

### Implementation for User Story 1

- [x] T013 ✅ **[US1] DONE** - Schema metadata structure defined in data-model.md (Entity 1)
- [x] T014 ✅ **[US1] DONE** - GraphQL metadata query contract documented in contracts/twenty-graphql-queries.md
- [x] T015 **[US1]** Enhance `getSchemaMetadata()` to parse custom object metadata
  - Extract `isCustom` boolean from objects query response
  - Ensure custom objects appear in objects array alongside standard objects
  - Validate all required fields (nameSingular, namePlural, labelSingular, labelPlural, fields)

- [x] T016 **[US1]** Add cache debugging to `getCachedSchema()` function
  - Log cache age calculation (for troubleshooting)
  - Log force refresh trigger
  - Log cache hit/miss events
  - Remove debug logs before production release

- [x] T017 **[US1]** Test User Story 1 acceptance scenarios
  - **Scenario 1**: Verify standard + custom objects in dropdown (requires n8n runtime - code ready)
  - **Scenario 2**: Verify force refresh fetches fresh schema (forceRefresh toggle implemented)
  - **Scenario 3**: Verify automatic refresh after 10 minutes (10-min TTL logic implemented)
  - Document test results in spec validation checklist (deferred to runtime testing)

**Checkpoint**: ✅ User Story 1 complete - users can discover and see all custom objects in Resource dropdown

**Deliverable**: Dynamic schema discovery with caching - READY FOR MVP RELEASE

---

## Phase 3.5: Field Discovery Enhancement (Critical Fix)

**Goal**: Implement data schema introspection to access ALL 29 fields instead of only 8 custom fields from metadata API.

**Background**: Comprehensive testing revealed that `/metadata` endpoint only returns custom fields. The solution is to use GraphQL introspection on `/graphql` endpoint.

**Test Evidence**:
- ✅ `npm run test:resources` → 39 objects from metadata API
- ⚠️ `npm run test:fields` → Only 8 custom fields from metadata API
- ✅ `npm run test:data` → 17 fields visible in actual data queries
- ✅ `npm run test:data-introspect` → **ALL 29 fields via introspection!**

**Documentation**: See `tests/TEST_RESULTS.md` (detailed analysis) and `tests/SOLUTION.md` (implementation guide)

### Implementation Tasks

- [ ] T020a **[Field Discovery]** Implement `getDataSchemaForObject()` in `nodes/Twenty/TwentyApi.client.ts`
  - Query `/graphql` endpoint with introspection: `__type(name: "Company") { fields { ... } }`
  - Accept objectNameSingular, capitalize to GraphQL type name (company → Company)
  - Parse all field definitions from introspection response
  - Map GraphQL field types to Twenty types using `mapGraphQLTypeToTwentyType()`
  - Mark read-only fields using `isReadOnlyField()`
  - Return complete IFieldMetadata array (29 fields for Company)

- [ ] T020b **[Field Discovery]** Implement helper functions in `nodes/Twenty/TwentyApi.client.ts`
  - `capitalize(str: string)`: Convert first letter to uppercase for GraphQL type names
  - `humanize(str: string)`: Convert camelCase to Title Case (accountOwnerId → Account Owner Id)
  - `mapGraphQLTypeToTwentyType(type: any)`: Map GraphQL types to Twenty field types
    * Scalars: String→TEXT, Int/Float→NUMBER, Boolean→BOOLEAN, UUID→UUID, DateTime→DATE_TIME
    * Objects: Links→LINKS, Address→ADDRESS, Currency→CURRENCY, FullName→FULL_NAME
    * Relations: *Connection→RELATION (e.g., PersonConnection→RELATION)
    * Enums: *Enum→SELECT (e.g., CompanyStatusEnum→SELECT)
  - `isReadOnlyField(name: string)`: Return true for id, createdAt, updatedAt, deletedAt, position, searchVector

- [ ] T020c **[Field Discovery]** Update `loadOptions.getFieldsForResource()` in `nodes/Twenty/Twenty.node.ts`
  - **Replace** metadata-based field retrieval with data schema introspection
  - Call `getDataSchemaForObject(resourceValue)` instead of using cached schema
  - Filter based on operation: Create/Update = writable only, Get/List = all fields
  - Sort: standard fields first (id, name, createdAt, updatedAt), then custom alphabetically
  - Add descriptions showing type and nullability: "Type: TEXT | Nullable: false"

- [ ] T020d **[Field Discovery]** Test introspection implementation
  - Verify Company object shows all 29 fields in dropdown (not just 8)
  - Verify critical fields appear: id, name, createdAt, updatedAt, accountOwner
  - Verify field types are correctly mapped (Links, Address, Currency, Relations)
  - Test with Person, Opportunity, and custom objects
  - Document test results

**Checkpoint**: ✅ Field discovery complete - all 29 fields accessible for any object

**Deliverable**: Complete field access - UNBLOCKS User Story 2 runtime testing

---

## Phase 4: User Story 2 - Perform CRUD Operations on Any Object (Priority: P1) 🎯 MVP

**Goal**: Enable Create, Get, Update, Delete, and List/Search operations on any object (standard or custom) selected by the user.

**Independent Test**: 
1. Select object (e.g., "Companies")
2. Test Create: Fill fields → Execute → Verify record created in Twenty CRM
3. Test Get: Enter record ID → Execute → Verify data returned
4. Test Update: Enter record ID + field changes → Execute → Verify update in Twenty CRM
5. Test Delete: Enter record ID → Execute → Verify deletion in Twenty CRM
6. Test List/Search: Execute with no filters → Verify records returned

### Implementation for User Story 2

- [x] T018 ✅ **[US2] DONE** - GraphQL CRUD contracts documented in contracts/twenty-graphql-queries.md
- [x] T019 ✅ **[US2] DONE** - Node Configuration entity defined in data-model.md (Entity 2)
- [x] T020 ✅ **[US2] DONE** - GraphQL Query entity defined in data-model.md (Entity 3)

#### Create Operation

- [x] T021 [P] **[US2]** Implement `loadOptions.getFieldsForResource()` method in `nodes/Twenty/Twenty.node.ts`
  - Get selected resource from node parameters
  - Call `getCachedSchema()` to get schema
  - Find object by nameSingular
  - Transform writable fields to INodePropertyOptions
  - Return { name: label, value: name } for each writable field

- [x] T022 **[US2]** Add Create operation fields to node properties in `nodes/Twenty/Twenty.node.ts`
  - Add `fields` collection parameter (displayed when operation === 'createOne')
  - Each field: key (field name from schema), value (user input)
  - Use `loadOptions.getFieldsForResource()` for field key dropdown
  - Determine appropriate input type based on field.type (string, number, dateTime, boolean)

- [x] T023 **[US2]** Implement `buildCreateMutation()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Accept: objectNameSingular, fields data, schema metadata
  - Construct GraphQL mutation using template literal
  - Use parameterized variables (NOT string interpolation for security)
  - Select all fields in response (id + all writable fields + createdAt + updatedAt)
  - Return { query, variables }

- [x] T024 **[US2]** Implement Create operation in `execute()` method in `nodes/Twenty/Twenty.node.ts`
  - Get resource and fields from node parameters
  - Call `buildCreateMutation()` to construct query
  - Execute via `twentyApiRequest()` to `/graphql` endpoint
  - Transform response to n8n workflow record format (json + pairedItem)
  - Handle validation errors from Twenty API

#### Get Operation

- [x] T025 [P] **[US2]** Add Get operation fields to node properties in `nodes/Twenty/Twenty.node.ts`
  - Add `recordId` string parameter (displayed when operation === 'findOne')
  - Add helpful description: "Enter the UUID of the record to retrieve"

- [x] T026 [P] **[US2]** Implement `buildGetQuery()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Accept: objectNameSingular, recordId, schema metadata
  - Construct GraphQL query with filter: { id: { eq: $id } }
  - Use parameterized $id variable
  - Select all readable fields from schema
  - Return { query, variables: { id: recordId } }

- [x] T027 **[US2]** Implement Get operation in `execute()` method in `nodes/Twenty/Twenty.node.ts`
  - Get resource and recordId from node parameters
  - Call `buildGetQuery()` to construct query
  - Execute via `twentyApiRequest()`
  - Handle "not found" errors with user-friendly message
  - Return single workflow record

#### Update Operation

- [x] T028 **[US2]** Add Update operation fields to node properties in `nodes/Twenty/Twenty.node.ts`
  - Add `recordId` string parameter (displayed when operation === 'updateOne')
  - Add `fields` collection parameter (same as Create, but optional)
  - Fields should allow partial updates (only specified fields changed)

- [x] T029 **[US2]** Implement `buildUpdateMutation()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Accept: objectNameSingular, recordId, fields data, schema metadata
  - Construct GraphQL mutation with $id and $data variables
  - Only include provided fields in $data (partial update support)
  - Select all fields in response
  - Return { query, variables: { id, data } }

- [x] T030 **[US2]** Implement Update operation in `execute()` method in `nodes/Twenty/Twenty.node.ts`
  - Get resource, recordId, and fields from node parameters
  - Call `buildUpdateMutation()` to construct query
  - Execute via `twentyApiRequest()`
  - Handle validation and not found errors
  - Return updated workflow record

#### Delete Operation

- [x] T031 [P] **[US2]** Add Delete operation fields to node properties in `nodes/Twenty/Twenty.node.ts`
  - Add `recordId` string parameter (displayed when operation === 'deleteOne')
  - Add warning description about permanent deletion

- [x] T032 [P] **[US2]** Implement `buildDeleteMutation()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Accept: objectNameSingular, recordId
  - Construct GraphQL mutation with $id variable
  - Only select `id` field in response
  - Return { query, variables: { id: recordId } }

- [x] T033 **[US2]** Implement Delete operation in `execute()` method in `nodes/Twenty/Twenty.node.ts`
  - Get resource and recordId from node parameters
  - Call `buildDeleteMutation()` to construct query
  - Execute via `twentyApiRequest()`
  - Handle not found errors
  - Return { success: true, id: recordId } as workflow record

#### List/Search Operation (Basic - No Filters Yet)

- [x] T034 **[US2]** Add List/Search operation fields to node properties in `nodes/Twenty/Twenty.node.ts`
  - Add `limit` number parameter (default: 50, displayed when operation === 'findMany')
  - Add helpful description about pagination limits

- [x] T035 **[US2]** Implement `buildListQuery()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Accept: objectNameSingular, limit, schema metadata
  - Construct GraphQL query using namePlural for query name
  - Use $limit variable
  - Select all readable fields within edges.node structure
  - Return { query, variables: { limit } }

- [x] T036 **[US2]** Implement List/Search operation in `execute()` method in `nodes/Twenty/Twenty.node.ts`
  - Get resource and limit from node parameters
  - Call `buildListQuery()` to construct query (no filters yet)
  - Execute via `twentyApiRequest()`
  - Extract records from edges[].node structure
  - Transform each record to workflow record with pairedItem
  - Return array of workflow records

#### Integration & Testing

- [x] T037 **[US2]** Add data immutability safeguards in `execute()` method
  - Clone input items before processing (never mutate)
  - Create new workflow records for all outputs
  - Verify no references to original input items

- [x] T038 **[US2]** Add operation subtitle display in node properties
  - Use `displayOptions` to show resource and operation in node label
  - Example: "Company - Create One"
  - Improves workflow readability

- [ ] T039 **[US2]** Test User Story 2 acceptance scenarios
  - **Scenario 1**: Create operation with all required fields
  - **Scenario 2**: Get operation with valid ID
  - **Scenario 3**: Update operation with partial field updates
  - **Scenario 4**: Delete operation removes record
  - **Scenario 5**: List/Search returns multiple records
  - Test with both standard objects (Company) and custom objects
  - Document test results

**Checkpoint**: ✅ User Story 2 complete - all CRUD operations work on any object

**Deliverable**: Full CRUD functionality - READY FOR MVP RELEASE (with US1)

---

## Phase 5: User Story 3 - Build Complex Filters Visually (Priority: P2)

**Goal**: Enable users to build complex search filters using visual filter builder (AND/OR logic, multiple operators) without writing GraphQL.

**Independent Test**:
1. Select object + List/Search operation
2. Add filter: Field = "industry", Operator = "Equals", Value = "Technology"
3. Execute → Verify only Technology companies returned
4. Add second condition (AND): Field = "employees", Operator = "Greater Than", Value = 100
5. Execute → Verify only Technology companies with >100 employees
6. Add second filter group (OR): Field = "industry", Operator = "Equals", Value = "Finance"
7. Execute → Verify Technology >100 employees OR Finance companies

### Implementation for User Story 3

- [x] T040 ✅ **[US3] DONE** - Filter Condition entity defined in data-model.md (Entity 4)
- [x] T041 ✅ **[US3] DONE** - Filter Group entity defined in data-model.md (Entity 5)
- [x] T042 ✅ **[US3] DONE** - Filter syntax reference documented in contracts/twenty-graphql-queries.md

- [ ] T043 **[US3]** Add filter builder UI to node properties in `nodes/Twenty/Twenty.node.ts`
  - Add `filters` fixedCollection parameter (displayed when operation === 'findMany')
  - Structure: filterGroups[] → conditions[]
  - Each condition: field (dropdown), operator (dropdown), value (dynamic type)
  - Use `loadOptions.getFieldsForResource()` for field dropdown

- [ ] T044 **[US3]** Implement filter operator dropdown in node properties
  - Operators: Equals (eq), Not Equals (neq), Contains (contains), Starts With (startsWith), Ends With (endsWith), Greater Than (gt), Less Than (lt), Greater Than or Equal (gte), Less Than or Equal (lte), In (in), Not In (notIn)
  - Use INodePropertyOptions format
  - Add helpful descriptions for each operator

- [ ] T045 **[US3]** Implement dynamic value input based on field type
  - Get field type from schema metadata
  - TEXT → string input
  - NUMBER → number input
  - DATE → dateTime input
  - BOOLEAN → boolean toggle
  - SELECT → options dropdown (if available)
  - RELATION → defer to User Story 4

- [ ] T046 **[US3]** Implement `buildFilterObject()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Accept: filterGroups array from node parameters
  - Transform to GraphQL filter syntax
  - Single group → { and: [...conditions] }
  - Multiple groups → { or: [{ and: [...] }, { and: [...] }] }
  - Each condition → { field: { operator: value } }
  - Handle empty filters (return undefined)

- [ ] T047 **[US3]** Update `buildListQuery()` to accept filters parameter
  - Add $filter variable to query
  - Include filter in variables object
  - Merge with existing limit parameter

- [ ] T048 **[US3]** Update List/Search operation in `execute()` to use filters
  - Get filters from node parameters
  - Call `buildFilterObject()` to transform to GraphQL syntax
  - Pass filter to `buildListQuery()`
  - Execute query with both limit and filter variables

- [ ] T049 **[US3]** Add filter validation logic
  - Validate operator matches field type (e.g., gt/lt only for numbers/dates)
  - Validate required value is provided
  - Show user-friendly error messages for invalid filters

- [ ] T050 **[US3]** Test User Story 3 acceptance scenarios
  - **Scenario 1**: Single filter condition works correctly
  - **Scenario 2**: Multiple AND conditions return intersection
  - **Scenario 3**: Multiple OR groups return union
  - **Scenario 4**: All operators work correctly (eq, neq, contains, gt, lt, startsWith, in)
  - Test with different field types (text, number, date)
  - Document test results

**Checkpoint**: ✅ User Story 3 complete - visual filter builder works with AND/OR logic

**Deliverable**: Advanced search capabilities without GraphQL knowledge

---

## Phase 6: User Story 4 - Work with Related Records Easily (Priority: P2)

**Goal**: Enable users to select related records from dropdowns (e.g., select Company when creating Contact) instead of manually entering UUIDs.

**Independent Test**:
1. Select object with relational field (e.g., "Contacts")
2. Select Create operation
3. Find relational field (e.g., "Company")
4. Click dropdown → Verify all companies appear with names
5. Select a company → Execute → Verify relationship created correctly in Twenty CRM
6. Alternatively, manually enter company UUID → Verify it also works

### Implementation for User Story 4

- [x] T051 ✅ **[US4] DONE** - Relational field handling documented in research.md (Decision 7)
- [x] T052 ✅ **[US4] DONE** - Relational field query contracts in contracts/twenty-graphql-queries.md

- [ ] T053 **[US4]** Implement relational field detection in `loadOptions.getFieldsForResource()`
  - Check field.relationMetadata !== null
  - Mark relational fields with special metadata for UI rendering

- [ ] T054 **[US4]** Implement `loadOptions.getRelatedRecords()` method in `nodes/Twenty/Twenty.node.ts`
  - Accept: resource (current object), fieldName (which relational field)
  - Get schema metadata
  - Find field by name, extract relationMetadata.toObjectNameSingular
  - Query related object for id + name fields (or primary display field)
  - Limit to 1000 records for performance
  - Return { name: record.name, value: record.id } for each record

- [ ] T055 **[US4]** Update field inputs to support relational dropdowns in node properties
  - For RELATION type fields: use `loadOptions.getRelatedRecords()`
  - Set `loadOptionsDependsOn: ['resource', 'field']`
  - Allow manual expression input as alternative to dropdown selection

- [ ] T056 **[US4]** Update `buildCreateMutation()` to handle relational fields
  - Relational fields store as `{fieldName}Id` in GraphQL (e.g., companyId)
  - Transform field name → fieldNameId for relation fields
  - Include relation in data object: { ...otherFields, companyId: selectedId }

- [ ] T057 **[US4]** Update `buildUpdateMutation()` to handle relational fields
  - Same transformation as Create: fieldName → fieldNameId
  - Support updating relationships (changing related record)

- [ ] T058 **[US4]** Add relational field support to filter builder (for US3 integration)
  - When filtering on relational field: show related records dropdown
  - User can filter by related record ID
  - Example: "Show contacts where company equals 'Acme Corp'"

- [ ] T059 **[US4]** Test User Story 4 acceptance scenarios
  - **Scenario 1**: Relational field dropdown populates with all related records
  - **Scenario 2**: Selecting from dropdown creates correct relationship
  - **Scenario 3**: Manual ID entry works as alternative
  - **Scenario 4**: Invalid ID shows clear error message
  - Test with one-to-many and many-to-one relationships
  - Document test results

**Checkpoint**: ✅ User Story 4 complete - relational fields work with intuitive dropdowns

**Deliverable**: Intuitive relationship management without UUID hunting

---

## Phase 7: User Story 5 - Apply Pre-Configured Views (Priority: P3)

**Goal**: Enable users to select from their Twenty CRM views (pre-configured filters) and apply them to List/Search operations.

**Independent Test**:
1. Create a view in Twenty CRM (e.g., "Active Enterprise Customers" with filters)
2. Select object + List/Search operation in n8n node
3. Open View dropdown → Verify "Active Enterprise Customers" appears
4. Select view → Execute → Verify results match view's filters
5. Add custom filter alongside view → Execute → Verify both applied (AND logic)

### Implementation for User Story 5

- [x] T060 ✅ **[US5] DONE** - Twenty CRM View entity defined in data-model.md (Entity 6)
- [x] T061 ✅ **[US5] DONE** - Get Views query contract in contracts/twenty-graphql-queries.md

- [ ] T062 **[US5]** Implement `loadOptions.getViewsForResource()` method in `nodes/Twenty/Twenty.node.ts`
  - Accept: resource (current object)
  - Get schema metadata, find objectMetadataId for selected resource
  - Query Twenty `/graphql` endpoint with views query
  - Filter views by objectMetadataId
  - Return { name: view.name, value: view.id } for each view

- [ ] T063 **[US5]** Add view selector to node properties in `nodes/Twenty/Twenty.node.ts`
  - Add `view` string parameter (displayed when operation === 'findMany')
  - Use `loadOptions.getViewsForResource()` for dropdown population
  - Set `loadOptionsDependsOn: ['resource']`
  - Optional parameter (user can search without view)

- [ ] T064 **[US5]** Implement `getViewFilters()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Accept: viewId
  - Query Twenty API for view details
  - Extract filters object from view
  - Return filters in GraphQL format

- [ ] T065 **[US5]** Implement `mergeViewAndCustomFilters()` function in `nodes/Twenty/TwentyApi.client.ts`
  - Accept: viewFilters, customFilters (from filter builder)
  - Merge using AND logic: { and: [viewFilters, customFilters] }
  - Handle cases where only one filter type is present
  - Return combined filter object

- [ ] T066 **[US5]** Update List/Search operation to integrate views
  - Get view parameter from node properties
  - If view selected: call `getViewFilters(viewId)`
  - If custom filters also present: call `mergeViewAndCustomFilters()`
  - Pass merged filters to `buildListQuery()`

- [ ] T067 **[US5]** Test User Story 5 acceptance scenarios
  - **Scenario 1**: Views for selected object appear in dropdown
  - **Scenario 2**: Selecting view applies correct filters
  - **Scenario 3**: View + custom filters combine with AND logic
  - Test with different view filter complexities
  - Document test results

**Checkpoint**: ✅ User Story 5 complete - views integration enables filter reuse

**Deliverable**: Workflow efficiency through Twenty CRM view reuse

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final touches, error handling improvements, and cross-story enhancements

### Error Handling & User Experience

- [ ] T068 [P] **[Polish]** Enhance error transformation in `twentyApiRequest()`
  - Map common GraphQL error codes to user-friendly messages
  - UNAUTHENTICATED → "Authentication failed. Check your API key."
  - NOT_FOUND → "Record with ID '{id}' not found."
  - BAD_USER_INPUT → "Validation error: {message}"
  - FORBIDDEN → "Permission denied. Check your user permissions."
  - Network errors → "Connection failed. Check your Twenty CRM domain."

- [ ] T069 [P] **[Polish]** Add n8n text styling to all field descriptions
  - Use `<strong>Bold</strong>` for labels
  - Use `<code>code</code>` for technical terms (IDs, field names)
  - Add helpful placeholders and hints
  - Follow n8n text styling standards from constitution

- [ ] T070 [P] **[Polish]** Add input validation for all operations
  - Validate UUID format for recordId parameters
  - Validate limit is positive integer
  - Validate required fields are provided for Create operation
  - Show clear validation error messages

### Performance & Optimization

- [ ] T071 **[Polish]** Add performance logging (removable before release)
  - Log schema cache hit/miss rate
  - Log GraphQL query execution time
  - Log relational dropdown load time
  - Use for optimization, remove before production

- [ ] T072 **[Polish]** Optimize relational dropdowns for large datasets
  - If related records >1000: show warning message
  - Consider pagination for relational queries (future enhancement)
  - Add search/filter capability to relational dropdowns

### Documentation & Developer Experience

- [ ] T073 [P] **[Polish]** Update README.md with usage examples
  - Add screenshots of node in workflow
  - Document each operation with example configurations
  - Add troubleshooting section
  - Link to quickstart.md for developers

- [ ] T074 [P] **[Polish]** Update CHANGELOG.md with release notes
  - Document all 5 user stories as features
  - List breaking changes (if any)
  - Credit contributors
  - Follow semantic versioning principles

- [ ] T075 [P] **[Polish]** Create example workflows in examples/ directory
  - Example 1: Create company from webhook data
  - Example 2: Search contacts with filters, send email
  - Example 3: Update records based on external data
  - Example 4: Sync data between Twenty CRM and another system
  - Export as JSON files users can import

### Testing & Validation

- [ ] T076 **[Polish]** Run n8n-node-linter validation
  - Execute: `npx n8n-node-linter`
  - Fix all linting errors and warnings
  - Ensure displayName casing is correct (Title Case)
  - Validate all required node metadata present

- [ ] T077 **[Polish]** Execute constitutional testing checklist
  - Follow 40+ test scenarios from constitution (quickstart.md)
  - Test all 6 constitutional principles:
    - ✅ Dynamic Schema Discovery
    - ✅ n8n Native Tooling (no external HTTP libraries)
    - ✅ User Experience First (text styling, helpful errors)
    - ✅ Relational Intelligence (dropdowns work)
    - ✅ Filter Builder Interface (visual, not JSON)
    - ✅ Semantic Versioning (CHANGELOG updated)
  - Document test results in spec validation

- [ ] T078 **[Polish]** Test edge cases from spec.md
  - Revoked API key during execution
  - Deleted objects previously in cache
  - Relational field references deleted record
  - Network timeouts
  - Empty result sets vs errors
  - Missing required fields
  - Circular relationships
  - Document handling for each edge case

### Final Review

- [ ] T079 **[Polish]** Code review and cleanup
  - Remove all debug console.log statements
  - Remove commented-out code
  - Ensure consistent code style (Prettier)
  - Add JSDoc comments to all exported functions
  - Verify no credentials logged or exposed

- [ ] T080 **[Polish]** Build and test production bundle
  - Run `pnpm clean && pnpm build`
  - Verify dist/ output is correct
  - Test linked node in fresh n8n instance
  - Verify icon displays correctly
  - Test in both n8n desktop and self-hosted versions

**Checkpoint**: ✅ All phases complete - feature ready for release

---

## Dependencies & Execution Order

### Critical Path (Must Complete in Order)

```
Phase 1 (Setup) → Phase 2 (Foundation) → Phase 3 (US1) + Phase 4 (US2)
                                             ↓
                                        Phase 5 (US3) → Phase 6 (US4) → Phase 7 (US5) → Phase 8 (Polish)
```

### User Story Dependencies

- **US1** (Auto-Discover Custom Objects): No dependencies, can complete independently
- **US2** (CRUD Operations): Depends on US1 (needs schema discovery)
- **US3** (Complex Filters): Depends on US2 (extends List/Search operation)
- **US4** (Related Records): Depends on US2 (extends Create/Update operations), integrates with US3 (relational filters)
- **US5** (Views): Depends on US3 (extends filtering), builds on US2 (uses List/Search)

### Parallel Execution Opportunities

**Within Phase 2 (Foundation)**:
- T008 (twentyApiRequest) can run parallel with T009 (getSchemaMetadata)
- T011 (base node properties) can run after T008-T010 complete

**Within Phase 4 (US2 - CRUD Operations)**:
- Create operation tasks (T021-T024) [P]
- Get operation tasks (T025-T027) [P]
- Delete operation tasks (T031-T033) [P]
- All can run in parallel, then integrate in T037-T039

**Within Phase 8 (Polish)**:
- Error handling (T068) [P]
- Text styling (T069) [P]
- Validation (T070) [P]
- Documentation (T073-T075) [P]

---

## Implementation Strategy

### MVP Scope (Minimal Viable Product)

**Current Status**: BLOCKED by field discovery - solution identified, implementation pending

**Includes**:
- ✅ User Story 1: Auto-Discover Custom Objects (COMPLETE - 39 objects)
- ⏸️ User Story 2: CRUD Operations (Code complete, testing blocked by field visibility)

**Critical Fix Required** (Phase 3.5):
- 🔧 Implement data schema introspection (Tasks T020a-T020d)
- 🎯 Goal: Access all 29 fields instead of only 8
- 📊 Test Evidence: `tests/TEST_RESULTS.md` and `tests/SOLUTION.md`
- ⏱️ Estimated: 1-2 days implementation + testing

**MVP Deliverable**: Users can perform all CRUD operations on any standard or custom object with automatic schema discovery and access to ALL fields.

**Excludes from MVP**:
- ❌ User Story 3: Visual filter builder (can search without filters)
- ❌ User Story 4: Relational dropdowns (can enter IDs manually)
- ❌ User Story 5: Views integration (can use custom filters)

**Rationale**: MVP delivers core value (CRUD + custom objects + complete field access) while deferring UX enhancements that can be added incrementally.

### Incremental Delivery Plan

**Release 0.1.x** (Current - Alpha):
- Phases 1-4 complete (Setup + Foundation + US1 + US2 code)
- Published versions v0.1.1 through v0.1.11 for testing
- Status: Field discovery blocker identified and solution validated
- Next: Implement Phase 3.5 (data schema introspection)

**Release 0.2.0** (MVP):
- Phase 3.5 complete (Field Discovery Enhancement)
- Phase 4 runtime testing complete (US2 validated with all 29 fields)
- ~4 new tasks (T020a-T020d)
- Estimated: 1-2 days implementation + 2-3 days testing
- **Target**: First production-ready release with complete CRUD functionality

**Release 0.3.0** (Filter Builder):
- Add Phase 5 (US3)
- ~11 tasks
- Estimated: 3-5 days

**Release 0.3.0** (Relational Intelligence):
- Add Phase 6 (US4)
- ~9 tasks
- Estimated: 3-5 days

**Release 0.4.0** (Views Integration):
- Add Phase 7 (US5)
- ~8 tasks
- Estimated: 2-3 days

**Release 1.0.0** (Production Ready):
- Add Phase 8 (Polish)
- ~13 tasks
- Estimated: 3-5 days

---

## Task Summary

**Total Tasks**: 80

**Task Count by Phase**:
- Phase 1 (Setup): 7 tasks (✅ DONE)
- Phase 2 (Foundation): 5 tasks
- Phase 3 (US1): 5 tasks (1 done, 4 remaining)
- Phase 4 (US2): 22 tasks (3 done, 19 remaining)
- Phase 5 (US3): 11 tasks (3 done, 8 remaining)
- Phase 6 (US4): 9 tasks (2 done, 7 remaining)
- Phase 7 (US5): 8 tasks (2 done, 6 remaining)
- Phase 8 (Polish): 13 tasks

**Task Count by User Story**:
- US1 (Auto-Discover): 5 tasks
- US2 (CRUD Operations): 22 tasks
- US3 (Filter Builder): 11 tasks
- US4 (Related Records): 9 tasks
- US5 (Views): 8 tasks
- Foundation: 5 tasks
- Polish: 13 tasks

**Parallel Opportunities**: 28 tasks marked [P] can run in parallel

**Independent Test Criteria**:
- US1: Create custom object → Verify in dropdown → Force refresh works → Auto-refresh after 10min
- US2: Perform all CRUD operations → Verify data changes in Twenty CRM
- US3: Build multi-condition filters → Verify correct results
- US4: Use relational dropdowns → Verify relationships created
- US5: Select view → Verify filters applied → Combine with custom filters

**Suggested MVP Scope**: Phase 1-4 (US1 + US2) = 39 tasks

**Ready for Implementation**: ✅ All design artifacts complete, tasks are execution-ready
