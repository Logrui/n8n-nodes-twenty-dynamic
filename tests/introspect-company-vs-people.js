/**
 * Test script to introspect Company vs People data structures
 * This helps identify which complex fields (FullName, Links, Currency, Address) 
 * apply to which resources in Twenty CRM
 */

// Load environment variables from .env file
require('dotenv').config();

const fetch = require('node-fetch');

// Configuration
const TWENTY_URL = process.env.TWENTY_URL || process.env.TWENTY_API_URL || 'http://localhost:3000';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

// Remove trailing slash and /graphql if present
const baseUrl = TWENTY_URL.replace(/\/graphql\/?$/, '').replace(/\/$/, '');
const METADATA_URL = `${baseUrl}/metadata`;

if (!TWENTY_API_KEY) {
    console.error('Error: TWENTY_API_KEY environment variable is required');
    process.exit(1);
}

console.log(`Using Twenty CRM at: ${baseUrl}`);
console.log(`Metadata endpoint: ${METADATA_URL}\n`);

/**
 * Execute GraphQL query against Twenty API
 */
async function executeGraphQL(query, variables = {}) {
    const response = await fetch(METADATA_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    if (result.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(result.errors, null, 2)}`);
    }
    return result.data;
}

/**
 * Get metadata for a specific object type from /metadata endpoint
 */
async function getObjectMetadata(objectName) {
    const query = `
        query GetObjectMetadata {
            objects(paging: { first: 200 }) {
                edges {
                    node {
                        id
                        nameSingular
                        namePlural
                        labelSingular
                        labelPlural
                        description
                        fields(paging: { first: 200 }) {
                            edges {
                                node {
                                    id
                                    name
                                    label
                                    type
                                    description
                                    isNullable
                                    defaultValue
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    const data = await executeGraphQL(query);
    const objects = data.objects.edges.map(edge => edge.node);
    
    return objects.find(obj => 
        obj.nameSingular === objectName || 
        obj.namePlural === objectName
    );
}

/**
 * Introspect actual data schema from /graphql endpoint using __type introspection
 * This shows ALL fields including standard ones like 'id', 'name', etc.
 */
async function introspectDataSchema(typeName) {
    const query = `
        query IntrospectType {
            __type(name: "${typeName}") {
                name
                kind
                description
                fields {
                    name
                    description
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

    const response = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    });

    const result = await response.json();
    if (result.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(result.errors, null, 2)}`);
    }
    
    return result.data.__type;
}

/**
 * Analyze field types and identify complex fields
 */
function analyzeFields(objectMetadata) {
    const fields = objectMetadata.fields.edges.map(edge => edge.node);
    
    const fieldsByType = {
        FULL_NAME: [],
        LINKS: [],
        CURRENCY: [],
        ADDRESS: [],
        TEXT: [],
        NUMBER: [],
        DATE_TIME: [],
        BOOLEAN: [],
        RELATION: [],
        SELECT: [],
        MULTI_SELECT: [],
        OTHER: [],
    };

    fields.forEach(field => {
        const type = field.type;
        
        if (type === 'FULL_NAME') {
            fieldsByType.FULL_NAME.push(field);
        } else if (type === 'LINKS') {
            fieldsByType.LINKS.push(field);
        } else if (type === 'CURRENCY') {
            fieldsByType.CURRENCY.push(field);
        } else if (type === 'ADDRESS') {
            fieldsByType.ADDRESS.push(field);
        } else if (type === 'TEXT') {
            fieldsByType.TEXT.push(field);
        } else if (type === 'NUMBER') {
            fieldsByType.NUMBER.push(field);
        } else if (type === 'DATE_TIME') {
            fieldsByType.DATE_TIME.push(field);
        } else if (type === 'BOOLEAN') {
            fieldsByType.BOOLEAN.push(field);
        } else if (type === 'RELATION') {
            fieldsByType.RELATION.push(field);
        } else if (type === 'SELECT') {
            fieldsByType.SELECT.push(field);
        } else if (type === 'MULTI_SELECT') {
            fieldsByType.MULTI_SELECT.push(field);
        } else {
            fieldsByType.OTHER.push(field);
        }
    });

    return fieldsByType;
}

/**
 * Print comparison report
 */
function printComparison(companyData, peopleData) {
    console.log('\n' + '='.repeat(80));
    console.log('COMPANY vs PEOPLE FIELD COMPARISON');
    console.log('='.repeat(80) + '\n');

    // Company Info
    console.log('📦 COMPANY OBJECT:');
    console.log(`   Label: ${companyData.labelSingular} (${companyData.nameSingular})`);
    console.log(`   Description: ${companyData.description || 'N/A'}`);
    console.log(`   Total Fields: ${companyData.fields.edges.length}\n`);

    const companyFields = analyzeFields(companyData);
    console.log('   Complex Fields in Company:');
    console.log(`   - FULL_NAME: ${companyFields.FULL_NAME.length} fields`);
    companyFields.FULL_NAME.forEach(f => console.log(`     • ${f.name} (${f.label})`));
    console.log(`   - LINKS: ${companyFields.LINKS.length} fields`);
    companyFields.LINKS.forEach(f => console.log(`     • ${f.name} (${f.label})`));
    console.log(`   - CURRENCY: ${companyFields.CURRENCY.length} fields`);
    companyFields.CURRENCY.forEach(f => console.log(`     • ${f.name} (${f.label})`));
    console.log(`   - ADDRESS: ${companyFields.ADDRESS.length} fields`);
    companyFields.ADDRESS.forEach(f => console.log(`     • ${f.name} (${f.label})`));

    console.log('\n' + '-'.repeat(80) + '\n');

    // People Info
    console.log('👤 PEOPLE OBJECT:');
    console.log(`   Label: ${peopleData.labelSingular} (${peopleData.nameSingular})`);
    console.log(`   Description: ${peopleData.description || 'N/A'}`);
    console.log(`   Total Fields: ${peopleData.fields.edges.length}\n`);

    const peopleFields = analyzeFields(peopleData);
    console.log('   Complex Fields in People:');
    console.log(`   - FULL_NAME: ${peopleFields.FULL_NAME.length} fields`);
    peopleFields.FULL_NAME.forEach(f => console.log(`     • ${f.name} (${f.label})`));
    console.log(`   - LINKS: ${peopleFields.LINKS.length} fields`);
    peopleFields.LINKS.forEach(f => console.log(`     • ${f.name} (${f.label})`));
    console.log(`   - CURRENCY: ${peopleFields.CURRENCY.length} fields`);
    peopleFields.CURRENCY.forEach(f => console.log(`     • ${f.name} (${f.label})`));
    console.log(`   - ADDRESS: ${peopleFields.ADDRESS.length} fields`);
    peopleFields.ADDRESS.forEach(f => console.log(`     • ${f.name} (${f.label})`));

    console.log('\n' + '='.repeat(80) + '\n');

    // Key Findings
    console.log('🔍 KEY FINDINGS:\n');
    
    if (companyFields.FULL_NAME.length === 0 && peopleFields.FULL_NAME.length > 0) {
        console.log('   ⚠️  FULL_NAME fields only exist in People, NOT in Company!');
        console.log('       → FieldParameters.ts should NOT apply FULL_NAME to Company objects\n');
    }

    if (companyFields.LINKS.length > 0) {
        console.log('   ✓ LINKS fields in Company:');
        companyFields.LINKS.forEach(f => console.log(`     - ${f.name}`));
        console.log('');
    }

    if (peopleFields.LINKS.length > 0) {
        console.log('   ✓ LINKS fields in People:');
        peopleFields.LINKS.forEach(f => console.log(`     - ${f.name}`));
        console.log('');
    }

    if (companyFields.CURRENCY.length > 0) {
        console.log('   ✓ CURRENCY fields in Company:');
        companyFields.CURRENCY.forEach(f => console.log(`     - ${f.name}`));
        console.log('');
    }

    if (companyFields.ADDRESS.length > 0) {
        console.log('   ✓ ADDRESS fields in Company:');
        companyFields.ADDRESS.forEach(f => console.log(`     - ${f.name}`));
        console.log('');
    }

    if (peopleFields.ADDRESS.length > 0) {
        console.log('   ✓ ADDRESS fields in People:');
        peopleFields.ADDRESS.forEach(f => console.log(`     - ${f.name}`));
        console.log('');
    }

    console.log('='.repeat(80) + '\n');
}

/**
 * Main execution
 */
async function main() {
    try {
        console.log('Fetching Company metadata from /metadata endpoint...');
        const companyMetadata = await getObjectMetadata('company');
        
        console.log('Fetching People metadata from /metadata endpoint...');
        const peopleMetadata = await getObjectMetadata('person');

        if (!companyMetadata) {
            throw new Error('Company object not found in metadata');
        }
        if (!peopleMetadata) {
            throw new Error('People object not found in metadata');
        }

        console.log('\nIntrospecting Company data schema from /graphql endpoint...');
        const companySchema = await introspectDataSchema('Company');
        
        console.log('Introspecting Person data schema from /graphql endpoint...');
        const personSchema = await introspectDataSchema('Person');

        // Find the 'name' field in both schemas
        const companyNameField = companySchema?.fields?.find(f => f.name === 'name');
        const personNameField = personSchema?.fields?.find(f => f.name === 'name');

        printComparison(companyMetadata, peopleMetadata);

        // Add schema comparison for the 'name' field
        console.log('='.repeat(80));
        console.log('SCHEMA INTROSPECTION: "name" FIELD TYPE COMPARISON');
        console.log('='.repeat(80) + '\n');

        console.log('📦 Company "name" field:');
        if (companyNameField) {
            const fieldType = companyNameField.type.ofType?.name || companyNameField.type.name;
            const fieldKind = companyNameField.type.kind;
            console.log(`   Type: ${fieldType} (${fieldKind})`);
            console.log(`   Full type structure: ${JSON.stringify(companyNameField.type, null, 2)}`);
        } else {
            console.log('   ❌ NOT FOUND in GraphQL schema');
        }

        console.log('\n👤 Person "name" field:');
        if (personNameField) {
            const fieldType = personNameField.type.ofType?.name || personNameField.type.name;
            const fieldKind = personNameField.type.kind;
            console.log(`   Type: ${fieldType} (${fieldKind})`);
            console.log(`   Full type structure: ${JSON.stringify(personNameField.type, null, 2)}`);
        } else {
            console.log('   ❌ NOT FOUND in GraphQL schema');
        }

        console.log('\n' + '='.repeat(80));
        console.log('🔍 KEY FINDING:');
        if (companyNameField && personNameField) {
            const companyType = companyNameField.type.ofType?.name || companyNameField.type.name;
            const personType = personNameField.type.ofType?.name || personNameField.type.name;
            
            if (companyType === personType) {
                console.log(`   ✓ Both use same type: ${companyType}`);
            } else {
                console.log(`   ⚠️  Different types!`);
                console.log(`      - Company.name: ${companyType}`);
                console.log(`      - Person.name: ${personType}`);
                
                if (personType === 'FullName' && companyType === 'String') {
                    console.log('\n   🎯 CONFIRMED: Person.name is FullName (firstName/lastName)');
                    console.log('                Company.name is String (simple text)');
                    console.log('\n   → FieldParameters.ts should only apply firstName/lastName');
                    console.log('     inputs when resource=person, NOT for company!');
                }
            }
        }
        console.log('='.repeat(80) + '\n');

        // Export detailed JSON for further analysis
        const detailedReport = {
            company: {
                metadata: companyMetadata,
                fieldsByType: analyzeFields(companyMetadata),
                schema: companySchema,
                nameField: companyNameField,
            },
            people: {
                metadata: peopleMetadata,
                fieldsByType: analyzeFields(peopleMetadata),
                schema: personSchema,
                nameField: personNameField,
            },
        };

        console.log('💾 Detailed report saved to: introspect-report.json\n');
        require('fs').writeFileSync(
            'introspect-report.json',
            JSON.stringify(detailedReport, null, 2)
        );

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
