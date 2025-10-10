### Project Plan: The Self-Adapting Twenty CRM Node

This document tracks the development of a dynamic n8n node for Twenty CRM. The core principle is to create a self-adapting node that automatically discovers and adjusts to the Twenty API schema. This is achieved by querying a `/metadata` endpoint to get a map of all available resources and their fields. At runtime, the node dynamically constructs GraphQL query strings based on this schema and the user's input. These queries are then executed using n8n's native HTTP helper, ensuring compliance with best practices by avoiding external dependencies for network requests. A user-driven caching mechanism, via a `Refresh Schema` operation, is implemented to improve performance by storing the discovered schema in the user's credentials.

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

### **Phase 2: Production-Ready Enhancements (Next Steps)**

*Status: In Progress. These tasks will transform the prototype into a robust, user-friendly, and publishable n8n node.*

#### **Stage 3.5: Code Refactoring & Compliance (In Progress)**
- [x] **Refactor API Client:** Replaced the `graphql-request` dependency with n8n's native `this.helpers.httpRequestWithAuthentication` to align with best practices and improve robustness.

#### **Stage 4: Intelligent Schema and Field Handling**
- [x] **Enhance Field Returns:** Modified `Get`, `List/Search`, and `Create/Update` operations to dynamically query for and return *all* available fields for a resource.
- [x] **Implement User-Driven Caching:** Added a `Refresh Schema` operation to the node. This allows users to manually update a schema cache stored in the credential data, improving performance by reducing redundant API calls.
- [ ] **(Optional) Schema Versioning:** Implement a system to detect breaking changes in the schema between refreshes and warn the user.

#### **Stage 5: Advanced UI/UX (Hyper-Dynamic Interface)**
- [x] **Implement Relational Field Assistance:** For fields that are lookups to other records, the node now automatically provides a searchable dropdown list of records, significantly improving the user experience.
- [x] **Build Advanced Filter UI:** Replaced the `Filters (JSON)` text area with a user-friendly filter builder UI that allows for complex `AND`/`OR` conditions.
- [ ] **(Optional) "Raw GraphQL" Escape Hatch:** Add an advanced mode that allows power users to write their own GraphQL queries.

#### **Stage 6: Advanced Operations & Publishing**
- [ ] **~~Implement Batch Processing:~~** *(This task has been removed. A review of the Twenty API source code confirmed that the GraphQL API does not currently support batch mutations for creating or updating records.)*
- [x] **Support for Twenty "Views":** The `List/Search` operation now includes a dropdown to select from a user's pre-configured views in Twenty, automatically applying the view's filters.
- [ ] **Final Review and NPM Publish:** Review the completed node, update documentation, and publish it to the NPM registry.
