# Twenty CRM GraphQL Query Contracts

**Feature**: 001-dynamic-graphql-based  
**Purpose**: Reference documentation for all GraphQL queries/mutations used by the n8n node

---

## Metadata Queries

### Get Complete Schema

**Purpose**: Fetch all objects and fields from workspace

**Endpoint**: `https://{domain}/metadata`

**Query**:
```graphql
query GetObjects {
  objects(paging: { first: 100 }) {
    edges {
      node {
        id
        nameSingular
        namePlural
        labelSingular
        labelPlural
        isCustom
        fields(paging: { first: 100 }) {
          edges {
            node {
              id
              name
              label
              type
              isNullable
              isWritable
              relationMetadata {
                toObjectMetadata {
                  nameSingular
                }
                relationType
              }
            }
          }
        }
      }
    }
  }
}
```

**Response Structure**:
```json
{
  "data": {
    "objects": {
      "edges": [
        {
          "node": {
            "id": "obj-uuid-1",
            "nameSingular": "company",
            "namePlural": "companies",
            "labelSingular": "Company",
            "labelPlural": "Companies",
            "isCustom": false,
            "fields": {
              "edges": [
                {
                  "node": {
                    "id": "field-uuid-1",
                    "name": "name",
                    "label": "Name",
                    "type": "TEXT",
                    "isNullable": false,
                    "isWritable": true,
                    "relationMetadata": null
                  }
                },
                {
                  "node": {
                    "id": "field-uuid-2",
                    "name": "industry",
                    "label": "Industry",
                    "type": "TEXT",
                    "isNullable": true,
                    "isWritable": true,
                    "relationMetadata": null
                  }
                }
              ]
            }
          }
        }
      ]
    }
  }
}
```

**Cache Strategy**: Store in credential data for 10 minutes

---

### Get Views for Object

**Purpose**: Fetch pre-configured filter views for dropdown

**Endpoint**: `https://{domain}/graphql`

**Query**:
```graphql
query GetViewsForObject($objectMetadataId: UUID!) {
  views(filter: { objectMetadataId: { eq: $objectMetadataId } }) {
    edges {
      node {
        id
        name
        objectMetadataId
        filters
      }
    }
  }
}
```

**Variables**:
```json
{
  "objectMetadataId": "obj-uuid-1"
}
```

**Response Structure**:
```json
{
  "data": {
    "views": {
      "edges": [
        {
          "node": {
            "id": "view-uuid-1",
            "name": "Active Companies",
            "objectMetadataId": "obj-uuid-1",
            "filters": {
              "and": [
                { "status": { "eq": "active" } }
              ]
            }
          }
        }
      ]
    }
  }
}
```

**Used In**: List/Search operation loadOptions for view dropdown

---

## Data Queries (Operations)

### Create Operation (createOne)

**Purpose**: Create a new record in specified object

**Endpoint**: `https://{domain}/graphql`

**Query Template**:
```graphql
mutation Create{ObjectPascalCase}($data: {ObjectPascalCase}CreateInput!) {
  create{ObjectPascalCase}(data: $data) {
    id
    {field1}
    {field2}
    {field3}
    createdAt
    updatedAt
  }
}
```

**Example - Create Company**:
```graphql
mutation CreateCompany($data: CompanyCreateInput!) {
  createCompany(data: $data) {
    id
    name
    industry
    employees
    annualRecurringRevenue {
      amountMicros
      currencyCode
    }
    createdAt
    updatedAt
  }
}
```

**Variables**:
```json
{
  "data": {
    "name": "Acme Corporation",
    "industry": "Technology",
    "employees": 500,
    "annualRecurringRevenue": {
      "amountMicros": 1000000000000,
      "currencyCode": "USD"
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "createCompany": {
      "id": "abc-123-def",
      "name": "Acme Corporation",
      "industry": "Technology",
      "employees": 500,
      "annualRecurringRevenue": {
        "amountMicros": 1000000000000,
        "currencyCode": "USD"
      },
      "createdAt": "2025-10-10T10:00:00Z",
      "updatedAt": "2025-10-10T10:00:00Z"
    }
  }
}
```

