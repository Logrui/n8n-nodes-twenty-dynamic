/**
 * Test to discover available fields for "From List" dropdown display
 * 
 * This test shows the raw JSON structure returned by the query used in
 * getRecordsForDatabase() so we can see what fields are available for
 * displaying human-readable names in the dropdown.
 * 
 * HOW TO RUN:
 * 1. Ensure tests/.env has TWENTY_URL and TWENTY_API_KEY
 * 2. Run: node test-list-dropdown-fields.js
 * 3. Review the raw JSON to see available fields for display
 */

const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, 'tests', '.env');
    if (!fs.existsSync(envPath)) {
        console.log('❌ .env file not found at:', envPath);
        process.exit(1);
    }
    
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return envVars;
}

const env = loadEnv();
const CONFIG = {
    domain: env.TWENTY_URL?.replace(/\/$/, ''),
    apiKey: env.TWENTY_API_KEY,
};

async function testCompanyFields() {
    console.log('\n🔍 Testing Company Record Fields for Dropdown Display\n');
    console.log('Testing against:', CONFIG.domain);
    console.log('');

    // Test 1: Minimal query (just id and name - current pattern)
    console.log('═'.repeat(80));
    console.log('📋 Test 1: Current Pattern (id + name only)');
    console.log('═'.repeat(80));
    
    const query1 = `
        query ListCompanies($limit: Int!) {
            companies(first: $limit) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `;

    try {
        const response1 = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                query: query1,
                variables: { limit: 3 },
            }),
        });

        const result1 = await response1.json();

        if (result1.errors) {
            console.log('❌ FAILED:', result1.errors.map(e => e.message).join(', '));
        } else {
            console.log('✅ SUCCESS - Limited fields query\n');
            const records = result1.data.companies.edges;
            console.log(`Found ${records.length} records\n`);
            console.log('Raw JSON structure:');
            console.log(JSON.stringify(records, null, 2));
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }

    // Test 2: Query with ALL scalar fields to see what's available
    console.log('\n' + '═'.repeat(80));
    console.log('📋 Test 2: Extended Query (all common fields)');
    console.log('═'.repeat(80));
    
    const query2 = `
        query ListCompaniesExtended($limit: Int!) {
            companies(first: $limit) {
                edges {
                    node {
                        id
                        name
                        domainName
                        employees
                        idealCustomerProfile
                        position
                        createdAt
                        updatedAt
                        deletedAt
                        accountOwnerId
                        visaSponsorship
                        xLink
                        linkedinLink
                        annualRecurringRevenue
                        address
                    }
                }
            }
        }
    `;

    try {
        const response2 = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                query: query2,
                variables: { limit: 3 },
            }),
        });

        const result2 = await response2.json();

        if (result2.errors) {
            console.log('❌ FAILED:', result2.errors.map(e => e.message).join(', '));
            console.log('\nNote: Some fields may not exist in your schema. This is expected.');
        } else {
            console.log('✅ SUCCESS - Extended fields query\n');
            const records = result2.data.companies.edges;
            console.log(`Found ${records.length} records\n`);
            console.log('Raw JSON structure (first record):');
            if (records[0]) {
                console.log(JSON.stringify(records[0].node, null, 2));
            }
            
            console.log('\n📊 Available non-null fields in first record:');
            if (records[0]) {
                const node = records[0].node;
                Object.keys(node).forEach(key => {
                    const value = node[key];
                    if (value !== null && value !== undefined) {
                        const displayValue = typeof value === 'string' && value.length > 50 
                            ? value.substring(0, 50) + '...' 
                            : value;
                        console.log(`   • ${key}: ${JSON.stringify(displayValue)}`);
                    }
                });
            }
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }

    // Test 3: Introspection to discover actual Company type fields
    console.log('\n' + '═'.repeat(80));
    console.log('📋 Test 3: GraphQL Introspection (discover all Company fields)');
    console.log('═'.repeat(80));
    
    const introspectionQuery = `
        query IntrospectCompany {
            __type(name: "Company") {
                fields {
                    name
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                        }
                    }
                }
            }
        }
    `;

    try {
        const response3 = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                query: introspectionQuery,
            }),
        });

        const result3 = await response3.json();

        if (result3.errors) {
            console.log('❌ FAILED:', result3.errors.map(e => e.message).join(', '));
        } else {
            console.log('✅ SUCCESS - Introspection query\n');
            const fields = result3.data.__type.fields;
            
            // Filter for scalar fields that might be good for display
            const scalarFields = fields.filter(f => {
                const typeName = f.type.name || f.type.ofType?.name;
                const typeKind = f.type.kind || f.type.ofType?.kind;
                return typeKind === 'SCALAR' || typeKind === 'ENUM';
            });

            console.log('📝 Scalar/Enum fields available on Company type:');
            console.log('   (Good candidates for dropdown display names)\n');
            
            scalarFields.forEach(f => {
                const typeName = f.type.name || f.type.ofType?.name;
                const isRequired = f.type.kind === 'NON_NULL' ? ' (required)' : '';
                console.log(`   • ${f.name}: ${typeName}${isRequired}`);
            });

            console.log('\n🔗 Relation fields (excluded from scalar list):');
            const relationFields = fields.filter(f => {
                const typeKind = f.type.kind || f.type.ofType?.kind;
                return typeKind === 'OBJECT' || typeKind === 'LIST';
            });
            relationFields.slice(0, 5).forEach(f => {
                const typeName = f.type.name || f.type.ofType?.name;
                console.log(`   • ${f.name}: ${typeName}`);
            });
            if (relationFields.length > 5) {
                console.log(`   ... and ${relationFields.length - 5} more`);
            }
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SUMMARY & RECOMMENDATIONS');
    console.log('═'.repeat(80));
    console.log(`
🎯 Best Fields for Dropdown Display (in priority order):
   1. name - Primary display field (most human-readable)
   2. domainName - Secondary identifier for companies
   3. id - Fallback if name is empty

💡 Current Issue:
   The dropdown is showing UUIDs instead of names, which suggests:
   - The 'name' field exists but might be NULL/empty for some records
   - OR the field selection in getRecordsForDatabase() isn't working correctly
   - OR the displayValue logic needs adjustment

🔧 Recommended Fix:
   Update getRecordsForDatabase() to:
   1. Always query the 'name' field
   2. Use name as display value if available
   3. Fallback to domainName or id if name is null
   4. Format: "{name} ({domainName})" for better clarity

📝 Next Steps:
   1. Check if the companies in your instance actually have 'name' values
   2. Review the getRecordsForDatabase() code to verify field selection
   3. Update the display logic to properly show name instead of id
`);
}

testCompanyFields().catch(console.error);
