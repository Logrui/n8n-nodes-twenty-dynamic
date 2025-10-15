/**
 * Test to verify schema metadata has the 'name' field for Company
 * 
 * This checks if getCachedSchema() returns the 'name' field in the
 * company object metadata, which affects field selection in getRecordsForDatabase()
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

async function fetchSchema() {
    // This is the same query used by getCachedSchema() in TwentyApi.client.ts
    const metadataQuery = `
        query getSchema($paging: CursorPaging!) {
            objects(paging: $paging) {
                edges {
                    node {
                        id
                        nameSingular
                        namePlural
                        labelSingular
                        labelPlural
                        isCustom
                        isSystem
                        isActive
                        fields(paging: { first: 200 }) {
                            edges {
                                node {
                                    id
                                    name
                                    label
                                    type
                                    isNullable
                                    isSystem
                                    isActive
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
            body: JSON.stringify({
                query: metadataQuery,
                variables: { paging: { first: 200 } },
            }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ Schema query failed:', result.errors.map(e => e.message).join(', '));
            return null;
        }

        return result.data;
    } catch (error) {
        console.log('❌ ERROR:', error.message);
        return null;
    }
}

async function testSchemaMetadata() {
    console.log('\n🔍 Testing Schema Metadata for Company Object\n');
    console.log('Fetching schema from:', CONFIG.domain + '/metadata');
    console.log('');

    const schemaData = await fetchSchema();

    if (!schemaData) {
        console.log('Failed to fetch schema');
        return;
    }

    // Find the company object
    const objects = schemaData.objects.edges.map(e => e.node);
    const companyObject = objects.find(obj => obj.nameSingular === 'company');

    if (!companyObject) {
        console.log('❌ Company object not found in schema!');
        console.log('Available objects:', objects.map(o => o.nameSingular).join(', '));
        return;
    }

    console.log('✅ Company object found in schema\n');
    console.log('═'.repeat(80));
    console.log('📋 Company Object Metadata:');
    console.log('═'.repeat(80));
    console.log('   nameSingular:', companyObject.nameSingular);
    console.log('   namePlural:', companyObject.namePlural);
    console.log('   labelSingular:', companyObject.labelSingular);
    console.log('   labelPlural:', companyObject.labelPlural);
    console.log('   isCustom:', companyObject.isCustom);
    console.log('   isSystem:', companyObject.isSystem);
    console.log('   isActive:', companyObject.isActive);
    console.log('');

    // Extract fields
    const fields = companyObject.fields.edges.map(e => e.node);
    
    console.log('═'.repeat(80));
    console.log(`📝 Company Fields (${fields.length} total):`);
    console.log('═'.repeat(80));
    console.log('');

    // Check for display fields
    const displayFields = ['name', 'title', 'label', 'fullName', 'displayName', 'subject', 'email'];
    
    console.log('🔍 Looking for display fields:', displayFields.join(', '));
    console.log('');

    const foundDisplayFields = fields.filter(f => displayFields.includes(f.name));

    if (foundDisplayFields.length > 0) {
        console.log('✅ Found display fields:');
        foundDisplayFields.forEach(f => {
            console.log(`   • ${f.name}:`);
            console.log(`      - label: ${f.label}`);
            console.log(`      - type: ${f.type}`);
            console.log(`      - isSystem: ${f.isSystem}`);
            console.log(`      - isActive: ${f.isActive}`);
            console.log(`      - isNullable: ${f.isNullable}`);
        });
    } else {
        console.log('❌ No display fields found!');
    }

    console.log('');

    // Simulate the field selection logic
    console.log('═'.repeat(80));
    console.log('🧪 Simulating getRecordsForDatabase() Field Selection:');
    console.log('═'.repeat(80));
    console.log('');

    const availableField = fields.find(field => 
        displayFields.includes(field.name) && !field.isSystem
    );

    const fieldToDisplay = availableField?.name || 'id';

    console.log('Field selection logic:');
    console.log('   displayFields priority:', displayFields.join(', '));
    console.log('   availableField found:', availableField ? JSON.stringify({
        name: availableField.name,
        isSystem: availableField.isSystem,
        type: availableField.type
    }, null, 6) : 'NONE');
    console.log('   fieldToDisplay result:', fieldToDisplay);
    console.log('');

    if (fieldToDisplay === 'id') {
        console.log('❌ PROBLEM: fieldToDisplay = "id"');
        console.log('   This means no suitable display field was found!');
        console.log('   Dropdown will show UUIDs instead of names.');
        console.log('');
        console.log('   Possible causes:');
        console.log('   1. "name" field has isSystem=true (filtered out)');
        console.log('   2. "name" field is not in the schema');
        console.log('   3. "name" field is not active (isActive=false)');
    } else {
        console.log('✅ CORRECT: fieldToDisplay =', fieldToDisplay);
        console.log('   Dropdown should show', fieldToDisplay, 'values');
    }

    console.log('');
    console.log('═'.repeat(80));
    console.log('📊 All Company Fields (for reference):');
    console.log('═'.repeat(80));
    console.log('');

    // Group fields by type
    const scalarFields = fields.filter(f => !f.type.includes('RELATION'));
    const relationFields = fields.filter(f => f.type.includes('RELATION'));

    console.log(`Scalar Fields (${scalarFields.length}):`);
    scalarFields.forEach(f => {
        const systemFlag = f.isSystem ? '🔒' : '  ';
        const activeFlag = f.isActive ? '✅' : '❌';
        console.log(`   ${systemFlag} ${activeFlag} ${f.name.padEnd(30)} ${f.type}`);
    });

    console.log('');
    console.log(`Relation Fields (${relationFields.length}):`);
    relationFields.slice(0, 10).forEach(f => {
        const systemFlag = f.isSystem ? '🔒' : '  ';
        const activeFlag = f.isActive ? '✅' : '❌';
        console.log(`   ${systemFlag} ${activeFlag} ${f.name.padEnd(30)} ${f.type}`);
    });
    if (relationFields.length > 10) {
        console.log(`   ... and ${relationFields.length - 10} more`);
    }
}

testSchemaMetadata().catch(console.error);