**Node Output**: Return response object as single workflow record

---

### Get Operation (findOne)

**Purpose**: Retrieve single record by ID

**Endpoint**: `https://{domain}/graphql`

**Query Template**:
```graphql
query Get{ObjectPascalCase}($id: UUID!) {
  {objectCamelCase}(filter: { id: { eq: $id } }) {
    id
    {field1}
    {field2}
    {field3}
    createdAt
    updatedAt
  }
}
```

**Example - Get Company**:
```graphql
query GetCompany($id: UUID!) {
  company(filter: { id: { eq: $id } }) {
    id
    name
    industry
    employees
    annualRecurringRevenue {
      amountMicros
      currencyCode
    }
    createdAt
    updatedAt
  }
}
```

**Variables**:
```json
{
  "id": "abc-123-def"
}
```

**Response**:
```json
{
  "data": {
    "company": {
      "id": "abc-123-def",
      "name": "Acme Corporation",
      "industry": "Technology",
      "employees": 500,
      "annualRecurringRevenue": {
        "amountMicros": 1000000000000,
        "currencyCode": "USD"
      },
      "createdAt": "2025-10-10T10:00:00Z",
      "updatedAt": "2025-10-10T10:00:00Z"
    }
  }
}
```

**Error Case - Not Found**:
```json
{
  "errors": [
    {
      "message": "Record not found",
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

**Node Output**: Return company object or throw user-friendly error

---

### List/Search Operation (findMany)

**Purpose**: Query multiple records with optional filters, limit, and view

**Endpoint**: `https://{domain}/graphql`

**Query Template**:
```graphql
query Find{ObjectPascalCasePlural}($filter: {ObjectPascalCase}FilterInput, $limit: Int) {
  {objectCamelCasePlural}(filter: $filter, limit: $limit) {
    edges {
      node {
        id
        {field1}
        {field2}
        {field3}
        createdAt
        updatedAt
      }
    }
  }
}
```

**Example 1 - List All Companies (No Filter)**:
```graphql
query FindCompanies($limit: Int) {
  companies(limit: $limit) {
    edges {
      node {
        id
        name
        industry
        employees
        createdAt
      }
    }
  }
}
```

**Variables**:
```json
{
  "limit": 50
}
```

**Example 2 - Search with Single Filter**:
```graphql
query FindCompanies($filter: CompanyFilterInput, $limit: Int) {
  companies(filter: $filter, limit: $limit) {
    edges {
      node {
        id
        name
        industry
        employees
        createdAt
      }
    }
  }
}
```

**Variables**:
```json
{
  "filter": {
    "industry": { "eq": "Technology" }
  },
  "limit": 50
}
```

**Example 3 - Search with AND Filter Group**:
```json
{
  "filter": {
    "and": [
      { "industry": { "eq": "Technology" } },
      { "employees": { "gt": 100 } }
    ]
  },
  "limit": 50
}
```

**Example 4 - Search with OR Filter Groups**:
```json
{
  "filter": {
    "or": [
      {
        "and": [
          { "industry": { "eq": "Technology" } },
          { "employees": { "gt": 100 } }
        ]
      },
      {
        "and": [
          { "industry": { "eq": "Finance" } },
          { "annualRecurringRevenue": { "gt": 1000000000000 } }
        ]
      }
    ]
  },
  "limit": 100
}
```

**Example 5 - Search with View + Custom Filters**:
```json
{
  "filter": {
    "and": [
      { "status": { "eq": "active" } },
      { "industry": { "eq": "Technology" } }
    ]
  },
  "limit": 50
}
```
Note: View filters are merged with custom filters using AND logic

