# Template-Based Complex Fields - User Guide

**Version:** v0.3.0+  
**Updated:** October 12, 2025

---

## 🎯 Overview

Complex fields in Twenty CRM (FullName, Links, Currency, Address) now have **automatic input boxes** that appear when you select the field. No more JSON!

---

## 📖 Quick Start Examples

### Example 1: Create Person with Name

**Steps:**
1. Add "Twenty CRM - Dynamic" node
2. **Object:** `person`
3. **Operation:** `Create One`
4. Click **"Add Field"**
5. **Field Name:** Select `name (Full name)`
6. 👉 **Two boxes appear below:**
   - **First Name:** Type `John`
   - **Last Name:** Type `Doe`
7. Click **Execute**

**Result:** ✅ Person created with name "John Doe"

---

### Example 2: Add LinkedIn to Person

**Steps:**
1. **Object:** `person`
2. **Operation:** `Update One` or `Create One`
3. **Field Name:** Select `linkedinLink (Linkedin Link)`
4. 👉 **Two boxes appear:**
   - **URL:** `https://linkedin.com/in/johndoe`
   - **Label:** `John Doe's LinkedIn`
5. **Execute**

**Result:** ✅ LinkedIn link saved with proper URL and label

---

### Example 3: Set Company ARR

**Steps:**
1. **Object:** `company`
2. **Operation:** `Create One` or `Update One`
3. **Field Name:** Select `annualRecurringRevenue (ARR)`
4. 👉 **Two boxes appear:**
   - **Amount:** Type `500000` (for $500,000)
   - **Currency Code:** Select `USD` from dropdown
5. **Execute**

**Result:** ✅ ARR set to $500,000 USD (automatically converted to 500000000000 micros)

---

### Example 4: Add Company Address

**Steps:**
1. **Object:** `company`
2. **Operation:** `Create One` or `Update One`
3. **Field Name:** Select `address (Address)`
4. 👉 **Eight boxes appear:**
   - **Street Address 1:** `123 Main Street`
   - **Street Address 2:** `Suite 100` (optional)
   - **City:** `New York`
   - **Postal Code:** `10001`
   - **State / Province:** `NY`
   - **Country:** `United States`
   - **Latitude:** Leave empty or enter `40.7128` (optional)
   - **Longitude:** Leave empty or enter `-74.0060` (optional)
5. **Execute**

**Result:** ✅ Full address saved with all components

---

## 🗂️ Field Type Reference

### FullName Fields

**Appears for:** `name`, `pointOfContact`

**Input Boxes:**
- First Name (optional)
- Last Name (optional)

**Examples:**
- Full name: First=`Alice`, Last=`Smith`
- First only: First=`Madonna`, Last=*(empty)*
- Last only: First=*(empty)*, Last=`Cher`

---

### Links Fields

**Appears for:** `domainName`, `linkedinLink`, `xLink`, `website`, `cvcWebsite`

**Input Boxes:**
- URL (required)
- Label (required)

**Examples:**
- Company domain:
  - URL: `https://acme.com`
  - Label: `acme.com`
- LinkedIn:
  - URL: `https://linkedin.com/company/acme`
  - Label: `Acme on LinkedIn`
- Website:
  - URL: `https://myportfolio.com`
  - Label: `My Portfolio`

---

### Currency Fields

**Appears for:** `annualRecurringRevenue`

**Input Boxes:**
- Amount (number) - **Enter normal amount, e.g., 100000 for $100k**
- Currency Code (dropdown)

**Currency Options:**
- 🇺🇸 US Dollar (USD)
- 🇪🇺 Euro (EUR)
- 🇬🇧 British Pound (GBP)
- 🇯🇵 Japanese Yen (JPY)
- 🇨🇦 Canadian Dollar (CAD)
- 🇦🇺 Australian Dollar (AUD)
- 🇨🇭 Swiss Franc (CHF)
- 🇨🇳 Chinese Yuan (CNY)

**Examples:**
- $100,000 ARR:
  - Amount: `100000`
  - Currency: `USD`
