/**
 * Test script to explore Twenty CRM API resource metadata
 * Purpose: Discover what properties are available for sorting/grouping resources
 * 
 * This will help us understand:
 * 1. What metadata fields are available on objects
 * 2. Whether there are properties like isSystem, namespaceType, etc.
 * 3. How we can intelligently group resources beyond just isCustom
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from tests/.env
const envPath = path.join(__dirname, 'tests', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    console.log('✅ Loaded environment variables from tests/.env\n');
} else {
    console.log('⚠️  No .env file found at tests/.env, using manual configuration\n');
}

// Configuration - Loaded from .env or manual override
const TWENTY_DOMAIN = (process.env.TWENTY_URL || 'http://localhost:3000').replace(/\/$/, ''); // Remove trailing slash
const API_KEY = process.env.TWENTY_API_KEY || 'YOUR_API_KEY_HERE'; // Your Twenty API key

/**
 * Make a GraphQL request to Twenty CRM Metadata API
 */
async function makeMetadataRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${TWENTY_DOMAIN}/metadata`);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const postData = JSON.stringify({
            query,
            variables,
        });

        console.log(`\n🔗 Making request to: ${url.href}`);
        console.log(`📝 Protocol: ${isHttps ? 'HTTPS' : 'HTTP'}`);

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = client.request(options, (res) => {
            let data = '';

            console.log(`📡 Response Status: ${res.statusCode} ${res.statusMessage}`);

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`📥 Response received (${data.length} bytes)`);
                
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.errors) {
                        console.error('❌ GraphQL Errors:', JSON.stringify(parsed.errors, null, 2));
                        reject(new Error(`GraphQL Error: ${JSON.stringify(parsed.errors, null, 2)}`));
                    } else {
                        resolve(parsed.data);
                    }
                } catch (error) {
                    console.error('❌ Parse Error:', error.message);
                    console.error('Raw Response:', data.substring(0, 500));
                    reject(new Error(`Failed to parse response: ${error.message}\n\nResponse: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request Error:', error.message);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Test 1: Get all object metadata with ALL available fields
 */
