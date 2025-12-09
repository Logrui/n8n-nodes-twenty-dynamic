# JSON Input for Complex Fields - User Guide

**Version:** v0.2.4+  
**Last Updated:** January 12, 2025

---

## Overview

Twenty CRM has complex object fields like **FullName**, **Links**, **Currency**, and **Address** that require nested data structures. This guide shows you how to use them in the n8n Twenty CRM - Dynamic node.

---

## Quick Start

### 1. Create a Person with Name (FullName)

**What you need:**
- First name: `John`
- Last name: `Doe`

**How to input:**

1. Add a **Twenty CRM - Dynamic** node
2. Select **Object:** `person`
3. Select **Operation:** `Create One`
4. Click **Add Field**
5. **Field Name:** Select `name (Full name)`
6. **Field Value:** Enter this JSON:
```json
{
  "firstName": "John",
  "lastName": "Doe"
}
```
7. Execute the workflow ✅

**Result:** Person created with structured name!

---

## Field Type Examples

### FullName

**Used in:** Person.name, Opportunity.pointOfContact

**Structure:**
```json
{
  "firstName": "string",
  "lastName": "string"
}
```

**Example:**
```json
{
  "firstName": "Alice",
  "lastName": "Johnson"
}
```

**Both fields optional** - you can use just firstName or just lastName:
```json
{"firstName": "Madonna"}
```

---

### Links

**Used in:** Company.domainName, Person.linkedinLink, Company.linkedinLink, Company.xLink, Company.website

**Structure:**
```json
{
  "primaryLinkUrl": "string",
  "primaryLinkLabel": "string"
}
```

**Example - Company Domain:**
```json
{
  "primaryLinkUrl": "https://acme.com",
  "primaryLinkLabel": "acme.com"
}
```

**Example - LinkedIn:**
```json
{
  "primaryLinkUrl": "https://linkedin.com/in/johndoe",
  "primaryLinkLabel": "John Doe's LinkedIn"
}
```

**Example - Website:**
```json
{
  "primaryLinkUrl": "https://myportfolio.com",
  "primaryLinkLabel": "My Portfolio"
}
```

---

### Currency

**Used in:** Company.annualRecurringRevenue

**Structure:**
```json
{
  "amountMicros": number,
  "currencyCode": "string"
}
```

**⚠️ IMPORTANT:** Amount is in **micros** (1,000,000 micros = $1.00)

**Example - $100,000 ARR:**
```json
{
  "amountMicros": 100000000000,
  "currencyCode": "USD"
}
```

**Example - €50,000 ARR:**
```json
{
  "amountMicros": 50000000000,
  "currencyCode": "EUR"
}
```

**Currency Codes:**
- USD - US Dollar
- EUR - Euro
- GBP - British Pound
- JPY - Japanese Yen
- CAD - Canadian Dollar
- AUD - Australian Dollar
- CHF - Swiss Franc
- CNY - Chinese Yuan

**💡 Conversion Formula:**
```
amountMicros = amount × 1,000,000
```

**Examples:**
- $1 = 1,000,000 micros
- $100 = 100,000,000 micros
- $1,000 = 1,000,000,000 micros
- $10,000 = 10,000,000,000 micros
- $100,000 = 100,000,000,000 micros
- $1,000,000 = 1,000,000,000,000 micros

---

### Address

**Used in:** Company.address, Person.address

**Structure:**
```json
{
  "addressStreet1": "string",
  "addressStreet2": "string (optional)",
  "addressCity": "string",
  "addressPostcode": "string",
  "addressState": "string",
  "addressCountry": "string",
  "addressLat": number (optional),
  "addressLng": number (optional)
}
```

**Example - Full Address:**
```json
{
  "addressStreet1": "123 Main Street",
  "addressStreet2": "Suite 100",
  "addressCity": "New York",
  "addressPostcode": "10001",
  "addressState": "NY",
  "addressCountry": "United States",
  "addressLat": 40.7128,
  "addressLng": -74.0060
}
```

**Example - Minimal Address:**
```json
{
  "addressStreet1": "456 Oak Ave",
  "addressCity": "San Francisco",
  "addressPostcode": "94102",
  "addressState": "CA",
  "addressCountry": "USA"
}
```

**Example - International:**
```json
{
  "addressStreet1": "10 Downing Street",
  "addressCity": "London",
  "addressPostcode": "SW1A 2AA",
  "addressCountry": "United Kingdom"
}
```

---

## Common Workflows

### Create Person with Name and Email

**Fields:**
1. `name` → FullName JSON
2. `email` → Simple string

**Configuration:**
- Field 1:
  - Name: `name`
  - Value: `{"firstName": "John", "lastName": "Doe"}`
- Field 2:
  - Name: `email`
  - Value: `john.doe@example.com`

---

### Create Company with Domain and ARR

**Fields:**
1. `name` → Simple string
2. `domainName` → Links JSON
3. `annualRecurringRevenue` → Currency JSON

**Configuration:**
- Field 1:
  - Name: `name`
  - Value: `Acme Corporation`
- Field 2:
  - Name: `domainName`
  - Value: `{"primaryLinkUrl": "https://acme.com", "primaryLinkLabel": "acme.com"}`
- Field 3:
  - Name: `annualRecurringRevenue`
  - Value: `{"amountMicros": 500000000000, "currencyCode": "USD"}` (= $500,000)

---

### Create Company with Full Address

