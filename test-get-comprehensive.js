/**
 * Test to build a comprehensive Get query using GraphQL introspection
 * 
 * This test will:
 * 1. Use introspection to discover ALL scalar fields for Company type
 * 2. Build a query that includes all those fields
 * 3. Verify we get complete record data
 * 4. Provide the correct pattern for buildGetQuery()
 */

const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, 'tests', '.env');
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

async function getScalarFieldsForType(typeName) {
    const introspectionQuery = `
        query IntrospectType {
            __type(name: "${typeName}") {
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

    const response = await fetch(`${CONFIG.domain}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
        body: JSON.stringify({ query: introspectionQuery }),
    });

    const result = await response.json();

    if (!result.data?.__type?.fields) {
        return [];
    }

    // Filter for scalar and enum fields only (skip objects and relations)
    const scalarFields = result.data.__type.fields.filter(f => {
        const typeKind = f.type.kind || f.type.ofType?.kind;
        return typeKind === 'SCALAR' || typeKind === 'ENUM';
    });

    return scalarFields.map(f => f.name);
}

async function testComprehensiveGetQuery() {
    console.log('\n🔍 Building Comprehensive Get Query Using Introspection\n');
    console.log('Testing against:', CONFIG.domain);
    console.log('');

    // Step 1: Get scalar fields via introspection
    console.log('Step 1: Discovering all scalar fields for Company type...');
    const scalarFields = await getScalarFieldsForType('Company');
    console.log(`✅ Found ${scalarFields.length} scalar/enum fields:`);
    scalarFields.forEach(f => console.log(`   • ${f}`));
    console.log('');

    // Step 2: Get a test company
    console.log('Step 2: Getting a test company ID...');
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

    // Step 3: Build comprehensive query with ALL scalar fields
    console.log('Step 3: Building comprehensive Get query...');
    const fieldSelections = scalarFields.join('\n                        ');
    const comprehensiveQuery = `
        query GetCompanyComprehensive($id: UUID!) {
            companies(filter: { id: { eq: $id } }) {
                edges {
                    node {
                        ${fieldSelections}
                    }
                }
            }
        }
    `;

    console.log('Query:');
    console.log(comprehensiveQuery);
    console.log('');

    // Step 4: Execute the comprehensive query
    console.log('Step 4: Executing comprehensive query...');
    console.log('─'.repeat(80));

    const response = await fetch(`${CONFIG.domain}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
        body: JSON.stringify({
            query: comprehensiveQuery,
            variables: { id: testCompany.id },
        }),
    });

    const result = await response.json();

    if (result.errors) {
        console.log('❌ FAILED');
        console.log('Errors:', result.errors.map(e => e.message).join('\n       '));
        return null;
    }

    console.log('✅ SUCCESS\n');
    const record = result.data.companies.edges[0].node;
    
    console.log('Complete record data:');
    console.log(JSON.stringify(record, null, 2));
    console.log('');

    // Analysis
    console.log('='.repeat(80));
    console.log('📊 ANALYSIS');
    console.log('='.repeat(80));
    
    const fieldsWithData = Object.keys(record).filter(k => record[k] !== null);
    const fieldsWithNull = Object.keys(record).filter(k => record[k] === null);
    
    console.log(`
✅ Total fields queried: ${scalarFields.length}
✅ Fields with data: ${fieldsWithData.length}
   ${fieldsWithData.map(f => `• ${f}: ${JSON.stringify(record[f])}`).join('\n   ')}

⚪ Fields with null: ${fieldsWithNull.length}
   ${fieldsWithNull.map(f => `• ${f}`).join('\n   ')}

🎯 This is the COMPLETE record data that should be returned!
`);

    // Provide solution
    console.log('='.repeat(80));
    console.log('🔧 SOLUTION FOR buildGetQuery()');
    console.log('='.repeat(80));
    console.log(`
The buildGetQuery() function should:

1. ❌ WRONG (current approach):
   - Rely on incomplete schema metadata
   - Use limited scalarTypes array
   - Result: Only gets ${Object.keys(record).length - fieldsWithData.length} fields

2. ✅ CORRECT (new approach):
   - Query ALL scalar fields dynamically
   - Don't filter based on field type from schema
   - Include these fields: ${scalarFields.join(', ')}
   - Result: Gets complete record (${fieldsWithData.length} fields with data)

Implementation options:
   A) Use introspection to get scalar fields dynamically
   B) Include a comprehensive list of known scalar fields
   C) Query all fields and let GraphQL handle which exist

Recommendation: Option C - Just include all commonly known fields
and let GraphQL return what exists. This is simpler and more reliable
than depending on schema metadata.
`);

    return record;
}

testComprehensiveGetQuery().catch(console.error);
