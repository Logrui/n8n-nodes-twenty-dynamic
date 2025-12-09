# Bug Fix: Person Name Field GraphQL Error

**Date**: 2025-12-09
**Status**: Resolved

## 1. Issue Description
*   **Symptoms**: Users encountered the GraphQL error `Field 'name' of type 'FullName' must have a selection of subfields` when creating or updating `Person` records.
*   **Context**: This occurred because the `Person` object in Twenty CRM defines the `name` field as a `FullName` complex type (containing `firstName` and `lastName`), whereas the code was treating it as a simple scalar field or incorrectly assuming metadata ingestion would handle it. Standard `name` fields (e.g. in `Company`) are strings, creating an ambiguity.

## 2. Root Cause Analysis
*   **Investigation**: 
    1.  Used `graphql_introspection.ts` and `test-person-introspection.js` to verify that `Person.name` is an `OBJECT` type (`FullName`) while `Company.name` is a `SCALAR` type (`String`).
    2.  Reproduced the error using `graphql_create_person_fullname.ts` which confirmed that sending a query without subfields for `name` fails for `Person`.
*   **The Cause**: 
    *   The `TransactionApi.client.ts` query builder functions (`buildCreateMutation`, `buildGetQuery`, etc.) were not explicitly requesting subfields for the `name` field when the resource was `person` or `workspaceMember`.
    *   The `ComplexFieldDetection.ts` logic had a global mapping `name: 'FullName'`, which was incorrect because `name` is not *always* a FullName type (it varies by resource). This could lead to incorrect UI field generation or backend processing assumptions.

## 3. The Fix
*   **Changes Made**:
    *   **Modified `nodes/Twenty/TwentyApi.client.ts`**: Updated `buildCreateMutation`, `buildGetQuery`, `buildUpdateMutation`, and `buildListQuery` to include conditional logic. If the resource is `person` or `workspacemember`, the query now explicitly requests:
        ```graphql
        name {
            firstName
            lastName
        }
        ```
    *   **Modified `nodes/Twenty/ComplexFieldDetection.ts`**: Removed `name` from `COMPLEX_FIELD_MAPPINGS` to correct the global assumption. `name` handling is now context-specific based on the resource type or schema introspection.

*   **Code Snippet**:
    ```typescript
    // In TwentyApi.client.ts
    
    // Handle complex name field for Person and WorkspaceMember
    let nameField = 'name';
    const complexNameObjects = ['person', 'workspaceMember', 'workspacemember'];
    if (complexNameObjects.includes(objectNameSingular.toLowerCase())) {
        nameField = 'name {\n\t\t\t\t\tfirstName\n\t\t\t\t\tlastName\n\t\t\t\t}';
    }

    // Add essential fields that should always be requested
    const essentialFields = ['id', 'createdAt', 'updatedAt', 'deletedAt', nameField, 'position', 'searchVector'];
    ```

## 4. Verification
*   **Test Case**: 
    *   Ran `tests/graphql_create_person_fullname.ts` which simulates a GraphQL mutation creating a Person with the nested `name` structure.
    *   Ran `tests/test-person-introspection.js` to verify schema details.
*   **Outcome**: The reproduction test now passes, successfully creating a Person and verifying the response structure. The introspection test confirms the `FullName` type structure is correctly identified.
