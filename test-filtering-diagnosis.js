/**
 * Test script to diagnose filtering issues with Standard and System Resources
 * Purpose: Check if objects have the required properties and if filtering logic works
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
 * Test filtering logic with actual API data
 */
async function testFiltering() {
    console.log('🔍 Testing Resource Group Filtering Logic');
    console.log('=' .repeat(80) + '\n');

    const query = `
        query GetObjects {
            objects(paging: { first: 100 }) {
                edges {
                    node {
                        id
                        nameSingular
                        labelSingular
                        isCustom
                        isSystem
                        isActive
                    }
                }
            }
        }
    `;

    try {
        const result = await makeMetadataRequest(query);
        const allObjects = result.objects.edges.map(edge => edge.node);

        console.log('📦 Total Objects Retrieved:', allObjects.length);
        console.log('');

        // Test each filter
        console.log('🧪 Testing Filter: ALL RESOURCES');
        console.log('-'.repeat(80));
        const allFiltered = allObjects;
        console.log(`Result: ${allFiltered.length} objects`);
        console.log('Filter: (none)');
        console.log('');

        console.log('🧪 Testing Filter: STANDARD RESOURCES');
        console.log('-'.repeat(80));
        console.log('Filter: isCustom === false && isSystem === false && isActive === true');
        const standardFiltered = allObjects.filter(obj => 
            obj.isCustom === false && obj.isSystem === false && obj.isActive === true
        );
        console.log(`Result: ${standardFiltered.length} objects`);
        if (standardFiltered.length > 0) {
            console.log('✅ Filter is working!');
            console.log('Sample objects:');
            standardFiltered.slice(0, 5).forEach(obj => {
                console.log(`  - ${obj.labelSingular} (${obj.nameSingular})`);
                console.log(`    isCustom: ${obj.isCustom}, isSystem: ${obj.isSystem}, isActive: ${obj.isActive}`);
            });
        } else {
            console.log('❌ Filter returned 0 objects - PROBLEM DETECTED!');
            console.log('');
            console.log('🔍 Checking what properties objects actually have:');
            const sample = allObjects[0];
            console.log('Sample object:', JSON.stringify(sample, null, 2));
            console.log('');
            console.log('🔍 Checking property types:');
            allObjects.slice(0, 3).forEach(obj => {
                console.log(`Object: ${obj.labelSingular}`);
                console.log(`  isCustom: ${obj.isCustom} (type: ${typeof obj.isCustom})`);
                console.log(`  isSystem: ${obj.isSystem} (type: ${typeof obj.isSystem})`);
                console.log(`  isActive: ${obj.isActive} (type: ${typeof obj.isActive})`);
            });
        }
        console.log('');

        console.log('🧪 Testing Filter: SYSTEM RESOURCES');
        console.log('-'.repeat(80));
        console.log('Filter: isSystem === true && isCustom === false');
        const systemFiltered = allObjects.filter(obj => 
            obj.isSystem === true && obj.isCustom === false
        );
        console.log(`Result: ${systemFiltered.length} objects`);
        if (systemFiltered.length > 0) {
            console.log('✅ Filter is working!');
            console.log('Sample objects:');
            systemFiltered.slice(0, 5).forEach(obj => {
                console.log(`  - ${obj.labelSingular} (${obj.nameSingular})`);
                console.log(`    isCustom: ${obj.isCustom}, isSystem: ${obj.isSystem}, isActive: ${obj.isActive}`);
            });
        } else {
            console.log('❌ Filter returned 0 objects - PROBLEM DETECTED!');
        }
        console.log('');

        console.log('🧪 Testing Filter: CUSTOM RESOURCES');
        console.log('-'.repeat(80));
        console.log('Filter: isCustom === true');
        const customFiltered = allObjects.filter(obj => 
            obj.isCustom === true
        );
        console.log(`Result: ${customFiltered.length} objects`);
        if (customFiltered.length > 0) {
            console.log('✅ Filter is working!');
            console.log('Sample objects:');
            customFiltered.slice(0, 5).forEach(obj => {
                console.log(`  - ${obj.labelSingular} (${obj.nameSingular})`);
                console.log(`    isCustom: ${obj.isCustom}, isSystem: ${obj.isSystem}, isActive: ${obj.isActive}`);
            });
        } else {
            console.log('⚠️  No custom objects found (this is ok if none were created)');
        }
        console.log('');

        // Additional diagnostics
        console.log('=' .repeat(80));
        console.log('🔬 DETAILED DIAGNOSTICS');
        console.log('=' .repeat(80));
        console.log('');

        // Check if properties exist on all objects
        const hasIsCustom = allObjects.every(obj => 'isCustom' in obj);
        const hasIsSystem = allObjects.every(obj => 'isSystem' in obj);
        const hasIsActive = allObjects.every(obj => 'isActive' in obj);

        console.log('Property existence check:');
        console.log(`  isCustom present on all objects: ${hasIsCustom ? '✅' : '❌'}`);
        console.log(`  isSystem present on all objects: ${hasIsSystem ? '✅' : '❌'}`);
        console.log(`  isActive present on all objects: ${hasIsActive ? '✅' : '❌'}`);
        console.log('');

        // Check for null/undefined values
        const nullIsCustom = allObjects.filter(obj => obj.isCustom === null || obj.isCustom === undefined);
        const nullIsSystem = allObjects.filter(obj => obj.isSystem === null || obj.isSystem === undefined);
        const nullIsActive = allObjects.filter(obj => obj.isActive === null || obj.isActive === undefined);

        console.log('Null/undefined value check:');
        console.log(`  isCustom null/undefined: ${nullIsCustom.length} objects`);
        console.log(`  isSystem null/undefined: ${nullIsSystem.length} objects`);
        console.log(`  isActive null/undefined: ${nullIsActive.length} objects`);
        console.log('');

        // Show breakdown by property values
        const isCustomTrue = allObjects.filter(obj => obj.isCustom === true).length;
        const isCustomFalse = allObjects.filter(obj => obj.isCustom === false).length;
        const isSystemTrue = allObjects.filter(obj => obj.isSystem === true).length;
        const isSystemFalse = allObjects.filter(obj => obj.isSystem === false).length;
        const isActiveTrue = allObjects.filter(obj => obj.isActive === true).length;
        const isActiveFalse = allObjects.filter(obj => obj.isActive === false).length;

        console.log('Value distribution:');
        console.log(`  isCustom === true:  ${isCustomTrue} objects`);
        console.log(`  isCustom === false: ${isCustomFalse} objects`);
        console.log(`  isSystem === true:  ${isSystemTrue} objects`);
        console.log(`  isSystem === false: ${isSystemFalse} objects`);
        console.log(`  isActive === true:  ${isActiveTrue} objects`);
        console.log(`  isActive === false: ${isActiveFalse} objects`);
        console.log('');

        // Calculate what SHOULD match standard filter
        console.log('Expected Standard Resources:');
        console.log(`  !isCustom (${isCustomFalse}) AND !isSystem (${isSystemFalse}) AND isActive (${isActiveTrue})`);
        console.log(`  = ${standardFiltered.length} objects (actual result)`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the test
if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ ERROR: Please configure your API key');
    console.error('Set TWENTY_API_KEY in tests/.env file\n');
    process.exit(1);
}

testFiltering();
