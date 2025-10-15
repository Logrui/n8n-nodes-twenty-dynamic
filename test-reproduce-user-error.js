/**
 * Test to reproduce the exact error the user is experiencing
 * Simulates: Get operation on Person "Aditya Singh" selected from list
 */

require('dotenv').config({ path: './tests/.env' });
const https = require('https');

const API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL || 'https://twenty.envisicapital.com/';
const API_URL = new URL(TWENTY_URL).hostname;

if (!API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY not found');
    process.exit(1);
}

function makeGraphQLRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query, variables });

        const options = {
            hostname: API_URL,
            path: '/graphql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': data.length,
            },
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.errors) {
                        console.error('\n❌ GraphQL ERRORS:');
                        console.error(JSON.stringify(response.errors, null, 2));
                        reject(new Error(JSON.stringify(response.errors, null, 2)));
                    } else {
                        resolve(response.data);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testIntrospectionFailure() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST 1: What happens if introspection FAILS?');
    console.log('='.repeat(70));

    // Simulate introspection returning empty array (failure case)
    console.log('\n❌ Simulating introspection failure (returns empty array)');
    console.log('   Fallback query would be:');
    console.log('   fields: id, createdAt, updatedAt, deletedAt, name');
    console.log('\n   ⚠️  This includes "name" WITHOUT subfields!');
    console.log('   ⚠️  For Person, this would cause the error:');
    console.log('   ⚠️  "Field \'name\' of type \'FullName\' must have a selection of subfields"');
}

async function testIntrospectionWithWrongAuth() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST 2: Introspection with WRONG/INVALID API key');
    console.log('='.repeat(70));

    try {
        const introspectionQuery = `
            query IntrospectType {
                __type(name: "Person") {
                    name
                    fields {
                        name
                        type {
                            name
                            kind
                        }
                    }
                }
            }
        `;

        // Try with invalid API key to simulate auth failure
        const invalidKey = 'invalid-key-123';
        
        const data = JSON.stringify({ query: introspectionQuery });
        const options = {
            hostname: API_URL,
            path: '/graphql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${invalidKey}`,
                'Content-Length': data.length,
            },
        };

        const response = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve(parsed);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });

        console.log('\n📋 Response with invalid auth:');
        console.log(JSON.stringify(response, null, 2));

        if (response.errors) {
            console.log('\n✅ As expected: Introspection FAILS with invalid auth');
            console.log('   This would trigger the fallback query with simple "name" field');
            console.log('   Which would then FAIL when querying Person records!');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function testNormalGetOperation() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST 3: Normal Get Operation (with valid auth)');
    console.log('='.repeat(70));

    try {
        // Step 1: Find a person named similar to "Aditya Singh"
        console.log('\n1️⃣  Searching for people with name "Aditya"...');
        const searchQuery = `
            query SearchPeople($searchPattern: String!) {
                people(
                    first: 5
                    filter: {
                        or: [
                            { name: { firstName: { ilike: $searchPattern } } }
                            { name: { lastName: { ilike: $searchPattern } } }
                        ]
                    }
                ) {
                    edges {
                        node {
                            id
                            name {
                                firstName
                                lastName
                            }
                        }
                    }
                }
            }
        `;

        const searchData = await makeGraphQLRequest(searchQuery, { searchPattern: '%Aditya%' });
        
        if (searchData.people.edges.length === 0) {
            console.log('   ⚠️  No person found with name "Aditya"');
            console.log('   Using any person for testing...');
            
            const anyPersonData = await makeGraphQLRequest(`
                query GetAnyPerson {
                    people(first: 1) {
                        edges {
                            node {
                                id
                                name {
                                    firstName
                                    lastName
                                }
                            }
                        }
                    }
                }
            `);
            
            var personId = anyPersonData.people.edges[0].node.id;
            var personName = anyPersonData.people.edges[0].node.name;
        } else {
            var person = searchData.people.edges[0].node;
            var personId = person.id;
            var personName = person.name;
            console.log(`   ✅ Found: ${personName.firstName} ${personName.lastName} (ID: ${personId})`);
        }

        // Step 2: Now do a Get operation on this person (simulating what n8n does)
        console.log('\n2️⃣  Executing Get operation (simulating n8n)...');
        
        // Import the actual buildGetQuery logic
        const { buildGetQuery } = require('./dist/nodes/Twenty/operations/get.operation');
        const { twentyApiRequest } = require('./dist/nodes/Twenty/TwentyApi.client');
        
        // Create a mock context (simulating n8n execution context)
        const mockContext = {
            getNodeParameter: (param) => {
                if (param === 'resource') return 'person';
                return null;
            },
            helpers: {
                request: async (options) => {
                    // Simulate n8n's request helper
                    return await makeGraphQLRequest(options.body.query, options.body.variables);
                }
            }
        };

        // Simulate object metadata
        const objectMetadata = {
            nameSingular: 'person',
            namePlural: 'people',
            labelSingular: 'Person',
            labelPlural: 'People',
            fields: []
        };

        console.log('   Building query with introspection...');
        const { query, variables } = await buildGetQuery.call(mockContext, 'person', personId, objectMetadata);
        
        console.log('\n📋 GENERATED QUERY:');
        console.log('━'.repeat(70));
        console.log(query);
        console.log('━'.repeat(70));

        console.log('\n3️⃣  Executing query...');
        const response = await makeGraphQLRequest(query, variables);
        
        const record = response.people.edges[0]?.node;
        
        console.log('\n✅ SUCCESS!');
        console.log('   Person retrieved:', record.name);
        console.log('   Fields returned:', Object.keys(record).length);

    } catch (error) {
        console.error('\n❌ FAILED!');
        console.error('Error:', error.message);
        throw error;
    }
}

async function runAllTests() {
    try {
        await testIntrospectionFailure();
        await testIntrospectionWithWrongAuth();
        await testNormalGetOperation();
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 DIAGNOSIS');
        console.log('='.repeat(70));
        console.log('\n💡 LIKELY CAUSE OF USER ERROR:');
        console.log('   1. Introspection is FAILING in the user\'s n8n instance');
        console.log('   2. When introspection fails, fallback query uses "name" without subfields');
        console.log('   3. For Person database, this causes the FullName error');
        console.log('\n🔍 POSSIBLE REASONS FOR INTROSPECTION FAILURE:');
        console.log('   - API key issues / authentication problems');
        console.log('   - Network/firewall blocking introspection queries');
        console.log('   - Twenty CRM version incompatibility');
        console.log('   - GraphQL introspection disabled on server');
        console.log('\n🛠️  SOLUTION:');
        console.log('   Update fallback to handle FullName properly!');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\nTest suite error:', error.message);
        process.exit(1);
    }
}

runAllTests();