async function testGetAllObjectMetadata() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: Get All Object Metadata (Complete Fields)');
    console.log('='.repeat(80) + '\n');

    const query = `
        query GetObjects {
            objects(paging: { first: 100 }) {
                edges {
                    node {
                        id
                        nameSingular
                        namePlural
                        labelSingular
                        labelPlural
                        description
                        icon
                        shortcut
                        isCustom
                        isRemote
                        isActive
                        isSystem
                        isUIReadOnly
                        isSearchable
                        isLabelSyncedWithName
                        createdAt
                        updatedAt
                        labelIdentifierFieldMetadataId
                        imageIdentifierFieldMetadataId
                    }
                }
            }
        }
    `;

    try {
        const result = await makeMetadataRequest(query);
        
        console.log('📦 Raw API Response:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\n' + '-'.repeat(80));
        console.log('📊 Object Statistics:');
        console.log('-'.repeat(80));
        
        const objects = result.objects.edges.map(edge => edge.node);
        console.log(`Total Objects: ${objects.length}`);
        
        const customObjects = objects.filter(obj => obj.isCustom);
        const standardObjects = objects.filter(obj => !obj.isCustom);
        const systemObjects = objects.filter(obj => obj.isSystem);
        const activeObjects = objects.filter(obj => obj.isActive);
        const inactiveObjects = objects.filter(obj => !obj.isActive);
        
        console.log(`Custom Objects: ${customObjects.length}`);
        console.log(`Standard Objects: ${standardObjects.length}`);
        console.log(`System Objects: ${systemObjects.length}`);
        console.log(`Active Objects: ${activeObjects.length}`);
        console.log(`Inactive Objects: ${inactiveObjects.length}`);
        
        console.log('\n' + '-'.repeat(80));
        console.log('🔍 Sample Objects by Category:');
        console.log('-'.repeat(80));
        
        console.log('\n📌 System Objects (first 5):');
        systemObjects.slice(0, 5).forEach(obj => {
            console.log(`  - ${obj.labelSingular} (${obj.nameSingular})`);
            console.log(`    isCustom: ${obj.isCustom}, isSystem: ${obj.isSystem}, isActive: ${obj.isActive}`);
        });
        
        console.log('\n📌 Standard (Non-System) Objects (first 5):');
        standardObjects.filter(obj => !obj.isSystem).slice(0, 5).forEach(obj => {
            console.log(`  - ${obj.labelSingular} (${obj.nameSingular})`);
            console.log(`    isCustom: ${obj.isCustom}, isSystem: ${obj.isSystem}, isActive: ${obj.isActive}`);
        });
        
        if (customObjects.length > 0) {
            console.log('\n📌 Custom Objects:');
            customObjects.forEach(obj => {
                console.log(`  - ${obj.labelSingular} (${obj.nameSingular})`);
                console.log(`    isCustom: ${obj.isCustom}, isSystem: ${obj.isSystem}, isActive: ${obj.isActive}`);
            });
        } else {
            console.log('\n📌 Custom Objects: None found');
        }
        
        console.log('\n' + '-'.repeat(80));
        console.log('💡 Grouping Strategy Insights:');
        console.log('-'.repeat(80));
        console.log(`
Based on the API response, we can group resources as follows:

1. ALL RESOURCES: Show all objects (${objects.length} total)
   
2. SYSTEM RESOURCES: isSystem === true (${systemObjects.length} objects)
   - These are internal databases that Twenty doesn't show to users by default
   - Examples: ${systemObjects.slice(0, 3).map(o => o.nameSingular).join(', ')}
   
3. STANDARD RESOURCES: !isCustom && !isSystem (${standardObjects.filter(o => !o.isSystem).length} objects)
   - User-facing standard Twenty objects
   - Examples: ${standardObjects.filter(o => !o.isSystem).slice(0, 3).map(o => o.nameSingular).join(', ')}
   
4. CUSTOM RESOURCES: isCustom === true (${customObjects.length} objects)
   - User-created custom objects
   ${customObjects.length > 0 ? `- Examples: ${customObjects.slice(0, 3).map(o => o.nameSingular).join(', ')}` : '- None created yet'}

5. INACTIVE RESOURCES: isActive === false (${inactiveObjects.length} objects)
   - Hidden/deactivated objects
   ${inactiveObjects.length > 0 ? `- Examples: ${inactiveObjects.slice(0, 3).map(o => o.nameSingular).join(', ')}` : '- None found'}
        `);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (API_KEY === 'YOUR_API_KEY_HERE') {
            console.error('\n⚠️  Please update the API_KEY constant in this script with your actual Twenty API key');
        }
    }
}

/**
 * Test 2: Check if there are additional grouping properties
 */
async function testDiscoverAdditionalProperties() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: GraphQL Introspection - Discover All Object Fields');
    console.log('='.repeat(80) + '\n');

    const query = `
        query IntrospectObjectType {
            __type(name: "Object") {
                name
                fields {
                    name
                    type {
                        name
                        kind
                    }
                    description
                }
            }
        }
    `;

    try {
        const result = await makeMetadataRequest(query);
        
        console.log('📋 All Available Fields on Object Type:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\n' + '-'.repeat(80));
        console.log('📊 Field Summary:');
        console.log('-'.repeat(80));
        
        if (result.__type && result.__type.fields) {
            result.__type.fields.forEach(field => {
                console.log(`  - ${field.name}: ${field.type.name || field.type.kind}`);
                if (field.description) {
                    console.log(`    ${field.description}`);
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Twenty CRM Resource Metadata Explorer');
    console.log('Purpose: Discover properties for intelligent resource grouping\n');
    
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        console.error('❌ ERROR: Please configure your API key before running this test');
        console.error('Update the following constants in this script:');
        console.error('  - TWENTY_DOMAIN: Your Twenty instance URL (e.g., http://localhost:3000)');
        console.error('  - API_KEY: Your Twenty API key from Settings -> Developers\n');
        process.exit(1);
    }
    
    try {
        await testGetAllObjectMetadata();
        await testDiscoverAdditionalProperties();
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Tests Complete!');
        console.log('='.repeat(80));
        console.log('\nNext Steps:');
        console.log('1. Review the output above to see what grouping properties are available');
        console.log('2. Update the Resource Group implementation based on findings');
        console.log('3. Consider using isSystem property for System Resources group');
        console.log('4. Consider filtering out inactive objects (isActive === false)');
        
    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
        process.exit(1);
    }
}

// Run the tests
main();
