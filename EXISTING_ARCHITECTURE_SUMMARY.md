### Summary of Existing n8n Node for Twenty CRM

This document outlines the architecture, functionality, and current state of the provided n8n node for Twenty CRM.

#### **1. Core Architecture: Static and REST-Based**

The most critical finding is that the node is **not a GraphQL node**. It is built using the `@devlikeapro/n8n-openapi-node` library, which automatically generates node properties from a static **OpenAPI (REST API) specification file**.

*   **Key File:** `nodes/Twenty/twenty-v1.0.3-openapi.json`
*   **Mechanism:** The main node file, `Twenty.node.ts`, imports this JSON file and uses a `N8NPropertiesBuilder` to construct the node's user interface and available operations.
*   **Implication:** This architecture is fundamentally static. The node's capabilities are entirely defined by the contents of the OpenAPI specification at the time it was built. It has no built-in mechanism for discovering or adapting to API changes.

#### **2. Functionality: Limited to Standard Objects**

The node's functionality is a direct reflection of its static architecture:

*   **Supported Operations:** It can perform basic CRUD (Create, Read, Update, Delete) operations.
*   **Supported Resources:** It only supports the standard Twenty CRM objects (like Companies, Contacts, etc.) because those are the only ones defined in the `twenty-v1.0.3-openapi.json` file.
*   **No Custom Object Support:** The primary limitation, as identified in the initial problem description, is that this node **cannot interact with custom objects or fields**. The OpenAPI specification is a snapshot of the standard API and is unaware of any workspace-specific customizations.

#### **3. Authentication**

Authentication is handled via the `credentials/TwentyApi.credentials.ts` file.

*   **Method:** It requires two pieces of information from the user:
    1.  **API Key:** A standard API token.
    2.  **Domain:** The URL of the user's Twenty CRM instance.
*   **Implementation:** The API key is sent as a Bearer token in the `Authorization` header of every API request.

#### **4. Path to Implementing Plan 2.0**

Implementing Plan 2.0 will require a **fundamental architectural shift** from a static REST/OpenAPI approach to a **dynamic GraphQL approach**.

*   **Discard OpenAPI:** The `twenty-v1.0.3-openapi.json` file and the `@devlikeapro/n8n-openapi-node` library will no longer be used.
*   **New GraphQL Client:** A GraphQL client (like `graphql-request` or a similar library) will need to be introduced to handle communication with the Twenty CRM API.
*   **Dynamic UI Generation:** The node's properties (the UI) will need to be generated dynamically using the schema discovery methods outlined in Plan 2.0, rather than being generated from a static file.

The existing credential structure can likely be reused, as it already captures the necessary domain and API key.
