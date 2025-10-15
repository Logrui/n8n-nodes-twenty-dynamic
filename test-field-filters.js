/**
 * Test to check if name field has isActive=false or another filter issue
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

async function testFieldFilters() {
    console.log('\n🔍 Testing Field Filters on Company Object\n');

    // Test 1: With filter: {} (current code)
    console.log('═'.repeat(80));
    console.log('📋 Test 1: fields(paging: { first: 200 }, filter: {})');
    console.log('═'.repeat(80));
    
    const query1 = `
        query GetObjects {
            objects(paging: { first: 200 }, filter: { nameSingular: { eq: "company" } }) {
                edges {
                    node {
                        nameSingular
                        fields(paging: { first: 200 }, filter: {}) {
                            edges {
                                node {
                                    name
                                    label
                                    type
                                    isActive
                                    isSystem
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch(`${CONFIG.domain}/metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({ query: query1 }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ FAILED:', result.errors.map(e => e.message).join(', '));
        } else {
            const fields = result.data.objects.edges[0]?.node.fields.edges.map(e => e.node) || [];
            console.log(`✅ Found ${fields.length} fields with filter: {}\n`);
            const nameField = fields.find(f => f.name === 'name');
            if (nameField) {
                console.log('✅ "name" field FOUND:');
                console.log(JSON.stringify(nameField, null, 2));
            } else {
                console.log('❌ "name" field NOT FOUND');
                console.log('Available fields:', fields.map(f => f.name).join(', '));
            }
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }

    // Test 2: Without filter
    console.log('\n' + '═'.repeat(80));
    console.log('📋 Test 2: fields(paging: { first: 200 }) - NO filter');
    console.log('═'.repeat(80));
    
    const query2 = `
        query GetObjects {
            objects(paging: { first: 200 }, filter: { nameSingular: { eq: "company" } }) {
                edges {
                    node {
                        nameSingular
                        fields(paging: { first: 200 }) {
                            edges {
                                node {
                                    name
                                    label
                                    type
                                    isActive
                                    isSystem
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch(`${CONFIG.domain}/metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({ query: query2 }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ FAILED:', result.errors.map(e => e.message).join(', '));
        } else {
            const fields = result.data.objects.edges[0]?.node.fields.edges.map(e => e.node) || [];
            console.log(`✅ Found ${fields.length} fields without filter\n`);
            const nameField = fields.find(f => f.name === 'name');
            if (nameField) {
                console.log('✅ "name" field FOUND:');
                console.log(JSON.stringify(nameField, null, 2));
            } else {
                console.log('❌ "name" field NOT FOUND');
                console.log('Available fields:', fields.map(f => f.name).join(', '));
            }
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }

    // Test 3: With isActive filter
    console.log('\n' + '═'.repeat(80));
    console.log('📋 Test 3: fields(filter: { isActive: { eq: true } })');
    console.log('═'.repeat(80));
    
    const query3 = `
        query GetObjects {
            objects(paging: { first: 200 }, filter: { nameSingular: { eq: "company" } }) {
                edges {
                    node {
                        nameSingular
                        fields(paging: { first: 200 }, filter: { isActive: { eq: true } }) {
                            edges {
                                node {
                                    name
                                    label
                                    type
                                    isActive
                                    isSystem
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch(`${CONFIG.domain}/metadata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({ query: query3 }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ FAILED:', result.errors.map(e => e.message).join(', '));
        } else {
            const fields = result.data.objects.edges[0]?.node.fields.edges.map(e => e.node) || [];
            console.log(`✅ Found ${fields.length} fields with isActive filter\n`);
            const nameField = fields.find(f => f.name === 'name');
            if (nameField) {
                console.log('✅ "name" field FOUND:');
                console.log(JSON.stringify(nameField, null, 2));
            } else {
                console.log('❌ "name" field NOT FOUND');
                console.log('All fields:', fields.map(f => `${f.name} (active:${f.isActive})`).join(', '));
            }
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('🔍 CONCLUSION');
    console.log('═'.repeat(80));
    console.log(`
The '/metadata' endpoint may be:
1. Filtering fields by some criteria not visible in the query
2. Only returning non-system fields by default
3. Having pagination issues (limiting to fewer fields)
4. Returning fields based on user permissions

Since we KNOW the 'name' field exists in /graphql queries,
we should update getRecordsForDatabase() to ALWAYS include 'name'
in the query regardless of what the schema says.
`);
}

testFieldFilters().catch(console.error);