**Response**:
```json
{
  "data": {
    "companies": {
      "edges": [
        {
          "node": {
            "id": "abc-123",
            "name": "Tech Corp A",
            "industry": "Technology",
            "employees": 250,
            "createdAt": "2025-10-01T10:00:00Z"
          }
        },
        {
          "node": {
            "id": "def-456",
            "name": "Tech Corp B",
            "industry": "Technology",
            "employees": 150,
            "createdAt": "2025-10-05T10:00:00Z"
          }
        }
      ]
    }
  }
}
```

**Node Output**: Extract node objects, create workflow record per result

---

### Update Operation (updateOne)

**Purpose**: Update existing record by ID

**Endpoint**: `https://{domain}/graphql`

**Query Template**:
```graphql
mutation Update{ObjectPascalCase}($id: UUID!, $data: {ObjectPascalCase}UpdateInput!) {
  update{ObjectPascalCase}(id: $id, data: $data) {
    id
    {field1}
    {field2}
    {field3}
    updatedAt
  }
}
```

**Example - Update Company**:
```graphql
mutation UpdateCompany($id: UUID!, $data: CompanyUpdateInput!) {
  updateCompany(id: $id, data: $data) {
    id
    name
    industry
    employees
    annualRecurringRevenue {
      amountMicros
      currencyCode
    }
    updatedAt
  }
}
```

**Variables (Partial Update)**:
```json
{
  "id": "abc-123-def",
  "data": {
    "employees": 550,
    "annualRecurringRevenue": {
      "amountMicros": 1200000000000,
      "currencyCode": "USD"
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "updateCompany": {
      "id": "abc-123-def",
      "name": "Acme Corporation",
      "industry": "Technology",
      "employees": 550,
      "annualRecurringRevenue": {
        "amountMicros": 1200000000000,
        "currencyCode": "USD"
      },
      "updatedAt": "2025-10-10T11:00:00Z"
    }
  }
}
```

**Node Output**: Return updated object as single workflow record

---

### Delete Operation (deleteOne)

**Purpose**: Delete record by ID

**Endpoint**: `https://{domain}/graphql`

**Query Template**:
```graphql
mutation Delete{ObjectPascalCase}($id: UUID!) {
  delete{ObjectPascalCase}(id: $id) {
    id
  }
}
```

**Example - Delete Company**:
```graphql
mutation DeleteCompany($id: UUID!) {
  deleteCompany(id: $id) {
    id
  }
}
```

**Variables**:
```json
{
  "id": "abc-123-def"
}
```

**Response**:
```json
{
  "data": {
    "deleteCompany": {
      "id": "abc-123-def"
    }
  }
}
```

**Node Output**: Return `{ success: true, id: "abc-123-def" }`

---

## Filter Syntax Reference

### Comparison Operators

**Equality**:
```json
{ "field": { "eq": "value" } }          // Equals
{ "field": { "neq": "value" } }         // Not equals
```

**Numeric/Date Comparison**:
```json
{ "field": { "gt": 100 } }              // Greater than
{ "field": { "gte": 100 } }             // Greater than or equal
{ "field": { "lt": 100 } }              // Less than
{ "field": { "lte": 100 } }             // Less than or equal
```

**String Operations**:
```json
{ "field": { "contains": "text" } }     // Case-insensitive contains
{ "field": { "startsWith": "pre" } }    // Case-insensitive starts with
{ "field": { "endsWith": "suf" } }      // Case-insensitive ends with
```

**List Operations**:
```json
{ "field": { "in": ["val1", "val2"] } } // Value in list
{ "field": { "notIn": ["val1"] } }      // Value not in list
```

### Logical Operators

**AND (All conditions must match)**:
```json
{
  "and": [
    { "field1": { "eq": "value1" } },
    { "field2": { "gt": 100 } }
  ]
}
```

**OR (Any condition can match)**:
```json
{
  "or": [
    { "field1": { "eq": "value1" } },
    { "field2": { "eq": "value2" } }
  ]
}
```

