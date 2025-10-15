/**
 * Test to verify the current getRecordsForDatabase query logic
 * 
 * This replicates the exact logic used in getRecordsForDatabase() to show
 * why UUIDs are being displayed instead of names.
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

async function testCurrentLogic() {
    console.log('\n🔍 Testing Current getRecordsForDatabase() Query Logic\n');
    
    // Simulate the current logic
    const displayFields = ['name', 'title', 'label', 'fullName', 'displayName', 'subject', 'email'];
    
    // Mock company metadata
    const mockCompanyFields = [
        { name: 'id', isSystem: true },
        { name: 'name', isSystem: false },
        { name: 'createdAt', isSystem: true },
        { name: 'employees', isSystem: false },
    ];
    
    const availableField = mockCompanyFields.find(field => 
        displayFields.includes(field.name) && !field.isSystem
    );
    
    const fieldToDisplay = availableField?.name || 'id';
    
    console.log('📋 Field Selection Logic:');
    console.log('   displayFields priority:', displayFields.join(', '));
    console.log('   availableField found:', availableField?.name || 'none');
    console.log('   fieldToDisplay:', fieldToDisplay);
    console.log('');
    
    // Show the query that gets built
    const pluralName = 'companies';
    const labelPlural = 'Companies';
    
    const currentQuery = `
        query List${labelPlural.replace(/\s+/g, '')}($limit: Int!) {
            ${pluralName}(first: $limit) {
                edges {
                    node {
                        id
                        ${fieldToDisplay !== 'id' ? fieldToDisplay : ''}
                    }
                }
            }
        }
    `;
    
    console.log('═'.repeat(80));
    console.log('📝 CURRENT QUERY (With Bug):');
    console.log('═'.repeat(80));
    console.log(currentQuery);
    console.log('');
    
    // Test the current query
    console.log('Testing current query against API...\n');
    
    try {
        const response = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                query: currentQuery,
                variables: { limit: 3 },
            }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ QUERY FAILED:', result.errors.map(e => e.message).join(', '));
        } else {
            console.log('✅ Query succeeded\n');
            const edges = result.data.companies.edges;
            console.log('Records returned:');
            console.log(JSON.stringify(edges, null, 2));
            console.log('');
            
            // Simulate the display logic
            console.log('═'.repeat(80));
            console.log('📊 Dropdown Display Values (What User Sees):');
            console.log('═'.repeat(80));
            edges.forEach((edge, i) => {
                const record = edge.node;
                const displayValue = record[fieldToDisplay] || record.id;
                console.log(`${i + 1}. name: "${displayValue}"  value: "${record.id}"`);
            });
            console.log('');
            
            console.log('🐛 PROBLEM IDENTIFIED:');
            console.log('   - fieldToDisplay = "name" (correct)');
            console.log('   - BUT query has: `${fieldToDisplay !== "id" ? fieldToDisplay : ""}`');
            console.log('   - Since fieldToDisplay = "name", it should add "name" to query');
            console.log('   - Let\'s check if "name" is actually in the response...\n');
            
            if (edges[0]?.node.name !== undefined) {
                console.log('✅ "name" field IS present in response');
                console.log('   First record name:', edges[0].node.name);
            } else {
                console.log('❌ "name" field is MISSING from response!');
                console.log('   Available fields:', Object.keys(edges[0]?.node || {}));
            }
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
    
    // Now show the fixed query
    const fixedQuery = `
        query List${labelPlural.replace(/\s+/g, '')}($limit: Int!) {
            ${pluralName}(first: $limit) {
                edges {
                    node {
                        id
                        name
                    }
                }
            }
        }
    `;
    
    console.log('\n' + '═'.repeat(80));
    console.log('📝 FIXED QUERY (Always Include Display Field):');
    console.log('═'.repeat(80));
    console.log(fixedQuery);
    console.log('');
    
    console.log('Testing fixed query against API...\n');
    
    try {
        const response = await fetch(`${CONFIG.domain}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`,
            },
            body: JSON.stringify({
                query: fixedQuery,
                variables: { limit: 3 },
            }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ QUERY FAILED:', result.errors.map(e => e.message).join(', '));
        } else {
            console.log('✅ Query succeeded\n');
            const edges = result.data.companies.edges;
            
            console.log('═'.repeat(80));
            console.log('📊 Fixed Dropdown Display Values:');
            console.log('═'.repeat(80));
            edges.forEach((edge, i) => {
                const record = edge.node;
                const displayValue = record.name || record.id;
                console.log(`${i + 1}. name: "${displayValue}"  value: "${record.id}"`);
            });
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('🔧 FIX NEEDED:');
    console.log('═'.repeat(80));
    console.log(`
Change from (WRONG):
    node {
        id
        \${fieldToDisplay !== 'id' ? fieldToDisplay : ''}
    }

Change to (CORRECT):
    node {
        id
        \${fieldToDisplay !== 'id' ? fieldToDisplay : ''}
    }
    
Wait... that looks the same! Let me check the actual code...

Actually, the issue might be in how the field is selected. Let me check
if the condition is working correctly or if there's a typo in the template.
`);
}

testCurrentLogic().catch(console.error);