**Fields:**
1. `name` → Simple string
2. `address` → Address JSON

**Configuration:**
- Field 1:
  - Name: `name`
  - Value: `TechCorp Inc.`
- Field 2:
  - Name: `address`
  - Value:
```json
{
  "addressStreet1": "1 Infinite Loop",
  "addressCity": "Cupertino",
  "addressPostcode": "95014",
  "addressState": "CA",
  "addressCountry": "USA"
}
```

---

## Using Expressions (Dynamic Data)

You can use n8n expressions to build JSON dynamically:

### Example 1: FullName from Previous Node

**Previous node output:**
```json
{
  "first": "Alice",
  "last": "Smith"
}
```

**Field Value expression:**
```javascript
{{ {"firstName": $json.first, "lastName": $json.last} }}
```

### Example 2: Links from Variables

**Variables:**
- `url`: `https://company.com`
- `label`: `Company Website`

**Field Value expression:**
```javascript
{{ {"primaryLinkUrl": $vars.url, "primaryLinkLabel": $vars.label} }}
```

### Example 3: Currency Calculation

**Calculate ARR from monthly revenue:**

**Previous node output:**
```json
{
  "monthlyRevenue": 10000
}
```

**Field Value expression (ARR = Monthly × 12, in micros):**
```javascript
{{ {"amountMicros": $json.monthlyRevenue * 12 * 1000000, "currencyCode": "USD"} }}
```

---

## Troubleshooting

### Error: "Expected type to be an object"

**Problem:** JSON is malformed or missing required structure

**Solution:** Validate your JSON at [jsonlint.com](https://jsonlint.com)

**Common mistakes:**
- ❌ Missing quotes: `{firstName: "John"}` → ✅ `{"firstName": "John"}`
- ❌ Single quotes: `{'firstName': 'John'}` → ✅ `{"firstName": "John"}`
- ❌ Trailing comma: `{"firstName": "John",}` → ✅ `{"firstName": "John"}`

### Error: "Cannot read property 'firstName' of undefined"

**Problem:** FullName JSON missing firstName/lastName keys

**Solution:** Use exact key names:
- ✅ `firstName` (not FirstName, first_name, or first)
- ✅ `lastName` (not LastName, last_name, or last)

### Error: Currency amount seems wrong

**Problem:** Forgot to multiply by 1,000,000 for micros

**Solution:** 
- ❌ `{"amountMicros": 100000}` = $0.10 (only 10 cents!)
- ✅ `{"amountMicros": 100000000000}` = $100,000

**Quick check:** Count zeros
- $1 = 1 + 6 zeros = 1,000,000
- $100,000 = 100000 + 6 zeros = 100,000,000,000

### Error: Address not appearing correctly

**Problem:** Wrong field names (missing "address" prefix)

**Solution:** All address fields start with `address`:
- ✅ `addressStreet1` (not street1 or street_1)
- ✅ `addressCity` (not city)
- ✅ `addressPostcode` (not postcode or zip)

---

## Tips & Best Practices

### 1. Use Code Editor for Complex JSON

In n8n, click the **`</>`** icon next to Field Value to open the code editor:
- Syntax highlighting
- Auto-formatting
- Better for multi-line JSON

### 2. Save JSON Templates

Create reusable JSON snippets:
```json
{
  "addressStreet1": "",
  "addressCity": "",
  "addressPostcode": "",
  "addressState": "",
  "addressCountry": ""
}
```
Save in a Sticky Note node for copy/paste.

### 3. Validate Before Sending

Use a **Code** node before Twenty CRM node to validate:
```javascript
const name = {
  firstName: $json.first,
  lastName: $json.last
};

// Validate
if (!name.firstName || !name.lastName) {
  throw new Error('First and last name required');
}

return { json: { name } };
```

### 4. Currency Conversion Helper

Create a **Code** node function:
```javascript
function dollarsToMicros(amount) {
  return amount * 1000000;
}

const arr = {
  amountMicros: dollarsToMicros(100000), // $100k
  currencyCode: "USD"
};

return { json: { annualRecurringRevenue: arr } };
```

---

## Field Type Cheat Sheet

| Field Type | Used In | Required Keys | Example |
|------------|---------|---------------|---------|
| **FullName** | Person.name | firstName?, lastName? | `{"firstName":"John","lastName":"Doe"}` |
| **Links** | Company.domainName | primaryLinkUrl, primaryLinkLabel | `{"primaryLinkUrl":"https://x.com","primaryLinkLabel":"x.com"}` |
| **Currency** | Company.annualRecurringRevenue | amountMicros, currencyCode | `{"amountMicros":100000000000,"currencyCode":"USD"}` |
| **Address** | Company/Person.address | addressStreet1, addressCity, addressPostcode, addressState, addressCountry | See examples above |

**? = Optional**

---

## Need Help?

1. **Check JSON syntax:** [jsonlint.com](https://jsonlint.com)
2. **Review examples:** See above for field type examples
3. **Check n8n expression:** Use `{{ $json }}` to inspect previous node data
4. **Open an issue:** [GitHub Issues](https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues)

---

## What's Next?

**Future versions will add:**
- 🎯 Auto-generated sub-fields (no JSON needed!)
- 💰 Dollar → micros conversion (input $100,000 directly)
- 📅 Date picker UI
- 🌍 Currency code dropdown
- 🏠 Address autocomplete

**For now:** JSON input gives you full flexibility! 💪
