# Feature Specification: Dynamic GraphQL-Based n8n Node for Twenty CRM

**Feature Branch**: `001-dynamic-graphql-based`  
**Created**: 2025-10-10  
**Status**: Draft  
**Input**: User description: "Dynamic GraphQL based N8N node for Twenty CRM"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-Discover Custom Objects (Priority: P1)

As a workflow builder, I need the n8n node to automatically detect and display my custom Twenty CRM objects so I can build workflows with my custom data structures without waiting for node updates.

**Why this priority**: This is the core value proposition. Without dynamic schema discovery, users with custom objects cannot use the node effectively, making it no better than static alternatives.

**Independent Test**: Can be fully tested by creating a custom object in Twenty CRM (e.g., "Projects"), waiting up to 10 minutes for cache expiration, and verifying it appears in the node's Resource dropdown. Delivers immediate value by enabling custom object operations.

**Acceptance Scenarios**:

1. **Given** a Twenty workspace with custom objects, **When** user adds the node to a workflow, **Then** all standard and custom objects appear in the Resource dropdown
2. **Given** the user creates a new custom object in Twenty, **When** they click "Force Refresh Schema" in the node, **Then** the new object appears immediately in the Resource dropdown
3. **Given** schema cache is older than 10 minutes, **When** user opens the Resource dropdown, **Then** node automatically fetches fresh schema and displays updated object list

---

### User Story 2 - Perform CRUD Operations on Any Object (Priority: P1)

As a workflow builder, I need to create, read, update, and delete records on any Twenty CRM object (standard or custom) so I can automate my complete business processes.

**Why this priority**: CRUD operations are the fundamental building blocks of any CRM integration. Without this, the node provides no practical value.

**Independent Test**: Can be fully tested by selecting any object (e.g., "Companies"), performing Create/Get/Update/Delete operations, and verifying data changes in Twenty CRM. Delivers complete data manipulation capabilities.

**Acceptance Scenarios**:

1. **Given** user selects an object and "Create" operation, **When** they fill in field values and execute, **Then** a new record is created in Twenty CRM with correct data
2. **Given** user selects an object and "Get" operation, **When** they provide a record ID and execute, **Then** complete record data is returned
3. **Given** user selects an object and "Update" operation, **When** they provide record ID and field changes, **Then** the record is updated in Twenty CRM
4. **Given** user selects an object and "Delete" operation, **When** they provide a record ID and execute, **Then** the record is removed from Twenty CRM
5. **Given** user selects "List/Search" operation, **When** they execute without filters, **Then** all records for that object are returned (up to limit)

---

### User Story 3 - Build Complex Filters Visually (Priority: P2)

As a workflow builder, I need to build complex search filters using a visual interface so I can query specific records without learning GraphQL syntax.

**Why this priority**: While List/Search works without filters, complex queries are essential for practical workflows. Visual filter building dramatically improves usability over raw GraphQL.

**Independent Test**: Can be fully tested by creating multi-condition filters (e.g., "Companies where industry equals 'Technology' AND employee count > 50") and verifying correct results. Delivers advanced querying capabilities without technical knowledge.

**Acceptance Scenarios**:

1. **Given** user selects "List/Search" operation, **When** they add a filter with one condition (e.g., name contains "Acme"), **Then** only matching records are returned
2. **Given** user adds multiple AND conditions, **When** they execute the search, **Then** only records matching ALL conditions are returned
3. **Given** user adds multiple filter groups with OR logic, **When** they execute, **Then** records matching ANY group are returned
4. **Given** user selects different filter operators (equals, not equals, contains, greater than, less than, starts with), **When** they execute, **Then** correct operator logic is applied

---

### User Story 4 - Work with Related Records Easily (Priority: P2)

As a workflow builder, I need to see and select related records from dropdown lists (e.g., select a Company when creating a Contact) so I can build relationships without manually looking up UUIDs.

**Why this priority**: Relational data is core to CRM workflows. Manual UUID entry is error-prone and destroys user experience. This enables intuitive relationship building.

