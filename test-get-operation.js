/**
 * Test to diagnose Get operation returning incomplete data
 * 
 * Current issue: Get operation returns { "employees": null } instead of full record
 * Expected: Should return all record fields (id, name, domainName, etc.)
 * 
 * HOW TO RUN:
 * 1. Ensure tests/.env has TWENTY_URL and TWENTY_API_KEY
 * 2. Run: node test-get-operation.js
 * 3. Review results to identify the issue
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

async function testGetQuery(testName, query, variables) {
    console.log('\n' + '='.repeat(80));
    console.log(`📋 ${testName}`);
    console.log('='.repeat(80));
    console.log('Query:');
    console.log(query);
    console.log('');
    console.log('Variables:', JSON.stringify(variables, null, 2));
    console.log('─'.repeat(80));

    try {
        const response = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({ query, variables }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ FAILED');
            console.log('Errors:', result.errors.map(e => e.message).join('\n       '));
            return null;
        } else {
            console.log('✅ SUCCESS');
            console.log('');
            console.log('Response data:');
            console.log(JSON.stringify(result.data, null, 2));
            return result.data;
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
        return null;
    }
}

async function main() {
    console.log('\n🔍 Testing Get Operation Query Patterns\n');
    console.log('Testing against:', CONFIG.domain);
    console.log('');

    // First, get a real company ID to test with
    console.log('Step 1: Getting a test company ID...');
    const listQuery = `
        query ListCompanies {
            companies(first: 1) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `;

    const listResponse = await fetch(`${CONFIG.domain}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
        body: JSON.stringify({ query: listQuery }),
    });

    const listResult = await listResponse.json();
    
    if (!listResult.data?.companies?.edges?.[0]) {
        console.log('❌ Could not get test company');
        return;
    }

    const testCompany = listResult.data.companies.edges[0].node;
    console.log(`✅ Found test company: ${testCompany.name} (${testCompany.id})`);
    console.log('');

    // Test 1: Current buildGetQuery pattern (minimal fields)
    const test1 = await testGetQuery(
        'Test 1: Current buildGetQuery Pattern (CURRENT CODE)',
        `query GetCompany($id: UUID!) {
            companies(filter: { id: { eq: $id } }) {
                edges {
                    node {
                        id
                        employees
                    }
                }
            }
        }`,
        { id: testCompany.id }
    );

    // Test 2: Query with more fields
    const test2 = await testGetQuery(
        'Test 2: Extended Fields Query',
        `query GetCompany($id: UUID!) {
            companies(filter: { id: { eq: $id } }) {
                edges {
                    node {
                        id
                        name
                        employees
                        idealCustomerProfile
                        createdAt
                        updatedAt
                    }
                }
            }
        }`,
        { id: testCompany.id }
    );

    // Test 3: Query with ALL scalar fields
    const test3 = await testGetQuery(
        'Test 3: ALL Scalar Fields (comprehensive)',
        `query GetCompany($id: UUID!) {
            companies(filter: { id: { eq: $id } }) {
                edges {
                    node {
                        id
                        name
                        employees
                        idealCustomerProfile
                        position
                        createdAt
                        updatedAt
                        deletedAt
                        accountOwnerId
                        hasCvc
                        intakeStatus
                    }
                }
            }
        }`,
        { id: testCompany.id }
    );

    // Test 4: Try without edges/node (direct access)
    const test4 = await testGetQuery(
        'Test 4: Try Direct Access (no edges/node)',
        `query GetCompany($id: UUID!) {
            company(filter: { id: { eq: $id } }) {
                id
                name
                employees
            }
        }`,
        { id: testCompany.id }
    );

    // Test 5: Introspect Company type to see ALL available fields
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Introspecting Company Type for All Available Fields');
    console.log('='.repeat(80));

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
        const response = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({ query: introspectionQuery }),
        });

        const result = await response.json();

        if (result.data?.__type?.fields) {
            const fields = result.data.__type.fields;
            
            // Separate scalar and non-scalar fields
            const scalarFields = fields.filter(f => {
                const typeName = f.type.name || f.type.ofType?.name;
                const typeKind = f.type.kind || f.type.ofType?.kind;
                return typeKind === 'SCALAR' || typeKind === 'ENUM';
            });

            const objectFields = fields.filter(f => {
                const typeKind = f.type.kind || f.type.ofType?.kind;
                return typeKind === 'OBJECT' || typeKind === 'LIST';
            });

            console.log(`\n✅ Found ${fields.length} total fields`);
            console.log(`   - ${scalarFields.length} scalar/enum fields`);
            console.log(`   - ${objectFields.length} object/relation fields`);
            console.log('');
            console.log('Scalar fields (these should work in queries):');
            scalarFields.forEach(f => {
                const typeName = f.type.name || f.type.ofType?.name;
                console.log(`   • ${f.name}: ${typeName}`);
            });
        }
    } catch (error) {
        console.log('❌ Introspection failed:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANALYSIS & DIAGNOSIS');
    console.log('='.repeat(80));
    console.log(`
🐛 Issue Identified:
   The current buildGetQuery() only requests these fields:
   - id
   - employees (and maybe a few others from fieldSelections)

   But it SHOULD request ALL available scalar fields to provide
   complete record data to the user.

💡 Why this happens:
   The buildGetQuery() function filters fields based on:
   - scalarTypes array (limited set)
   - Schema metadata (which we know is incomplete)
   
   This results in most fields being excluded from the query!

🔧 Solution:
   Update buildGetQuery() to:
   1. Query ALL fields from introspection (not just from schema metadata)
   2. OR use a comprehensive list of known field types
   3. OR query a broader set of scalar types
   4. Include all SCALAR and ENUM fields automatically

📝 Next Steps:
   1. Check which test above returned the most complete data
   2. Update buildGetQuery() to match that pattern
   3. Verify the fix works end-to-end
`);
}

main().catch(console.error);
