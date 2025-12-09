# v0.3.0 Release Notes: Template-Based Field Inputs

**Published:** October 12, 2025  
**Version:** 0.3.0  
**Type:** Major Feature - Template-Based Complex Fields

## 🎯 What's New

**NO MORE JSON!** Complex fields (FullName, Links, Currency, Address) now have **separate input boxes** that appear automatically when you select the field.

### Before (v0.2.4)
```json
// User had to type JSON:
{"firstName": "John", "lastName": "Doe"}
```

### After (v0.3.0)
```
Select field: name
  ↓ Two input boxes appear automatically:
  First Name: [John      ]
  Last Name:  [Doe       ]
```

## 🚀 Key Features

### 1. **FullName Fields** (Person.name, Opportunity.pointOfContact)
When you select a FullName field, you get:
- ✅ First Name input box
- ✅ Last Name input box
- ✅ Both optional (use one or both)

### 2. **Links Fields** (Company.domainName, linkedinLink, xLink, website, etc.)
When you select a Links field, you get:
- ✅ URL input box
- ✅ Label input box
- ✅ Proper URL formatting guidance

### 3. **Currency Fields** (Company.annualRecurringRevenue)
When you select a currency field, you get:
- ✅ Amount input box (enter normal dollars, e.g., 100000)
- ✅ Currency Code dropdown (USD, EUR, GBP, JPY, etc.)
- ✅ **Automatic conversion to micros** (you just enter 100000, system converts to 100000000000)

### 4. **Address Fields** (Company.address, Person.address)
When you select an address field, you get **8 input boxes**:
- ✅ Street Address 1
- ✅ Street Address 2 (optional)
- ✅ City
- ✅ Postal Code
- ✅ State / Province
- ✅ Country
- ✅ Latitude (optional)
- ✅ Longitude (optional)

## 📋 Supported Complex Fields

| Field Name | Object | Type | Input Boxes |
|------------|--------|------|-------------|
| `name` | Person | FullName | First Name, Last Name |
| `pointOfContact` | Opportunity | FullName | First Name, Last Name |
| `domainName` | Company | Links | URL, Label |
| `linkedinLink` | Company/Person | Links | URL, Label |
| `xLink` | Company | Links | URL, Label |
| `website` | Company | Links | URL, Label |
| `cvcWebsite` | Company | Links | URL, Label |
| `annualRecurringRevenue` | Company | Currency | Amount, Currency Code |
| `address` | Company/Person | Address | 8 address fields |

## 🎨 User Experience Improvements

### Smart Field Visibility
- **Simple fields** (text, numbers, booleans): Single "Field Value" input (as before)
- **Complex fields**: Multiple specific inputs appear automatically
- **No confusion**: Input boxes only show when relevant

### Currency Made Easy
**Before:** Had to calculate micros manually
```json
{"amountMicros": 100000000000, "currencyCode": "USD"}  // $100,000
```

**Now:** Just enter the normal amount
```
Amount: 100000
Currency Code: USD (dropdown)
```
System automatically converts 100000 → 100000000000 micros!

### Currency Dropdown
No more typing "USD" - select from dropdown:
- 🇺🇸 US Dollar (USD)
- 🇪🇺 Euro (EUR)
- 🇬🇧 British Pound (GBP)
- 🇯🇵 Japanese Yen (JPY)
- 🇨🇦 Canadian Dollar (CAD)
- 🇦🇺 Australian Dollar (AUD)
- 🇨🇭 Swiss Franc (CHF)
- 🇨🇳 Chinese Yuan (CNY)

## 📸 How It Works

### Example: Create Person with Name

1. **Add Twenty CRM - Dynamic node**
2. **Select Object:** `person`
3. **Select Operation:** `Create One`
4. **Click "Add Field"**
5. **Select Field Name:** `name (Full name)`
6. 👉 **Two input boxes appear automatically:**
   - First Name: `Alice`
   - Last Name: `Smith`
7. **Execute** ✅

Result: Person created with name `{ firstName: "Alice", lastName: "Smith" }`

### Example: Create Company with Domain and ARR

1. **Add Twenty CRM - Dynamic node**
2. **Select Object:** `company`
3. **Select Operation:** `Create One`
4. **Add Field #1:**
   - Field Name: `name`
   - Field Value: `Acme Corporation`
5. **Add Field #2:**
   - Field Name: `domainName (Company Website)`
   - 👉 **Two input boxes appear:**
     - URL: `https://acme.com`
     - Label: `acme.com`
6. **Add Field #3:**
   - Field Name: `annualRecurringRevenue (ARR)`
   - 👉 **Two input boxes appear:**
     - Amount: `500000` (= $500,000)
     - Currency Code: `USD` (dropdown)
7. **Execute** ✅

Result: Company created with:
- `name: "Acme Corporation"`
- `domainName: { primaryLinkUrl: "https://acme.com", primaryLinkLabel: "acme.com" }`
- `annualRecurringRevenue: { amountMicros: 500000000000, currencyCode: "USD" }`

## 🔧 Technical Details

