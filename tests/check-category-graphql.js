const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

const TWENTY_API_URL = process.env.TWENTY_API_URL || 'http://localhost:3000';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

const baseUrl = TWENTY_API_URL.replace(/\/+$/, '').replace(/\/graphql$/, '');
const graphqlUrl = `${baseUrl}/graphql`;

async function checkCompanySchema() {
    console.log('🔍 Checking Company schema via GraphQL introspection...\n');
    
    // Introspection query
    const query = `
        query {
            __type(name: "Company") {
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
    
    const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    });
    
    const result = await response.json();
    
    if (result.errors) {
        console.error('Errors:', result.errors);
        return;
    }
    
    if (!result.data.__type) {
        console.error('❌ Company type not found');
        return;
    }
    
    const companyType = result.data.__type;
    console.log(`✅ Company type found with ${companyType.fields.length} fields\n`);
    
    // Find category field
    const categoryField = companyType.fields.find(f => f.name === 'category');
    
    if (categoryField) {
        console.log('✅ category field FOUND in GraphQL schema!');
        console.log(JSON.stringify(categoryField, null, 2));
        console.log();
        
        // Check the type
        const fieldType = categoryField.type;
        console.log('Field type analysis:');
        console.log(`  Kind: ${fieldType.kind}`);
        console.log(`  Name: ${fieldType.name}`);
        
        if (fieldType.ofType) {
            console.log(`  Inner type: ${fieldType.ofType.name || fieldType.ofType.kind}`);
            
            if (fieldType.ofType.ofType) {
                console.log(`  Inner inner type: ${fieldType.ofType.ofType.name}`);
            }
        }
        
        console.log('\n📋 This is a LIST type, which corresponds to MULTI_SELECT in Twenty');
        console.log('The enum type is:', fieldType.ofType?.name);
        
        // Now try to get the enum values
        console.log('\n🔍 Fetching enum values...');
        await getEnumValues(fieldType.ofType?.name);
        
    } else {
        console.log('❌ category field NOT FOUND in GraphQL schema');
        console.log('\nAll Company fields:');
        companyType.fields.forEach(f => {
            const typeName = f.type.name || f.type.ofType?.name || f.type.kind;
            console.log(`  - ${f.name}: ${typeName}`);
        });
    }
}

async function getEnumValues(enumName) {
    if (!enumName) {
        console.log('No enum name provided');
        return;
    }
    
    const query = `
        query {
            __type(name: "${enumName}") {
                name
                kind
                enumValues {
                    name
                    description
                }
            }
        }
    `;
    
    const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    });
    
    const result = await response.json();
    
    if (result.errors) {
        console.error('Errors:', result.errors);
        return;
    }
    
    if (!result.data.__type) {
        console.log(`❌ Enum type ${enumName} not found`);
        return;
    }
    
    console.log(`✅ Enum ${enumName} found with ${result.data.__type.enumValues.length} values:`);
    result.data.__type.enumValues.forEach(v => {
        console.log(`  - ${v.name}`);
    });
}

checkCompanySchema().catch(console.error);