**Independent Test**: Can be fully tested by creating a Contact record, viewing the Company field dropdown populated with all companies, selecting one, and verifying the relationship is correctly created. Delivers intuitive relational data handling.

**Acceptance Scenarios**:

1. **Given** user creates/updates a record with a relational field, **When** they click the field dropdown, **Then** all related records appear as searchable options
2. **Given** user selects a record from the dropdown, **When** they execute the operation, **Then** the relationship is correctly established in Twenty CRM
3. **Given** user prefers manual entry, **When** they provide a record ID directly, **Then** the relationship is established without requiring dropdown selection
4. **Given** a related record doesn't exist, **When** user enters an invalid ID, **Then** a clear error message explains the record wasn't found

---

### User Story 5 - Apply Pre-Configured Views (Priority: P3)

As a workflow builder, I need to select from my Twenty CRM views (pre-configured filters) so I can leverage existing business logic without rebuilding complex filters in n8n.

**Why this priority**: Views represent business-specific logic defined in Twenty. Reusing them saves time and ensures consistency, but workflows can function without this feature using manual filters.

**Independent Test**: Can be fully tested by creating a view in Twenty (e.g., "Active Enterprise Customers"), selecting it in the node's List/Search operation, and verifying correct filtered results. Delivers workflow efficiency through filter reuse.

**Acceptance Scenarios**:

1. **Given** user has created views in Twenty CRM, **When** they select "List/Search" operation, **Then** all views for the selected object appear in a dropdown
2. **Given** user selects a view, **When** they execute the search, **Then** results match the view's filters as defined in Twenty CRM
3. **Given** user selects a view and also adds custom filters, **When** they execute, **Then** both view filters AND custom filters are applied (combined with AND logic)

---

### Edge Cases

- What happens when user's API key is revoked while workflow is running?
- How does the node handle deleted objects that were previously in the schema cache?
- What happens when a relational field references a record that has been deleted?
- How does the node handle network timeouts when fetching schema or executing queries?
- What happens when user provides invalid GraphQL filter syntax in advanced mode?
- How does the node handle concurrent schema changes during cache refresh?
- What happens when Twenty CRM API rate limits are exceeded?
- How does the node handle empty result sets versus error conditions?
- What happens when a required field is missing during Create operation?
- How does the node handle circular relationships in relational fields?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Node MUST query Twenty CRM's metadata endpoint to discover all available objects (standard and custom)
- **FR-002**: Node MUST query Twenty CRM's metadata endpoint to discover all fields for each object, including field types and metadata
- **FR-003**: Node MUST cache discovered schema data for 10 minutes to reduce API calls
- **FR-004**: Users MUST be able to force immediate schema refresh via a toggle/checkbox control
- **FR-005**: Node MUST display all discovered objects in a searchable dropdown (Resource field)
- **FR-006**: Node MUST support Create, Get (by ID), Update, Delete, and List/Search operations for any object
- **FR-007**: Node MUST dynamically display appropriate fields for the selected object and operation
- **FR-008**: For Create and Update operations, node MUST allow users to set values for any writable field
- **FR-009**: For Get operation, node MUST accept a record ID and return complete record data with all available fields
- **FR-010**: For Delete operation, node MUST accept a record ID and remove the record
- **FR-011**: For List/Search operation, node MUST support limiting result count (default and user-configurable)
- **FR-012**: For List/Search operation, node MUST support filtering records using a visual filter builder
- **FR-013**: Filter builder MUST support common operators: equals, not equals, contains, starts with, greater than, less than, in (list)
- **FR-014**: Filter builder MUST support AND logic (multiple conditions, all must match)
- **FR-015**: Filter builder MUST support OR logic (filter groups, any group can match)
- **FR-016**: For relational fields (lookups to other objects), node MUST automatically detect the related object type
- **FR-017**: For relational fields, node MUST provide a searchable dropdown of available related records
- **FR-018**: For relational fields, node MUST also allow manual ID entry as an alternative to dropdown selection
- **FR-019**: Node MUST support selecting from user's pre-configured Twenty CRM views in List/Search operation
- **FR-020**: When a view is selected, node MUST apply that view's filters to the search query
- **FR-021**: Node MUST construct valid GraphQL queries dynamically based on user selections and discovered schema
- **FR-022**: Node MUST authenticate using API key from n8n credentials system
- **FR-023**: Node MUST handle errors gracefully and return user-friendly error messages
- **FR-024**: Node MUST preserve data immutability (not modify incoming workflow data)
- **FR-025**: Node MUST return query results in a format compatible with downstream n8n nodes
- **FR-026**: Node MUST display operation and resource in the node's subtitle for workflow clarity
- **FR-027**: Node MUST provide helpful descriptions and hints for all user-facing fields
- **FR-028**: Schema cache MUST automatically expire after 10 minutes and fetch fresh data on next access
- **FR-029**: Node MUST handle missing or null values in API responses without crashing
- **FR-030**: Node MUST respect field-level permissions and writability as defined in Twenty CRM schema

