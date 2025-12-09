### Project Plan: The Self-Adapting Twenty CRM Node

This document tracks the development of a dynamic n8n node for Twenty CRM. The core principle is to create a self-adapting node that automatically discovers and adjusts to the Twenty API schema. This is achieved by querying a `/metadata` endpoint to get a map of all available resources and their fields. At runtime, the node dynamically constructs GraphQL query strings based on this schema and the user's input. These queries are then executed using n8n's native HTTP helper, ensuring compliance with best practices by avoiding external dependencies for network requests. 

**Cache Strategy**: The node implements a hybrid caching approach with a short TTL (10 minutes) stored in credential data. This balances performance (reducing API calls) with data freshness (schema updates appear relatively quickly). A "Force Refresh Schema" checkbox is available at the top of the node to allow users to bypass the cache on demand and fetch fresh schema data immediately. Simply check the box to refresh, then uncheck it to restore fast loading.

---

### **Phase 1: Build Functional Prototype (Complete)**

*Status: All tasks in this phase are complete. The result is a working prototype with full dynamic CRUD functionality.*

#### **Stage 0: Preparation and Cleanup**
- [x] Uninstall `@devlikeapro/n8n-openapi-node` dependency.
- [x] Install `graphql` and `graphql-request` dependencies.
- [x] Delete obsolete OpenAPI specification files.

#### **Stage 1: Core GraphQL Integration & Resource Discovery**
- [x] Refactor `Twenty.node.ts` to remove static OpenAPI logic.
- [x] Create `TwentyApi.client.ts` helper to provide an authenticated GraphQL client.
- [x] Implement `getTwentyResources` `loadOptions` method to dynamically fetch and display all available objects in the "Resource" dropdown.

#### **Stage 2: Dynamic Operations and Fields**
- [x] Add a static "Operation" dropdown to the UI (`Create/Update`, `Get`, `List/Search`, `Delete`).
- [x] Add a dynamic "Fields" collection property for the `Create/Update` operation.
- [x] Implement `getFieldsForResource` `loadOptions` method to populate the "Field Key" dropdown based on the selected resource.
- [x] Add an "ID" input field for `Get` and `Delete` operations.
- [x] Add "Limit" and "Filters (JSON)" fields for the `List/Search` operation.

#### **Stage 3: Query Generation and Execution**
- [x] Implement the `execute` method to handle the `Create/Update` operation.
- [x] Implement the `execute` method to handle the `Get` operation.
- [x] Implement the `execute` method to handle the `Delete` operation.
- [x] Implement the `execute` method to handle the `List/Search` operation.

---

### **Phase 2: Production-Ready Enhancements**

*Status: BLOCKED - Critical field visibility issue preventing progress.*

---

### **CURRENT STATUS (Updated October 12, 2025)**

**Published Version:** v0.1.11 (Alpha)

**Working Features:**
- ✅ Dynamic resource discovery - All Twenty objects load successfully (39 objects)
- ✅ Operation dropdown displays all 5 CRUD operations
- ✅ Schema caching with 10-minute TTL and force refresh option
- ✅ n8n native HTTP helpers (no external dependencies)
- ✅ GraphQL query construction for all CRUD operations

**CRITICAL BLOCKER - RESOLVED! 🎉**
- ✅ **Field Discovery Solution Found** - Use data schema introspection instead of metadata API
  - **Root Cause Identified**: `/metadata` endpoint only returns custom fields (8 for Company)
  - **Solution**: GraphQL introspection on `/graphql` endpoint returns ALL fields (29 for Company)
  - **Test Results**: 
    * Metadata API: 8 fields (only custom fields + relations)
    * Data API introspection: 29 fields (all standard + custom fields)
  - **Missing Fields Now Available**: id, name, createdAt, updatedAt, deletedAt, accountOwner, createdBy, and 14+ more
  - **Implementation Required**: Switch from metadata-based field discovery to data schema introspection
  - **Testing Evidence**: See `tests/TEST_RESULTS.md` and `tests/SOLUTION.md`

