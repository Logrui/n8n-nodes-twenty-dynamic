# n8n Node Building Best Practices

This document summarizes the key concepts, standards, and best practices for building custom n8n nodes, based on the official n8n documentation.

## Summary of Key Principles

### 1. Two Ways to Build: Declarative vs. Programmatic

n8n offers two styles for creating nodes. The choice depends on your node's complexity and the API you're integrating with.

*   **Declarative Style**:
    *   **What it is**: A simpler, JSON-based approach. You define API requests directly within the node's properties using a `routing` object.
    *   **When to use it**: The recommended default for most nodes, especially those connecting to standard **REST APIs**. It's faster to write and less error-prone.
    *   **Limitation**: It can't handle complex logic, data transformations, or non-REST APIs.

*   **Programmatic Style**:
    *   **What it is**: The traditional, more verbose style where you write TypeScript code inside an `execute()` method to handle logic, build requests, and process data.
    *   **When you MUST use it**:
        *   For **Trigger nodes**.
        *   For non-REST APIs (like **GraphQL**).
        *   When you need to use external libraries/dependencies.
        *   When you need to transform or manipulate incoming data.
        *   For advanced node versioning.

> **Conclusion for this project**: Since the Twenty CRM API is GraphQL-based, the **programmatic style** is required.

### 2. UI Design and User Experience

A good node is more than just a wrapper around an API. The goal is to create a user-friendly interface.

*   **Key Principles**:
    *   **Simplify**: Don't expose every single API parameter. Hide optional or complex fields under an "Optional fields" section.
    *   **Field Order**: The standard is `Credentials` (added automatically), then `Resource`, then `Operation`. Required fields come next, followed by optional ones.
    *   **Consistency**: Use the same terminology as the service's own user interface (for example, if Twenty calls them "Tasks", your node should too). Follow n8n's text styling (e.g., "Title Case" for field names).
    *   **Help Users**: Use hints, tooltips, and clear error messages to guide the user. For ID fields, allow users to select from a list *or* enter an ID manually.

### 3. Code and File Structure

n8n has a standard project structure to keep nodes organized and maintainable.

*   **Required Structure**:
    *   `package.json`: The standard npm manifest file at the root.
    *   `credentials/`: Contains the file for handling API authentication (e.g., `TwentyApi.credentials.ts`).
    *   `nodes/`: Contains the core logic for your node (e.g., `Twenty.node.ts`).

*   **Best Practices**:
    *   **Modularity**: For complex nodes, don't put all your code in one file. It's better to separate logic into different files and directories. A common pattern is to have an `actions` directory for different resources and operations.
    *   **Use the Starter**: Begin new projects with the `n8n-node-starter` template, as it includes the correct structure and linting rules.
    *   **Use TypeScript**: It's the standard for all n8n code.

### 4. Critical Rules for Programmatic Nodes

When writing code in the programmatic style, follow these critical rules:

*   **Never Change Incoming Data**: The data a node receives (`this.getInputData()`) is shared across all nodes in a workflow. If you need to modify it, you **must first clone it** and then return the new, modified data. Failing to do this will cause incorrect behavior in later nodes.
*   **Use the Built-in HTTP Helper**: Do not add external request libraries like `axios` or `node-fetch` yourself. n8n provides a built-in, reliable helper for making API calls:
    *   `this.helpers.httpRequest()` for unauthenticated requests.
    *   `this.helpers.httpRequestWithAuthentication()` for requests that need credentials.
    This practice reduces dependencies, bugs, and potential security issues.

---

## Detailed Guidelines and Standards (from n8n Docs)

### UI Text Style

| Element | Style |
| --- | --- |
| Drop-down value | Title case |
| Hint | Sentence case |
| Info box | Sentence case. Don't use a period (.) for one-sentence information. |
| Node name | Title case |
| Parameter name | Title case |
| Subtitle | Title case |
| Tooltip | Sentence case. Don't use a period (.) for one-sentence tooltips. |

### Node Naming Conventions

| Convention | Correct | Incorrect |
| --- | --- | --- |
| Trigger nodes should end with 'Trigger' | Shopify Trigger | ShopifyTrigger, Shopify trigger |
| Don't include 'node' in the name. | Asana | Asana Node, Asana node |

### Field Conventions

*   **Resources and Operations**: If your node follows a resource/operation pattern, the first field should be `Resource`, and the second should be `Operation`.
*   **Required Fields**: Order by importance and scope (broad to narrow).
*   **Optional Fields**: Group under the **Optional fields** section, ordered alphabetically. If an optional field has a default value, pre-load it and explain it in the description.
*   **IDs**: When specifying a record, provide two ways to do so: a pre-populated list (`loadOptions`) and a manual ID input field. Name the field `<Record name> Name or ID` (e.g., **Workspace Name or ID**).
*   **Toggles**: Use for clear binary states (e.g., **Simplify Output?**). If the negative state is ambiguous, use a dropdown list instead.

### Code Standards

*   **Use the Linter**: Ensure your node passes the `n8n-node-linter` checks before publishing.
*   **Use TypeScript**: All n8n code is written in TypeScript.
*   **Reuse Internal Parameter Names**: For fields that appear across multiple operations (like an ID field), use the same internal `value` but a different `name` (display name). Use `displayOptions` to ensure only one is visible at a time. This preserves user input when they switch between operations.

### HTTP Request Helper (`this.helpers.httpRequest`)

This helper is a wrapper around `Axios` and should be used for all HTTP requests within a programmatic node.

**Usage**:
```typescript
// If no auth needed
const response = await this.helpers.httpRequest(options);

// If auth is needed
const response = await this.helpers.httpRequestWithAuthentication.call(
	this, 
	'credentialTypeName', // The name of your credential
	options,
);
```

**Common `options`**:
*   `url: string` (required)
*   `method?: 'GET' | 'POST' | 'PUT' | 'DELETE'` (defaults to `GET`)
*   `body?: object | Buffer | FormData`
*   `headers?: object`
*   `qs?: object` (for query string parameters)
*   `returnFullResponse?: boolean` (to get headers and status code, not just the body)
*   `skipSslCertificateValidation?: boolean`
