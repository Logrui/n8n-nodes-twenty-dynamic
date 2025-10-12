# Complex Field Types Introspection Results

**Date:** October 12, 2025  
**Script:** `introspect-complex-fields.js`  
**Purpose:** Discover schema requirements for EMAILS, PHONES, MULTI_SELECT, SELECT, and RELATION field types

---

## Summary of Findings

### ✅ Found Field Types

1. **EMAILS** - 2 fields found
2. **MULTI_SELECT** - 4 fields found  
3. **SELECT** - 10 fields found
4. **RELATION** - 67 fields found
5. **PHONES** - 0 fields found (but type exists in schema)
6. **RATING** - 0 fields found (not in current schema)

---

## Field Type Structures (From GraphQL Schema)

### 1. EMAILS Type

**Object Structure:**
```typescript
{
  primaryEmail: String
  additionalEmails: JSON  // Array of additional email objects
}
```

**Fields Using EMAILS:**
- `upcomingEvent.sentTo` - Sent To (nullable)
- `person.emails` - Emails / Contact's Emails (not nullable, has default)

**Recommended n8n Input Fields:**
- Primary Email (string)
- Additional Emails (collection/array - complex)

**Transformation Logic:**
```typescript
{
  primaryEmail: "john@example.com",
  additionalEmails: null  // or JSON array
}
```

---

### 2. PHONES Type

**Object Structure:**
```typescript
{
  primaryPhoneNumber: String
  primaryPhoneCountryCode: String
  primaryPhoneCallingCode: String
  additionalPhones: JSON  // Array of additional phone objects
}
```

**Fields Using PHONES:**
- None currently in metadata (but type exists)

**Recommended n8n Input Fields:**
- Primary Phone Number (string)
- Primary Phone Country Code (string) - e.g., "US"
- Primary Phone Calling Code (string) - e.g., "+1"
- Additional Phones (collection/array - complex)

**Transformation Logic:**
```typescript
{
  primaryPhoneNumber: "+1-555-0123",
  primaryPhoneCountryCode: "US",
  primaryPhoneCallingCode: "+1",
  additionalPhones: null  // or JSON array
}
```

---

### 3. MULTI_SELECT Type

**Fields Using MULTI_SELECT:**
- `workflow.statuses` - Statuses / The current statuses of the workflow versions
- `document.category` - Category
- `person.category` - Category
- `email.labelTags` - Label Tags

**Recommended n8n Input:**
- Multi-select dropdown or tags input
- Allows multiple values from predefined options
- Returns array of selected values

**Note:** Need to query field metadata to get available options for each MULTI_SELECT field

**Transformation Logic:**
```typescript
// Array of strings
["option1", "option2", "option3"]
```

---

### 4. SELECT Type

**Fields Using SELECT:**
- `workspaceMember.dateFormat` - Date format (default: 'SYSTEM')
- `workspaceMember.numberFormat` - Number format (default: 'SYSTEM')
- `workspaceMember.timeFormat` - Time format (default: 'SYSTEM')
- `job.status` - Status
- `messageChannel.syncStage` - Sync stage (default: 'FULL_MESSAGE_LIST_FETCH_PENDING')
- `messageChannel.syncStatus` - Sync status
- `calendarChannel.syncStatus` - Sync status
- `viewField.aggregateOperation` - Aggregate operation
- `messageChannelMessageAssociation.direction` - Message Direction (default: 'INCOMING')
- `company.status` - Status

**Recommended n8n Input:**
- Single-select dropdown
- Options loaded dynamically from field metadata

**Note:** Need to query field metadata to get available options for each SELECT field

**Transformation Logic:**
```typescript
// Single string value
"OPTION_VALUE"
```

---

### 5. RELATION Type

**67 RELATION fields found** - These are foreign key relationships to other objects

**Examples:**
- `task.assignee` → workspaceMember
- `opportunity.company` → company
- `person.taskTargets` → task (collection)
- `message.messageThread` → messageThread