**Combined (AND groups with OR)**:
```json
{
  "or": [
    {
      "and": [
        { "status": { "eq": "active" } },
        { "industry": { "eq": "Tech" } }
      ]
    },
    {
      "and": [
        { "status": { "eq": "pending" } },
        { "priority": { "eq": "high" } }
      ]
    }
  ]
}
```

---

## Relational Field Queries

### Query Related Object for Dropdown

**Purpose**: Get ID + name pairs for relation field dropdowns

**Example - Get Companies for Contact's Company Field**:
```graphql
query GetCompaniesForDropdown($limit: Int) {
  companies(limit: $limit) {
    edges {
      node {
        id
        name
      }
    }
  }
}
```

**Variables**:
```json
{
  "limit": 1000
}
```

**Response**:
```json
{
  "data": {
    "companies": {
      "edges": [
        { "node": { "id": "abc-123", "name": "Acme Corp" } },
        { "node": { "id": "def-456", "name": "Tech Inc" } }
      ]
    }
  }
}
```

**Node UI**: Populate dropdown with `name` labels and `id` values

### Create with Relation

**Example - Create Contact with Company**:
```graphql
mutation CreateContact($data: ContactCreateInput!) {
  createContact(data: $data) {
    id
    firstName
    lastName
    email
    company {
      id
      name
    }
    createdAt
  }
}
```

**Variables**:
```json
{
  "data": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "companyId": "abc-123"
  }
}
```

**Response** (includes related object):
```json
{
  "data": {
    "createContact": {
      "id": "contact-uuid-1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "company": {
        "id": "abc-123",
        "name": "Acme Corp"
      },
      "createdAt": "2025-10-10T12:00:00Z"
    }
  }
}
```

---

## Error Response Contracts

### GraphQL Error Structure

**Standard Error Response**:
```json
{
  "errors": [
    {
      "message": "User-readable error message",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["fieldName"],
      "extensions": {
        "code": "ERROR_CODE",
        "additionalInfo": "..."
      }
    }
  ],
  "data": null
}
```

### Common Error Codes

**Authentication Errors**:
```json
{
  "errors": [
    {
      "message": "Invalid API key",
      "extensions": { "code": "UNAUTHENTICATED" }
    }
  ]
}
```
**Node Handling**: "Authentication failed. Check your API key in Twenty CRM credentials."

**Not Found Errors**:
```json
{
  "errors": [
    {
      "message": "Record not found",
      "extensions": { "code": "NOT_FOUND" }
    }
  ]
}
```
**Node Handling**: "Record with ID 'abc-123' not found in Twenty CRM."

**Validation Errors**:
```json
{
  "errors": [
    {
      "message": "Validation failed for field 'email'",
      "extensions": {
        "code": "BAD_USER_INPUT",
        "field": "email",
        "validationErrors": ["Invalid email format"]
      }
    }
  ]
}
```
**Node Handling**: "Validation error: Invalid email format for field 'email'."

**Permission Errors**:
```json
{
  "errors": [
    {
      "message": "Insufficient permissions",
      "extensions": { "code": "FORBIDDEN" }
    }
  ]
}
```
**Node Handling**: "Permission denied. Check your Twenty CRM user permissions."

---

## HTTP Request Headers

### Required Headers

**All Requests**:
```
Authorization: Bearer {apiKey}
Content-Type: application/json
```

**Example using n8n helper**:
```typescript
const response = await this.helpers.httpRequestWithAuthentication.call(
  this,
  'twentyApi',
  {
    method: 'POST',
    url: `${credentials.domain}/graphql`,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      query: graphqlQueryString,
      variables: graphqlVariables,
    },
    json: true,
  }
);
```

**Note**: Authorization header is added automatically by n8n credential system

---

## Contract Status

✅ **Complete** - All CRUD operations documented with examples, filter syntax defined, error handling specified

**Next**: Create quickstart.md developer guide