### Key Entities

- **Twenty CRM Object**: Represents a data type in Twenty (e.g., Company, Contact, or custom object). Has a name, label, fields collection, and metadata. Objects can be standard (built-in) or custom (user-created).

- **Twenty CRM Field**: Represents an attribute of an object. Has a name, label, data type (text, number, date, relation, etc.), and metadata indicating if it's required, writable, or relational. Relational fields reference another object.

- **Schema Metadata**: The complete map of available objects and their fields, retrieved from Twenty CRM's metadata endpoint. Cached for 10 minutes to balance performance and freshness.

- **Filter Condition**: A single query constraint with a field name, operator (eq, neq, contains, etc.), and value. Multiple conditions combine with AND/OR logic.

- **Twenty CRM View**: A pre-configured, saved filter set defined by the user in Twenty CRM. Has a name and embeds filter conditions that can be applied to List/Search operations.

- **Workflow Record**: Input data from upstream n8n nodes or output data to downstream nodes. Represents one or more CRM records being processed in the workflow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can discover and interact with custom objects within 10 minutes of creating them in Twenty CRM (accounting for cache TTL)
- **SC-002**: Users can complete a Create, Get, Update, or Delete operation in under 30 seconds from node configuration to execution
- **SC-003**: Node successfully executes CRUD operations on both standard and custom objects without errors in 95% of valid use cases
- **SC-004**: Users can build multi-condition filters using the visual interface in under 2 minutes without consulting documentation
- **SC-005**: Relational field dropdowns load and display available records within 3 seconds for objects with up to 1000 related records
- **SC-006**: Schema cache reduces API calls by at least 90% compared to fetching schema on every operation
- **SC-007**: Node displays clear, actionable error messages in 100% of failure scenarios (no raw errors exposed)
- **SC-008**: 80% of users successfully configure and execute their first workflow operation without external help
- **SC-009**: Node handles at least 100 records in a single List/Search operation without performance degradation
- **SC-010**: Node maintains data immutability in 100% of executions (no corruption of upstream workflow data)

## Assumptions

- Twenty CRM provides a stable metadata/introspection endpoint for schema discovery
- Users have valid API keys with appropriate permissions for the operations they attempt
- Twenty CRM instances remain accessible during workflow execution (network connectivity available)
- Schema changes in Twenty CRM are infrequent enough that 10-minute cache TTL is acceptable
- Users understand basic CRM concepts (objects, fields, records, relationships)
- Filter operators available in Twenty CRM are compatible with GraphQL standards

## Out of Scope

- Batch operations (creating/updating multiple records in a single operation) - Twenty CRM's current API limitations
- Real-time schema updates (push notifications when schema changes) - polling/cache-based approach only
- Schema migration or versioning across Twenty CRM updates - users responsible for API compatibility
- Raw GraphQL query mode for advanced users - may be added in future, but not in initial release
- Webhook/trigger functionality - this is a polling-based action node only
- Data transformation or mapping tools - users leverage n8n's native expression system
- Custom field validation beyond what Twenty CRM enforces - node passes validation to API
- Offline mode or local schema caching across n8n restarts - cache is runtime only