**Recommended n8n Input:**
- Resource dropdown to select related object type
- ID input field for the related record's UUID
- Or: Dynamic search/dropdown to find and select related records

**Transformation Logic:**
```typescript
{
  connect: {
    id: "uuid-of-related-record"
  }
}
// or for collections:
{
  connect: [
    { id: "uuid-1" },
    { id: "uuid-2" }
  ]
}
```

**Note:** Relation handling is complex - need to determine if it's:
- One-to-one (single ID)
- One-to-many (array of IDs)
- Many-to-many (array of IDs with junction table)

---

## Implementation Priority

### High Priority (Commonly Used)
1. **EMAILS** - Used for contacts (person.emails)
2. **PHONES** - Common contact field (type exists, ready to use)
3. **SELECT** - Used for status fields and enums

### Medium Priority
4. **MULTI_SELECT** - Used for categorization and tags
5. **RELATION** - Essential for linking records, but complex to implement

### Low Priority
6. **RATING** - Not currently in schema

---

## Next Steps for Implementation

### 1. EMAILS Field Type

**FieldParameters.ts additions:**
```typescript
export const emailsFields: INodeProperties[] = [
  {
    displayName: 'Primary Email',
    name: 'primaryEmail',
    type: 'string',
    displayOptions: {
      show: {
        '/fields.field[0].fieldType': ['emails'],
      },
    },
    default: '',
    description: 'Primary email address',
    placeholder: 'john@example.com',
  },
  // Additional emails - advanced, can be added later
];
```

**FieldTransformation.ts additions:**
```typescript
case 'emails':
  const emails: any = {};
  if (field.primaryEmail) emails.primaryEmail = field.primaryEmail;
  // additionalEmails handling can be added later
  if (Object.keys(emails).length > 0) {
    result[fieldName] = emails;
  }
  break;
```

### 2. PHONES Field Type

**FieldParameters.ts additions:**
```typescript
export const phonesFields: INodeProperties[] = [
  {
    displayName: 'Primary Phone Number',
    name: 'primaryPhoneNumber',
    type: 'string',
    displayOptions: {
      show: {
        '/fields.field[0].fieldType': ['phones'],
      },
    },
    default: '',
    placeholder: '+1-555-0123',
  },
  {
    displayName: 'Country Code',
    name: 'primaryPhoneCountryCode',
    type: 'string',
    displayOptions: {
      show: {
        '/fields.field[0].fieldType': ['phones'],
      },
    },
    default: 'US',
    placeholder: 'US',
  },
  {
    displayName: 'Calling Code',
    name: 'primaryPhoneCallingCode',
    type: 'string',
    displayOptions: {
      show: {
        '/fields.field[0].fieldType': ['phones'],
      },
    },
    default: '+1',
    placeholder: '+1',
  },
];
```

### 3. SELECT Field Type

For SELECT fields, we need to:
1. Detect when a field is SELECT type
2. Query the field metadata to get available options
3. Dynamically populate the dropdown

This requires more complex implementation with `loadOptionsMethod`.

### 4. RELATION Field Type

Relations are the most complex:
1. Need to identify the target object type
2. Provide UI to select/search for related records
3. Handle both single and multi-valued relations

---

## Questions for Implementation

1. **EMAILS/PHONES additionalEmails/additionalPhones:** Should we support adding multiple additional emails/phones, or just the primary for v1?
2. **SELECT options:** Should we auto-detect SELECT fields and load their options dynamically?
3. **RELATION fields:** Should we implement basic relation support (UUID input) or advanced (search/select)?
4. **MULTI_SELECT:** Similar to SELECT - need to load options dynamically

---

## Test Cases Needed

Once implemented, create test cases for:
1. Creating a Person with emails field
2. Creating a Contact with phones field (if we add a phones field to Person)
3. Setting status on Company (SELECT field)
4. Adding categories to Person (MULTI_SELECT field)
5. Linking Task to Company (RELATION field)