- €50,000 ARR:
  - Amount: `50000`
  - Currency: `EUR`
- ¥10,000,000 ARR:
  - Amount: `10000000`
  - Currency: `JPY`

**💡 Note:** Amount is automatically converted to micros (×1,000,000) when sent to Twenty CRM.

---

### Address Fields

**Appears for:** `address`

**Input Boxes:**
1. Street Address 1 (required)
2. Street Address 2 (optional)
3. City (required)
4. Postal Code (required)
5. State / Province (required)
6. Country (required)
7. Latitude (optional)
8. Longitude (optional)

**Examples:**

**US Address:**
- Street 1: `1600 Pennsylvania Avenue NW`
- Street 2: *(empty)*
- City: `Washington`
- Postal Code: `20500`
- State: `DC`
- Country: `United States`

**International Address:**
- Street 1: `10 Downing Street`
- Street 2: *(empty)*
- City: `London`
- Postal Code: `SW1A 2AA`
- State: *(empty or region)*
- Country: `United Kingdom`

**With Coordinates:**
- Street 1: `1 Infinite Loop`
- City: `Cupertino`
- Postal Code: `95014`
- State: `CA`
- Country: `USA`
- Latitude: `37.3318`
- Longitude: `-122.0312`

---

## 🎨 Visual Guide

### What You See for Each Field Type

#### Simple Fields (Text, Number, etc.)
```
Field Name: [email          ▼]
Field Value: [john@example.com]
```

#### FullName Fields
```
Field Name: [name           ▼]
First Name: [John           ]
Last Name:  [Doe            ]
```

#### Links Fields
```
Field Name: [domainName     ▼]
URL:        [https://acme.com]
Label:      [acme.com       ]
```

#### Currency Fields
```
Field Name:    [annualRecurringRevenue ▼]
Amount:        [100000                  ]
Currency Code: [USD                    ▼]
```

#### Address Fields
```
Field Name:         [address           ▼]
Street Address 1:   [123 Main St       ]
Street Address 2:   [Suite 100         ]
City:               [New York          ]
Postal Code:        [10001             ]
State / Province:   [NY                ]
Country:            [United States     ]
Latitude:           [40.7128           ]
Longitude:          [-74.0060          ]
```

---

## 💡 Tips & Tricks

### 1. Optional vs Required Fields

**FullName:**
- Both First Name and Last Name are optional
- You can use just one or both
- If you leave both empty, the field won't be saved

**Address:**
- Street Address 2, Latitude, and Longitude are optional
- All other address fields are required if you use address

**Links:**
- Both URL and Label are required
- If you leave either empty, the field won't be saved

---

### 2. Currency Amount Entry

**Just enter the normal amount** - don't calculate micros!

✅ **Correct:**
- For $100,000 → Enter `100000`
- For €50,000 → Enter `50000`
- For ¥1,000,000 → Enter `1000000`

❌ **Don't do this:**
- ~~Enter 100000000000~~ (this is micros, too complicated!)

The system handles the micros conversion automatically.

---

### 3. Using Expressions

You can use n8n expressions in any input box!

**Example: FullName from previous node**

Previous node output:
```json
{
  "firstName": "Alice",
  "lastName": "Smith"
}
```

In FullName fields:
- First Name: `{{ $json.firstName }}`
- Last Name: `{{ $json.lastName }}`

**Example: Currency from calculation**

Previous node output:
```json
{
  "monthlyRevenue": 10000
}
```

In Currency field:
- Amount: `{{ $json.monthlyRevenue * 12 }}`  (calculates ARR)
- Currency Code: `USD`

---

### 4. Multiple Fields

You can add multiple fields - each one shows its appropriate input boxes:

```
Field 1:
  Field Name: name
  First Name: John
  Last Name: Doe

Field 2:
  Field Name: email
  Field Value: john@example.com

Field 3:
  Field Name: linkedinLink
  URL: https://linkedin.com/in/johndoe
  Label: John's LinkedIn

Field 4:
  Field Name: phone
  Field Value: +1-555-0100
```

---

