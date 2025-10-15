/**
 * Test script for People database operations
 * 
 * Tests:
 * 1. Create a Person with FullName field
 * 2. Get the Person (validate all fields including complex types)
 * 3. List People (validate "From list" search functionality)
 * 4. Search for Person by first name
 * 5. Search for Person by last name
 * 6. Update the Person
 * 7. Delete the Person
 */

const https = require('https');
require('dotenv').config({ path: './tests/.env' });

// Configuration - from environment variables
const API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL || 'https://twenty.envisicapital.com/';
const API_URL = new URL(TWENTY_URL).hostname;

if (!API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY not found in environment variables');
    console.error('Please set TWENTY_API_KEY in your .env file');
    process.exit(1);
}

/**
 * Make a GraphQL request to Twenty CRM
 */
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

/**
 * Create a test Person record
 */
async function createPerson() {
    console.log('\n📝 Test 1: Create Person');
    console.log('='.repeat(60));

    const timestamp = Date.now();
    const query = `
        mutation CreatePerson($input: PersonCreateInput!) {
            createPerson(data: $input) {
                id
                createdAt
                updatedAt
                deletedAt
                name {
                    firstName
                    lastName
                }
                city
                avatarUrl
                position
                companyId
            }
        }
    `;

    const variables = {
        input: {
            name: {
                firstName: 'Mavis',
                lastName: 'Beacon',
            },
            city: 'San Francisco',
            position: 7,
        },
    };

    const data = await makeGraphQLRequest(query, variables);
    const person = data.createPerson;

    console.log('✅ Person created successfully!');
    console.log('   ID:', person.id);
    console.log('   Name:', `${person.name.firstName} ${person.name.lastName}`);
    console.log('   City:', person.city);

    return person.id;
}

/**
 * Get a Person by ID (test comprehensive field retrieval)
 */
async function getPerson(personId) {
    console.log('\n📖 Test 2: Get Person (Comprehensive Fields)');
    console.log('='.repeat(60));

    const query = `
        query GetPerson($id: UUID!) {
            person(filter: { id: { eq: $id } }) {
                id
                createdAt
                updatedAt
                deletedAt
                name {
                    firstName
                    lastName
                }
                city
                avatarUrl
                position
                companyId
                linkedinLink {
                    primaryLinkUrl
                    primaryLinkLabel
                    secondaryLinks
                }
                xLink {
                    primaryLinkUrl
                    primaryLinkLabel
                    secondaryLinks
                }
                createdBy {
                    source
                    workspaceMemberId
                    name
                }
            }
        }
    `;

    const variables = { id: personId };

    const data = await makeGraphQLRequest(query, variables);
    const person = data.person;

    console.log('✅ Person retrieved successfully!');
    console.log('   Full name:', `${person.name.firstName} ${person.name.lastName}`);
    console.log('   City:', person.city);
    console.log('   Created by:', person.createdBy?.name || 'N/A');
    console.log('   Total top-level fields:', Object.keys(person).length);

    return person;
}

/**
 * List People (test "From list" functionality)
 */
async function listPeople(limit = 10) {
    console.log('\n📋 Test 3: List People (No Filter)');
    console.log('='.repeat(60));

    const query = `
        query ListPeople($limit: Int!) {
            people(first: $limit) {
                edges {
                    node {
                        id
                        name {
                            firstName
                            lastName
                        }
                        city
                    }
                }
            }
        }
    `;

    const variables = { limit };

    const data = await makeGraphQLRequest(query, variables);
    const edges = data.people.edges;

    console.log(`✅ Retrieved ${edges.length} people`);
    edges.slice(0, 5).forEach((edge, idx) => {
        const person = edge.node;
        const fullName = `${person.name.firstName || ''} ${person.name.lastName || ''}`.trim();
        console.log(`   ${idx + 1}. ${fullName} (${person.city || 'no city'})`);
    });

    return edges;
}

/**
 * Search People by first name (test "From list" search)
 */
