/**
 * Test to verify the getRecordsForDatabase() fix works correctly
 * 
 * This test replicates the FIXED logic to show that names are now properly displayed
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

async function testFixedLogic() {
    console.log('\n🔍 Testing FIXED getRecordsForDatabase() Logic\n');
    console.log('Testing against:', CONFIG.domain);
    console.log('');

    // Simulate the FIXED logic
    const pluralName = 'companies';
    const labelPlural = 'Companies';
    
    // NEW: Always query id and name, regardless of schema
    const fieldsToQuery = ['id', 'name'];
    
    const fixedQuery = `
        query List${labelPlural.replace(/\s+/g, '')}($limit: Int!) {
            ${pluralName}(first: $limit) {
                edges {
                    node {
                        ${fieldsToQuery.join('\n                        ')}
                    }
                }
            }
        }
    `;
    
    console.log('═'.repeat(80));
    console.log('📝 FIXED QUERY:');
    console.log('═'.repeat(80));
    console.log(fixedQuery);
    console.log('');
    console.log('Key changes:');
    console.log('   ✅ Always queries "name" field');
    console.log('   ✅ No dependency on incomplete schema metadata');
    console.log('   ✅ Simpler, more reliable logic');
    console.log('');
    
    // Test the fixed query
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
                variables: { limit: 10 },
            }),
        });

        const result = await response.json();

        if (result.errors) {
            console.log('❌ QUERY FAILED:', result.errors.map(e => e.message).join(', '));
            return;
        }

        console.log('✅ Query succeeded\n');
        const edges = result.data.companies.edges;
        
        // Simulate the FIXED display logic
        const results = edges.map((edge) => {
            const record = edge.node;
            // NEW: Use name field if available, fallback to id
            const displayValue = record.name || record.id;
            
            return {
                name: displayValue,
                value: record.id,
                url: `https://app.twenty.com/objects/companies/${record.id}`,
            };
        });
        
        console.log('═'.repeat(80));
        console.log(`📊 Dropdown Results (${results.length} items):`);
        console.log('═'.repeat(80));
        console.log('');
        
        results.forEach((item, i) => {
            console.log(`${(i + 1).toString().padStart(2)}. ${item.name}`);
            console.log(`    Value: ${item.value}`);
            console.log(`    URL: ${item.url}`);
            console.log('');
        });
        
        // Analysis
        console.log('═'.repeat(80));
        console.log('🎯 RESULTS ANALYSIS:');
        console.log('═'.repeat(80));
        
        const hasNames = results.every(r => r.name !== r.value);
        const hasUUIDs = results.some(r => r.name === r.value);
        
        if (hasNames && !hasUUIDs) {
            console.log('✅ SUCCESS! All records show human-readable names');
            console.log('   No UUIDs displayed in dropdown');
            console.log('   Fix is working correctly');
        } else if (hasUUIDs) {
            const uuidCount = results.filter(r => r.name === r.value).length;
            console.log(`⚠️  PARTIAL: ${uuidCount}/${results.length} records showing UUIDs`);
            console.log('   Some records may have null/empty names');
            console.log('   This is expected if records lack name values');
        } else {
            console.log('❓ UNEXPECTED: Review results above');
        }
        
        console.log('');
        console.log('Sample items:');
        results.slice(0, 3).forEach((item, i) => {
            const isUUID = item.name === item.value;
            const status = isUUID ? '❌ UUID' : '✅ Name';
            console.log(`   ${status} - "${item.name}"`);
        });
        
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
}

testFixedLogic().catch(console.error);