## 🔧 Troubleshooting

### Input boxes don't appear

**Problem:** Selected complex field but still see single "Field Value" input

**Solutions:**
1. Check you're on v0.3.0 (Settings → Community Nodes → Twenty CRM - Dynamic)
2. Click away and select the field again
3. Try restarting n8n
4. Make sure field name matches exactly (e.g., `name` not `personName`)

---

### Currency shows wrong amount

**Problem:** Entered 100000 but Twenty shows 100000000000

**Solution:** This is correct! Twenty stores currency in "micros" (1,000,000 micros = $1). 
- Your input: `100000` 
- Stored as: `100000000000` micros
- Displays as: $100,000 in Twenty UI

---

### Address fields partially saved

**Problem:** Only some address fields were saved

**Solution:** Make sure you filled in the required fields:
- Street Address 1 ✅ Required
- City ✅ Required
- Postal Code ✅ Required
- State ✅ Required
- Country ✅ Required
- Street Address 2 ⚪ Optional
- Lat/Lng ⚪ Optional

---

### Links field not saving

**Problem:** Entered URL but field didn't save

**Solution:** Links require BOTH URL and Label:
- URL: `https://example.com` ✅
- Label: `example.com` ✅

If either is empty, the field won't save.

---

## 📋 Field Checklist

Before clicking Execute, verify:

**FullName:**
- [ ] At least one of First Name or Last Name filled
- [ ] Names don't have leading/trailing spaces

**Links:**
- [ ] URL starts with `http://` or `https://`
- [ ] Label is filled (can be same as domain)
- [ ] URL is valid format

**Currency:**
- [ ] Amount is a number (no commas, $, etc.)
- [ ] Currency code selected from dropdown
- [ ] Amount represents full dollars/euros (not micros)

**Address:**
- [ ] Street Address 1 filled
- [ ] City filled
- [ ] Postal Code filled
- [ ] State filled (or N/A for countries without states)
- [ ] Country filled
- [ ] Coordinates are numbers (if provided)

---

## 🆘 Getting Help

If something doesn't work:

1. **Check version:** Make sure you're on v0.3.0+
2. **Try simple example:** Create Person with just name field
3. **Check n8n console:** Look for error messages
4. **Test in Twenty CRM:** Verify field exists in your Twenty instance
5. **Open issue:** https://github.com/Logrui/n8n-nodes-twenty-dynamic/issues

---

## 🎓 Complete Workflow Examples

### Example: Complete Person Record

```
Object: person
Operation: Create One

Field 1 - Name:
  Field Name: name
  First Name: Sarah
  Last Name: Connor

Field 2 - Email:
  Field Name: email
  Field Value: sarah.connor@example.com

Field 3 - Phone:
  Field Name: phone
  Field Value: +1-555-0199

Field 4 - LinkedIn:
  Field Name: linkedinLink
  URL: https://linkedin.com/in/sarahconnor
  Label: Sarah Connor's Profile

Field 5 - Address:
  Field Name: address
  Street Address 1: 789 Tech Boulevard
  Street Address 2: Floor 5
  City: San Francisco
  Postal Code: 94102
  State / Province: CA
  Country: United States
```

---

### Example: Complete Company Record

```
Object: company
Operation: Create One

Field 1 - Name:
  Field Name: name
  Field Value: Acme Corporation

Field 2 - Domain:
  Field Name: domainName
  URL: https://acme.com
  Label: acme.com

Field 3 - ARR:
  Field Name: annualRecurringRevenue
  Amount: 500000
  Currency Code: USD

Field 4 - Employees:
  Field Name: employees
  Field Value: 150

Field 5 - Address:
  Field Name: address
  Street Address 1: 100 Corporate Drive
  City: Austin
  Postal Code: 78701
  State / Province: TX
  Country: United States

Field 6 - LinkedIn:
  Field Name: linkedinLink
  URL: https://linkedin.com/company/acme
  Label: Acme on LinkedIn
```

---

**Happy automating! 🚀**

No more JSON complexity - just fill in the boxes and let the node handle the rest!