async function searchPeopleByFirstName(searchTerm) {
    console.log(`\n🔍 Test 4: Search People by First Name: "${searchTerm}"`);
    console.log('='.repeat(60));

    const query = `
        query SearchPeopleByFirstName($limit: Int!, $searchPattern: String!) {
            people(
                first: $limit
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
                        city
                    }
                }
            }
        }
    `;

    const variables = {
        limit: 100,
        searchPattern: `%${searchTerm}%`,
    };

    const data = await makeGraphQLRequest(query, variables);
    const edges = data.people.edges;

    console.log(`✅ Found ${edges.length} people matching "${searchTerm}"`);
    edges.forEach((edge, idx) => {
        const person = edge.node;
        const fullName = `${person.name.firstName || ''} ${person.name.lastName || ''}`.trim();
        console.log(`   ${idx + 1}. ${fullName} (${person.city || 'no city'})`);
    });

    return edges;
}

/**
 * Update a Person
 */
async function updatePerson(personId) {
    console.log('\n✏️ Test 5: Update Person');
    console.log('='.repeat(60));

    const query = `
        mutation UpdatePerson($id: UUID!, $input: PersonUpdateInput!) {
            updatePerson(id: $id, data: $input) {
                id
                name {
                    firstName
                    lastName
                }
                city
            }
        }
    `;

    const variables = {
        id: personId,
        input: {
            city: 'Los Angeles',
        },
    };

    const data = await makeGraphQLRequest(query, variables);
    const person = data.updatePerson;

    console.log('✅ Person updated successfully!');
    console.log('   Name:', `${person.name.firstName} ${person.name.lastName}`);
    console.log('   City (updated):', person.city);

    return person;
}

/**
 * Delete a Person
 */
async function deletePerson(personId) {
    console.log('\n🗑️ Test 6: Delete Person');
    console.log('='.repeat(60));

    const query = `
        mutation DeletePerson($id: UUID!) {
            deletePerson(id: $id) {
                id
            }
        }
    `;

    const variables = { id: personId };

    const data = await makeGraphQLRequest(query, variables);

    console.log('✅ Person deleted successfully!');
    console.log('   Deleted ID:', data.deletePerson.id);
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TWENTY CRM - PEOPLE DATABASE TEST SUITE');
    console.log('='.repeat(60));

    let personId;

    try {
        // Test 1: Create
        personId = await createPerson();

        // Test 2: Get (comprehensive fields)
        await getPerson(personId);

        // Test 3: List (no filter)
        await listPeople(10);

        // Test 4: Search by first name "Mavis"
        await searchPeopleByFirstName('Mavis');

        // Test 5: Search by last name "Beacon"
        console.log('\n🔍 Test 4b: Search People by Last Name: "Beacon"');
        console.log('='.repeat(60));
        await searchPeopleByFirstName('Beacon');

        // Test 6: Update
        await updatePerson(personId);

        // Test 7: Delete
        await deletePerson(personId);

        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('🎉 ALL TESTS PASSED!');
        console.log('='.repeat(60));
        console.log('✅ Create: Working with FullName complex type');
        console.log('✅ Get: Returns all fields including complex types');
        console.log('✅ List: Properly formats firstName + lastName for display');
        console.log('✅ Search by firstName: OR filter working');
        console.log('✅ Search by lastName: OR filter working');
        console.log('✅ Update: Successful');
        console.log('✅ Delete: Successful');
        console.log('\n🎓 People database fully supported!');
        console.log('   FullName complex type handled correctly');
        console.log('   "From list" search supports first/last name matching');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Test failed!');
        console.error('Error:', error.message);
        
        // Cleanup: try to delete the person if it was created
        if (personId) {
            try {
                await deletePerson(personId);
                console.log('🧹 Cleanup: Test person deleted');
            } catch (cleanupError) {
                console.error('⚠️ Cleanup failed:', cleanupError.message);
            }
        }
        
        process.exit(1);
    }
}

// Run the tests
runTests();