### Field Detection
The system automatically detects complex field types by field name:
- Fields named `name` or `pointOfContact` → FullName template
- Fields named `domainName`, `linkedinLink`, etc. → Links template
- Fields named `annualRecurringRevenue` → Currency template
- Fields named `address` → Address template

### Data Transformation
When you execute the workflow:
1. System reads your separate input values
2. Automatically builds the nested object structure
3. Sends properly formatted GraphQL mutation
4. Returns the created/updated record

### Currency Conversion
Amount entered in UI is automatically multiplied by 1,000,000 to convert to micros:
- UI: `100000` → GraphQL: `100000000000` micros

## 🆕 New Files

- `nodes/Twenty/ComplexFieldDetection.ts` - Field type detection module

## 📝 Migration Guide

### From v0.2.4 (JSON input)

**If you were using JSON:**
Your workflows will still work! JSON parsing is still supported for backwards compatibility.

**To upgrade to template inputs:**
1. Update to v0.3.0 in n8n Community Nodes
2. Edit your workflow
3. Select the complex field (e.g., `name`)
4. Delete the old JSON from "Field Value"
5. Fill in the new separate input boxes that appear
6. Test and save!

### From v0.2.3 or earlier

Update to v0.3.0 and enjoy the new input boxes immediately!

## 🐛 Breaking Changes

**None!** Fully backwards compatible:
- JSON input still works (parsing maintained)
- Simple fields work exactly as before
- Existing workflows continue to function

## ⚡ Performance

- Package size: 29.6 kB (up from 27.1 kB due to new field definitions)
- Unpacked size: 131.6 kB
- Total files: 19
- No performance impact on execution

## 🔮 Future Enhancements

Planned for future versions:
- **Dynamic field discovery**: Auto-detect complex types from GraphQL introspection (no hardcoded list)
- **Custom object support**: If you add custom complex fields to Twenty, they'll work automatically
- **Enum fields**: Dropdown menus for status fields, select fields, etc.
- **Date pickers**: Calendar UI for date/datetime fields
- **Relation fields**: Special UI for linking records

## 🎓 Examples

### Create Person with Full Details
```
Object: person
Operation: Create One

Field 1:
  Field Name: name
  First Name: Sarah
  Last Name: Connor

Field 2:
  Field Name: email
  Field Value: sarah.connor@example.com

Field 3:
  Field Name: phone
  Field Value: +1-555-0199

Field 4:
  Field Name: linkedinLink
  URL: https://linkedin.com/in/sarahconnor
  Label: Sarah Connor's LinkedIn
```

### Create Company with Address
```
Object: company
Operation: Create One

Field 1:
  Field Name: name
  Field Value: TechCorp Inc.

Field 2:
  Field Name: address
  Street Address 1: 1 Infinite Loop
  Street Address 2: 
  City: Cupertino
  Postal Code: 95014
  State / Province: CA
  Country: United States
  Latitude: 37.3318
  Longitude: -122.0312

Field 3:
  Field Name: employees
  Field Value: 500
```

### Update Company ARR
```
Object: company
Operation: Update One
Record ID: abc123-def456-...

Field 1:
  Field Name: annualRecurringRevenue
  Amount: 1000000  (= $1M)
  Currency Code: USD
```

## 🆘 Troubleshooting

### "Field boxes don't appear"

**Problem:** Selected a complex field but only see "Field Value" input

**Solution:** Make sure you've updated to v0.3.0. Check version in n8n Community Nodes settings.

### "Amount seems wrong for currency"

**Problem:** Entered 100000 but record shows different amount

**Solution:** The system converts to micros automatically. If you entered 100000, it's stored as 100000000000 micros (= $100,000). To retrieve, divide by 1,000,000.

### "Some fields are optional?"

**Solution:** 
- FullName: Both firstName and lastName are optional
- Address: Street2, Lat, Lng are optional
- Links: URL and Label are both required for the field to save

### "Can I still use JSON?"

**Solution:** Yes! For backwards compatibility, JSON parsing is still supported. But the new input boxes are much easier!

## 📊 Comparison Table

| Feature | v0.2.4 (JSON) | v0.3.0 (Templates) |
|---------|---------------|-------------------|
| **FullName input** | Type JSON manually | 2 separate input boxes |
| **Links input** | Type JSON manually | 2 separate input boxes |
| **Currency input** | Calculate micros, type JSON | Enter amount, select currency |
| **Address input** | Type JSON with 8 fields | 8 separate input boxes |
| **Learning curve** | Need to know JSON | No JSON knowledge needed |
| **Error prone** | JSON syntax errors | Validated inputs |
| **UX rating** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🙏 Credits

- **Implementation:** AI Assistant + User Feedback
- **Testing:** User validation
- **Approach:** User request for "field boxes instead of JSON"

## 📞 Support

For issues or questions:
1. Check your n8n Community Nodes - make sure you're on v0.3.0
2. Test with a simple example (Person + name field)
3. Check field dropdown - complex fields should show template inputs
4. Open issue: https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues

---

**Enjoy the much improved UX! 🎉**

No more JSON wrangling - just fill in the boxes and go!
