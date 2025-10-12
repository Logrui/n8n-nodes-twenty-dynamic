# Running the Company vs People Introspection Test

This guide shows you how to run the introspection script to compare Company and People field structures.

## Prerequisites

1. A running Twenty CRM instance
2. An API key with access to your Twenty instance
3. Node.js installed

## Setup

### 1. Install Dependencies

```bash
cd tests
npm install
```

This will install:
- `node-fetch` - For making HTTP requests
- `dotenv` - For environment variable management
- TypeScript and ts-node (already installed)

### 2. Configure Environment Variables

Create or update your `.env` file in the `tests` directory:

```bash
# Create .env file
cp .env.example .env
```

Then edit `.env` and add:

```env
TWENTY_API_URL=https://your-twenty-instance.com/graphql
TWENTY_API_KEY=your-api-key-here
```

**For local development:**
```env
TWENTY_API_URL=http://localhost:3000/graphql
TWENTY_API_KEY=your-local-api-key
```

## Running the Test

### Option 1: Using npm script (Recommended)

```bash
cd tests
npm run test:compare
```

### Option 2: Direct node execution

```bash
cd tests
node introspect-company-vs-people.js
```

### Option 3: From parent directory

```bash
node tests/introspect-company-vs-people.js
```

## Expected Output

The script will print a detailed comparison report like this:

```
================================================================================
COMPANY vs PEOPLE FIELD COMPARISON
================================================================================

📦 COMPANY OBJECT:
   Label: Company (company)
   Description: A company
   Total Fields: 25

   Complex Fields in Company:
   - FULL_NAME: 0 fields
   - LINKS: 5 fields
     • domainName (Domain)
     • linkedinLink (LinkedIn)
     • xLink (X)
     • website (Website)
     • cvcWebsite (CVC Website)
   - CURRENCY: 1 fields
     • annualRecurringRevenue (ARR)
   - ADDRESS: 1 fields
     • address (Address)

--------------------------------------------------------------------------------

👤 PEOPLE OBJECT:
   Label: Person (person)
   Description: A person
   Total Fields: 22

   Complex Fields in People:
   - FULL_NAME: 1 fields
     • name (Name)
   - LINKS: 2 fields
     • linkedinLink (LinkedIn)
     • xLink (X)
   - CURRENCY: 0 fields
   - ADDRESS: 0 fields

================================================================================

🔍 KEY FINDINGS:

   ⚠️  FULL_NAME fields only exist in People, NOT in Company!
       → FieldParameters.ts should NOT apply FULL_NAME to Company objects

   ✓ LINKS fields in Company:
     - domainName
     - linkedinLink
     - xLink
     - website
     - cvcWebsite

   ✓ LINKS fields in People:
     - linkedinLink
     - xLink

   ✓ CURRENCY fields in Company:
     - annualRecurringRevenue

   ✓ ADDRESS fields in Company:
     - address

================================================================================

💾 Detailed report saved to: introspect-report.json
```

## Output Files

The script generates two outputs:

1. **Console Report** - Human-readable comparison printed to the terminal
2. **introspect-report.json** - Detailed JSON report with full metadata for both objects

### Example introspect-report.json structure:

```json
{
  "company": {
    "metadata": {
      "id": "...",
      "nameSingular": "company",
      "fields": { ... }
    },
    "fieldsByType": {
      "FULL_NAME": [],
      "LINKS": [...],
      "CURRENCY": [...],
      "ADDRESS": [...]
    }
  },
  "people": {
    "metadata": { ... },
    "fieldsByType": { ... }
  }
}
```

## Troubleshooting

### Error: "TWENTY_API_KEY environment variable is required"

Make sure you've set up your `.env` file correctly with the API key.

### Error: "Company object not found in metadata"

Your Twenty instance might use different object names. Check your Twenty metadata endpoint.

### Error: "fetch is not defined" (Node.js < 18)

Install node-fetch:
```bash
cd tests
npm install node-fetch@2
```

### Connection errors

- Check that `TWENTY_API_URL` is correct
- Verify your Twenty instance is running
- Ensure the API key has proper permissions

## Using the Results

After running the script, use the findings to:

1. **Update FieldParameters.ts**
   - Make `fullNameFields` only show for People's `name` field
   - Keep `name` as a simple field for Company objects

2. **Create Resource-Aware Field Logic**
   - Add resource parameter to field parameter functions
   - Only show FULL_NAME inputs for People, not Company

3. **Update Documentation**
   - Document which complex types apply to which resources
   - Add warnings about resource-specific fields

## Next Steps

Based on the introspection results, you should:

1. ✅ Run the introspection script
2. 📋 Review the console output and JSON report
3. 🔧 Update `FieldParameters.ts` to be resource-aware
4. 🧪 Test field display for both Company and People resources
5. 📝 Update user documentation with resource-specific field information
