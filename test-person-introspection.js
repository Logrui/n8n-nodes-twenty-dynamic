/**
 * Test Person introspection to see what fields are discovered
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

async function introspectPerson() {
    console.log('\n🔍 Introspecting Person Type');
    console.log('='.repeat(60));

    const query = `
        query IntrospectType {
            __type(name: "Person") {
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

    const data = await makeGraphQLRequest(query);
    const fields = data.__type.fields;

    console.log(`\nFound ${fields.length} fields on Person type:\n`);

    // Categorize fields
    const categories = {
        scalar: [],
        enum: [],
        object: [],
        connection: [],
    };

    fields.forEach(field => {
        const typeName = field.type.name || field.type.ofType?.name || field.type.ofType?.ofType?.name;
        const typeKind = field.type.kind || field.type.ofType?.kind || field.type.ofType?.ofType?.kind;

        const isConnection = typeName?.endsWith('Connection');
        const isScalar = typeKind === 'SCALAR' || ['ID', 'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Date', 'Time', 'UUID'].includes(typeName);
        const isEnum = typeKind === 'ENUM';
        const isObject = typeKind === 'OBJECT' && !isConnection;

        if (isConnection) {
            categories.connection.push({ name: field.name, type: typeName });
        } else if (isScalar) {
            categories.scalar.push({ name: field.name, type: typeName });
        } else if (isEnum) {
            categories.enum.push({ name: field.name, type: typeName });
        } else if (isObject) {
            categories.object.push({ name: field.name, type: typeName });
        }
    });

    console.log('📊 SCALAR FIELDS:', categories.scalar.length);
    categories.scalar.forEach(f => console.log(`   - ${f.name}: ${f.type}`));

    console.log('\n📊 ENUM FIELDS:', categories.enum.length);
    categories.enum.forEach(f => console.log(`   - ${f.name}: ${f.type}`));

    console.log('\n📊 OBJECT/COMPLEX FIELDS:', categories.object.length);
    categories.object.forEach(f => console.log(`   - ${f.name}: ${f.type}`));

    console.log('\n📊 CONNECTION FIELDS (excluded):', categories.connection.length);
    categories.connection.forEach(f => console.log(`   - ${f.name}: ${f.type}`));

    // Check specifically for name field
    const nameField = fields.find(f => f.name === 'name');
    if (nameField) {
        console.log('\n🎯 NAME FIELD DETAILS:');
        console.log(JSON.stringify(nameField, null, 2));
    }
}

async function testGetPersonQuery() {
    console.log('\n\n🧪 Testing Get Person Query');
    console.log('='.repeat(60));

    // First, get a person ID
    const listQuery = `
        query ListPeople {
            people(first: 1) {
                edges {
                    node {
                        id
                    }
                }
            }
        }
    `;

    const listData = await makeGraphQLRequest(listQuery);
    const personId = listData.people.edges[0]?.node.id;

    if (!personId) {
        console.log('❌ No people found to test');
        return;
    }

    console.log('Using person ID:', personId);

    // Now try to get that person WITH name field properly selected
    const getQuery = `
        query GetPerson($id: UUID!) {
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
                        city
                        avatarUrl
                        position
                        companyId
                    }
                }
            }
        }
    `;

    const getData = await makeGraphQLRequest(getQuery, { id: personId });
    const person = getData.people.edges[0]?.node;

    console.log('\n✅ Get Person successful!');
    console.log('   ID:', person.id);
    console.log('   Name:', person.name);
    console.log('   City:', person.city);
}

async function run() {
    try {
        await introspectPerson();
        await testGetPersonQuery();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

run();
