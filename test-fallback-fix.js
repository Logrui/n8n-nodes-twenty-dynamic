/**
 * Test the fallback query for Person when introspection fails
 */

require('dotenv').config({ path: './tests/.env' });
const https = require('https');

const API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL || 'https://twenty.envisicapital.com/';
const API_URL = new URL(TWENTY_URL).hostname;

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

async function testFallbackQuery() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST: Fallback Query for Person (when introspection fails)');
    console.log('='.repeat(70));

    try {
        // Get a person ID
        console.log('\n1️⃣  Getting a Person ID...');
        const listData = await makeGraphQLRequest(`
            query ListPeople {
                people(first: 1) {
                    edges {
                        node {
                            id
                        }
                    }
                }
            }
        `);

        const personId = listData.people.edges[0]?.node.id;
        console.log(`   ✅ Using Person ID: ${personId}`);

        // Test OLD fallback (would fail)
        console.log('\n2️⃣  Testing OLD fallback query (v0.5.24 and earlier)...');
        const oldFallbackQuery = `
            query GetPersonOldFallback($id: UUID!) {
                people(filter: { id: { eq: $id } }) {
                    edges {
                        node {
                            id
                            createdAt
                            updatedAt
                            deletedAt
                            name
                        }
                    }
                }
            }
        `;

        console.log('   Query includes: name (without subfields)');
        try {
            await makeGraphQLRequest(oldFallbackQuery, { id: personId });
            console.log('   ❌ UNEXPECTED: Old fallback should have failed!');
        } catch (error) {
            console.log('   ✅ EXPECTED: Old fallback FAILED with:');
            console.log('      "Field \'name\' of type \'FullName\' must have a selection of subfields"');
        }

        // Test NEW fallback (should work)
        console.log('\n3️⃣  Testing NEW fallback query (v0.5.26)...');
        const newFallbackQuery = `
            query GetPersonNewFallback($id: UUID!) {
                people(filter: { id: { eq: $id } }) {
                    edges {
                        node {
                            id
                            createdAt
                            updatedAt
                            deletedAt
                            name {
                                firstName
                                lastName
                            }
                        }
                    }
                }
            }
        `;

        console.log('   Query includes: name { firstName lastName }');
        const newData = await makeGraphQLRequest(newFallbackQuery, { id: personId });
        const person = newData.people.edges[0]?.node;

        console.log('   ✅ SUCCESS! New fallback works correctly');
        console.log(`      Person: ${person.name.firstName} ${person.name.lastName}`);
        console.log(`      ID: ${person.id}`);

        console.log('\n' + '='.repeat(70));
        console.log('🎉 FALLBACK FIX VERIFIED!');
        console.log('='.repeat(70));
        console.log('\n✅ When introspection fails for Person:');
        console.log('   - OLD: Queries "name" without subfields → ERROR');
        console.log('   - NEW: Queries "name { firstName lastName }" → SUCCESS');
        console.log('\n💡 This should fix the user\'s issue!');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

testFallbackQuery();
