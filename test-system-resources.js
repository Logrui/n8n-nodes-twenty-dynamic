/**
 * Test script to get all System resources (isSystem === true)
 * Purpose: See which resources are marked as "System" in Twenty CRM
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
}

// Configuration
const TWENTY_DOMAIN = (process.env.TWENTY_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_KEY = process.env.TWENTY_API_KEY || 'YOUR_API_KEY_HERE';

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

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
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
                    reject(new Error(`Failed to parse response: ${error.message}`));
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
 * Get all objects and categorize them
 */
async function analyzeResources() {
    console.log('🚀 Twenty CRM System Resources Analyzer');
    console.log('=' .repeat(80) + '\n');

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
                    }
                }
            }
        }
    `;

    try {
        const result = await makeMetadataRequest(query);
        const allObjects = result.objects.edges.map(edge => edge.node);

        // Categorize objects
        const systemObjects = allObjects.filter(obj => obj.isSystem === true);
        const standardObjects = allObjects.filter(obj => !obj.isCustom && !obj.isSystem);
        const customObjects = allObjects.filter(obj => obj.isCustom === true);
        const remoteObjects = allObjects.filter(obj => obj.isRemote === true);
        const readOnlyObjects = allObjects.filter(obj => obj.isUIReadOnly === true);
        const searchableObjects = allObjects.filter(obj => obj.isSearchable === true);
        const inactiveObjects = allObjects.filter(obj => obj.isActive === false);

        console.log('📊 STATISTICS');
        console.log('-'.repeat(80));
        console.log(`Total Objects:              ${allObjects.length}`);
        console.log(`System Objects (isSystem):  ${systemObjects.length}`);
        console.log(`Standard Objects:           ${standardObjects.length}`);
        console.log(`Custom Objects (isCustom):  ${customObjects.length}`);
        console.log(`Remote Objects (isRemote):  ${remoteObjects.length}`);
        console.log(`Read-Only (isUIReadOnly):   ${readOnlyObjects.length}`);
        console.log(`Searchable (isSearchable):  ${searchableObjects.length}`);
        console.log(`Inactive (isActive=false):  ${inactiveObjects.length}`);
        console.log('');

        // System Objects Detail
        console.log('=' .repeat(80));
        console.log(`📌 SYSTEM RESOURCES (isSystem === true) - ${systemObjects.length} objects`);
        console.log('=' .repeat(80));
        console.log('');
        
        systemObjects.forEach((obj, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${obj.labelSingular.padEnd(40)} (${obj.nameSingular})`);
            console.log(`    Icon: ${obj.icon || 'none'}`);
            console.log(`    Shortcut: ${obj.shortcut || 'none'}`);
            console.log(`    Description: ${obj.description || 'none'}`);
            console.log(`    Flags: ${[
                obj.isSearchable ? 'searchable' : '',
                obj.isUIReadOnly ? 'readOnly' : '',
                obj.isRemote ? 'remote' : '',
                obj.isActive ? 'active' : 'inactive',
            ].filter(Boolean).join(', ')}`);
            console.log('');
        });

        // Standard (User-Facing) Objects Detail
        console.log('=' .repeat(80));
        console.log(`📌 STANDARD RESOURCES (!isCustom && !isSystem) - ${standardObjects.length} objects`);
        console.log('=' .repeat(80));
        console.log('');
        
        standardObjects.forEach((obj, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${obj.labelSingular.padEnd(40)} (${obj.nameSingular})`);
            console.log(`    Icon: ${obj.icon || 'none'}`);
            console.log(`    Shortcut: ${obj.shortcut || 'none'}`);
            console.log(`    Description: ${obj.description || 'none'}`);
            console.log(`    Flags: ${[
                obj.isSearchable ? 'searchable' : '',
                obj.isUIReadOnly ? 'readOnly' : '',
                obj.isRemote ? 'remote' : '',
                obj.isActive ? 'active' : 'inactive',
            ].filter(Boolean).join(', ')}`);
            console.log('');
        });

        // Custom Objects Detail
        console.log('=' .repeat(80));
        console.log(`📌 CUSTOM RESOURCES (isCustom === true) - ${customObjects.length} objects`);
        console.log('=' .repeat(80));
        console.log('');
        
        if (customObjects.length > 0) {
            customObjects.forEach((obj, index) => {
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${obj.labelSingular.padEnd(40)} (${obj.nameSingular})`);
                console.log(`    Icon: ${obj.icon || 'none'}`);
                console.log(`    Shortcut: ${obj.shortcut || 'none'}`);
                console.log(`    Description: ${obj.description || 'none'}`);
                console.log(`    Flags: ${[
                    obj.isSearchable ? 'searchable' : '',
                    obj.isUIReadOnly ? 'readOnly' : '',
                    obj.isRemote ? 'remote' : '',
                    obj.isActive ? 'active' : 'inactive',
                ].filter(Boolean).join(', ')}`);
                console.log('');
            });
        } else {
            console.log('No custom objects found.\n');
        }

        // Recommendations
        console.log('=' .repeat(80));
        console.log('💡 RECOMMENDATIONS FOR RESOURCE GROUPS');
        console.log('=' .repeat(80));
        console.log(`
Based on the analysis, here's the recommended grouping strategy:

1. ALL RESOURCES (${allObjects.length} total)
   - Show everything
   - Default option

2. STANDARD RESOURCES (${standardObjects.length} objects)
   - Filter: !isCustom && !isSystem && isActive
   - These are the main user-facing Twenty objects
   - Examples: ${standardObjects.slice(0, 3).map(o => o.labelSingular).join(', ')}
   - Good for most users

3. SYSTEM RESOURCES (${systemObjects.length} objects)
   - Filter: isSystem === true
   - Internal databases and meta-objects
   - Examples: ${systemObjects.slice(0, 3).map(o => o.labelSingular).join(', ')}
   - Advanced users only

4. CUSTOM RESOURCES (${customObjects.length} objects)
   - Filter: isCustom === true
   - User-created objects
   ${customObjects.length > 0 ? `- Examples: ${customObjects.slice(0, 3).map(o => o.labelSingular).join(', ')}` : '- None created yet'}
   - Useful for users with many custom objects

5. REMOTE RESOURCES (${remoteObjects.length} objects)
   - Filter: isRemote === true
   ${remoteObjects.length > 0 ? `- Examples: ${remoteObjects.slice(0, 3).map(o => o.labelSingular).join(', ')}` : '- None configured'}
   - Connected external data sources
   - Only show if remote objects exist

6. SEARCHABLE RESOURCES (${searchableObjects.length} objects)
   - Filter: isSearchable === true
   - Objects that can be searched
   - Good for users who want to filter out meta-objects

RECOMMENDED IMPLEMENTATION:
- All Resources (default)
- Standard Resources (most useful for regular users)
- Custom Resources (if any exist)
- System Resources (advanced/debugging)
- Filter out inactive objects by default (currently ${inactiveObjects.length} inactive)
        `);

        console.log('\n' + '=' .repeat(80));
        console.log('✅ Analysis Complete!');
        console.log('=' .repeat(80));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the analysis
if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ ERROR: Please configure your API key');
    console.error('Set TWENTY_API_KEY in tests/.env file\n');
    process.exit(1);
}

analyzeResources();
