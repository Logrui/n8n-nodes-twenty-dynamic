/**
 * Test Get operation exactly as the node would execute it
 * This simulates the buildGetQuery and buildComprehensiveFieldSelections process
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

// Simulate the COMPLEX_TYPE_SUBFIELDS from fieldIntrospection.ts
const COMPLEX_TYPE_SUBFIELDS = {
    'Links': `primaryLinkUrl
        primaryLinkLabel
        secondaryLinks`,
    'Address': `addressStreet1
        addressStreet2
        addressCity
        addressState
        addressCountry
        addressPostcode
        addressLat
        addressLng`,
    'Currency': `amountMicros
        currencyCode`,
    'Actor': `source
        workspaceMemberId
        name`,
    'WorkspaceMember': `id
        name {
            firstName
            lastName
        }
        userEmail`,
    'FullName': `firstName
        lastName`,
    'Emails': `primaryEmail
        additionalEmails`,
    'Phones': `primaryPhoneNumber
        primaryPhoneCountryCode
        primaryPhoneCallingCode
        additionalPhones`,
};

// Simulate introspectType function
async function introspectType(typeName) {
    const introspectionQuery = `
        query IntrospectType {
            __type(name: "${typeName}") {
                name
                fields {
                    name
                    type {
                        name
                        kind
                        ofType {
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
        }
    `;

    const response = await makeGraphQLRequest(introspectionQuery);
    
    if (!response.__type?.fields) {
        return [];
    }

    const fields = [];

    for (const field of response.__type.fields) {
        if (field.name === '__typename') continue;

        const fieldType = field.type;
        const typeName = fieldType.name || fieldType.ofType?.name || fieldType.ofType?.ofType?.name;
        const typeKind = fieldType.kind || fieldType.ofType?.kind || fieldType.ofType?.ofType?.kind;

        const isConnection = typeName?.endsWith('Connection') || false;
        const isScalar = typeKind === 'SCALAR' || 
            ['ID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Date', 'Time', 'UUID'].includes(typeName);
        const isEnum = typeKind === 'ENUM';
        const isObject = typeKind === 'OBJECT' && !isConnection;

        fields.push({
            name: field.name,
            typeName: typeName || 'Unknown',
            typeKind: typeKind || 'Unknown',
            isConnection,
            isScalar,
            isEnum,
            isObject,
        });
    }

    return fields;
}

// Simulate buildComprehensiveFieldSelections function
async function buildComprehensiveFieldSelections(typeName) {
    const fields = await introspectType(typeName);

    if (fields.length === 0) {
        return 'id\n\t\t\t\tcreatedAt\n\t\t\t\tupdatedAt\n\t\t\t\tdeletedAt\n\t\t\t\tname';
    }

    const fieldSelections = [];

    for (const field of fields) {
        if (field.isConnection) continue;

        if (field.isScalar || field.isEnum) {
            fieldSelections.push(field.name);
        }
        else if (field.isObject && COMPLEX_TYPE_SUBFIELDS[field.typeName]) {
            console.log(`   ✅ Found complex type: ${field.name} (${field.typeName}) - adding subfields`);
            fieldSelections.push(`${field.name} {\n\t\t\t\t\t${COMPLEX_TYPE_SUBFIELDS[field.typeName]}\n\t\t\t\t}`);
        }
        // Skip unknown object types (they're likely relations or need custom handling)
        else if (field.isObject) {
            console.log(`   ⏭️  Skipping unknown complex type: ${field.name} (${field.typeName})`);
        }
    }

    return fieldSelections.join('\n\t\t\t\t');
}

// Simulate buildGetQuery function
async function buildGetQuery(objectNameSingular, recordId, namePlural) {
    const capitalizedObjectName = objectNameSingular.charAt(0).toUpperCase() + objectNameSingular.slice(1);

    console.log(`\n📝 Building Get Query for ${capitalizedObjectName}`);
    const fieldSelections = await buildComprehensiveFieldSelections(capitalizedObjectName);

    const query = `
        query Get${capitalizedObjectName}($id: UUID!) {
            ${namePlural}(filter: { id: { eq: $id } }) {
                edges {
                    node {
                        ${fieldSelections}
                    }
                }
            }
        }
    `;

    const variables = {
        id: recordId,
    };

    return { query, variables };
}

async function testGetOperation() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTING GET OPERATION (Simulating Node Execution)');
    console.log('='.repeat(70));

    try {
        // Step 1: Get a person ID
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
        if (!personId) {
            console.log('❌ No people found');
            return;
        }

        console.log(`   ✅ Using Person ID: ${personId}`);

        // Step 2: Build Get query (simulating buildGetQuery)
        console.log('\n2️⃣  Building Get Query with Introspection...');
        const { query, variables } = await buildGetQuery('person', personId, 'people');

        console.log('\n📋 GENERATED QUERY:');
        console.log('━'.repeat(70));
        console.log(query);
        console.log('━'.repeat(70));
        console.log('Variables:', JSON.stringify(variables, null, 2));

        // Step 3: Execute query
        console.log('\n3️⃣  Executing Query...');
        const response = await makeGraphQLRequest(query, variables);

        const person = response.people.edges[0]?.node;

        console.log('\n✅ SUCCESS! Person retrieved:');
        console.log('   ID:', person.id);
        console.log('   Name:', person.name);
        console.log('   City:', person.city);
        console.log('   Total fields:', Object.keys(person).length);

        console.log('\n' + '='.repeat(70));
        console.log('🎉 TEST PASSED - Get operation working correctly!');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('❌ TEST FAILED');
        console.error('='.repeat(70));
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testGetOperation();