**Test Infrastructure Created:**
- ✅ 5 comprehensive unit tests in `tests/` folder
- ✅ Part 1: Resource query (39 objects) ✅ PASS
- ✅ Part 2: Metadata fields query (8 fields) ⚠️ INCOMPLETE
- ✅ Part 3: Metadata introspection ✅ PASS
- ✅ Part 4: Data query (17 fields) ✅ PASS
- ✅ Part 5: Data introspection (29 fields) ✅ COMPLETE!

**Known Issues:**
- Query execution not fully validated (awaiting field discovery implementation)
- Field type-specific handling not implemented
- Relation field metadata available but needs proper parsing

**Next Steps:**
1. ✅ Root cause identified - metadata API limitation
2. ⏭️ Implement data schema introspection function in `TwentyApi.client.ts`
3. ⏭️ Update `getFieldsForResource` to use data introspection
4. ⏭️ Add GraphQL type mapping helpers
5. ⏭️ Publish v0.2.0 with complete field discovery
6. ⏭️ Complete runtime testing of all CRUD operations

---

#### **Stage 3.5: Code Refactoring & Compliance**
- [x] **Refactor API Client:** Replaced the `graphql-request` dependency with n8n's native `this.helpers.httpRequestWithAuthentication` to align with best practices and improve robustness.
- [x] **Schema Query Adaptation:** Updated GraphQL queries to work with Twenty API v0.40+ schema changes (isUIReadOnly, relation fields)

#### **Stage 4: Intelligent Schema and Field Handling**
- [x] **Enhance Field Returns:** Modified `Get`, `List/Search`, and `Create/Update` operations to dynamically query for and return *all* available fields for a resource.
- [x] **Implement Automatic Caching with TTL:** Implemented a hybrid caching strategy with 10-minute TTL. Schema is automatically fetched when cache is stale, balancing performance with data freshness.
- [x] **Field Discovery Solution Found:** Comprehensive testing revealed metadata API limitation and identified data schema introspection as complete solution
  - **Problem**: `/metadata` endpoint only returns 8 custom fields per object
  - **Solution**: GraphQL introspection on `/graphql` endpoint returns all 29 fields
  - **Test Evidence**: Created 5 unit tests (see `tests/` folder)
    * `npm run test:resources` → 39 objects ✅
    * `npm run test:fields` → 8 fields from metadata ⚠️
    * `npm run test:data` → 17 fields in actual data ✅
    * `npm run test:data-introspect` → 29 fields via introspection ✅
  - **Documentation**: `tests/TEST_RESULTS.md` and `tests/SOLUTION.md` with implementation guide
  - **Next**: Implement `getDataSchemaForObject()` function using introspection
- [ ] **Implement Data Schema Introspection:** Add introspection-based field discovery to replace metadata approach
  - Create `getDataSchemaForObject()` function in `TwentyApi.client.ts`
  - Query `__type(name: "ObjectName") { fields { ... } }` on `/graphql` endpoint
  - Map GraphQL types to Twenty field types
  - Mark read-only fields (id, createdAt, updatedAt, deletedAt)
  - Replace metadata-based logic in `getFieldsForResource`
- [ ] **(Optional) Schema Versioning:** Implement a system to detect breaking changes in the schema between refreshes and warn the user.

#### **Stage 5: Advanced UI/UX (Hyper-Dynamic Interface)**
- [ ] **Implement Relational Field Assistance:** For fields that are lookups to other records, provide searchable dropdown list of records.
  - Status: Ready to implement - data introspection provides complete field metadata including relations
- [ ] **Build Advanced Filter UI:** Replace `Filters (JSON)` text area with user-friendly filter builder UI.
  - Status: Ready to implement once field discovery is complete
- [ ] **(Optional) "Raw GraphQL" Escape Hatch:** Add an advanced mode that allows power users to write their own GraphQL queries.

#### **Stage 6: Advanced Operations & Publishing**
- [ ] **~~Implement Batch Processing:~~** *(This task has been removed. Twenty GraphQL API does not support batch mutations.)*
- [ ] **Support for Twenty "Views":** The `List/Search` operation to include dropdown for pre-configured views.
  - Status: Ready to implement - views endpoint works correctly
- [ ] **Final Review and NPM Publish:** Review the completed node, update documentation, and publish stable version.
  - Status: Blocked by field discovery implementation - v0.2.0 planned after introspection implementation
