/**
 * Introspect SELECT and MULTI_SELECT Field Options
 * 
 * This script queries Twenty CRM's metadata API to discover:
 * 1. How SELECT/MULTI_SELECT field options are stored
 * 2. The structure of option data
 * 3. Example options from actual SELECT fields
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

const TWENTY_API_URL = process.env.TWENTY_API_URL || 'http://localhost:3000';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

if (!TWENTY_API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY not found in environment variables');
    console.error('Please set TWENTY_API_KEY in your .env file');
    process.exit(1);
}

// Fix URL formatting
const baseUrl = TWENTY_API_URL.replace(/\/+$/, '').replace(/\/graphql$/, '');
const metadataUrl = `${baseUrl}/metadata`;

console.log('🔍 Twenty CRM SELECT Options Introspection');
console.log('='.repeat(60));
console.log(`API URL: ${baseUrl}`);
console.log('='.repeat(60));
console.log();

/**
 * Fetch metadata with full field details including options
 */
async function getMetadataWithOptions() {
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
                        fields(paging: { first: 100 }) {
                            edges {
                                node {
                                    id
                                    name
                                    label
                                    type
                                    isNullable
                                    isActive
                                    isCustom
                                    defaultValue
                                    options
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch(metadataUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TWENTY_API_KEY}`,
            },
            body: JSON.stringify({ query }),
        });

        const result = await response.json();
        
        if (result.errors) {
            console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2));
            return null;
        }

        return result.data;
    } catch (error) {
        console.error('❌ Fetch Error:', error.message);
        return null;
    }
}

/**
 * Find all SELECT and MULTI_SELECT fields with their options
 */
async function findSelectFields() {
    console.log('📊 Fetching metadata with field options...\n');
    
    const data = await getMetadataWithOptions();
    
    if (!data || !data.objects || !data.objects.edges) {
        console.error('❌ No metadata found or unexpected structure');
        return;
    }

    const selectFields = [];
    const multiSelectFields = [];

    for (const objEdge of data.objects.edges) {
        const obj = objEdge.node;
        
        if (!obj.fields || !obj.fields.edges) continue;

        for (const fieldEdge of obj.fields.edges) {
            const field = fieldEdge.node;
            
            if (field.type === 'SELECT') {
                selectFields.push({
                    object: obj.nameSingular,
                    objectLabel: obj.labelSingular,
                    fieldName: field.name,
                    fieldLabel: field.label,
                    isCustom: field.isCustom,
                    options: field.options,
                    defaultValue: field.defaultValue,
                });
            } else if (field.type === 'MULTI_SELECT') {
                multiSelectFields.push({
                    object: obj.nameSingular,
                    objectLabel: obj.labelSingular,
                    fieldName: field.name,
                    fieldLabel: field.label,
                    isCustom: field.isCustom,
                    options: field.options,
                    defaultValue: field.defaultValue,
                });
            }
        }
    }

    // Report findings
    console.log('═'.repeat(60));
    console.log('📋 SELECT FIELDS FOUND');
    console.log('═'.repeat(60));
    console.log(`Total: ${selectFields.length} fields\n`);

    for (const field of selectFields) {
        console.log(`🔹 ${field.object}.${field.fieldName}`);
        console.log(`   Label: ${field.fieldLabel}`);
        console.log(`   Custom: ${field.isCustom ? 'Yes' : 'No'}`);
        console.log(`   Default: ${field.defaultValue || 'null'}`);
        console.log(`   Options Structure:`, typeof field.options);
        if (field.options) {
            console.log(`   Options Data:`, JSON.stringify(field.options, null, 2));
        } else {
            console.log(`   Options Data: null`);
        }
        console.log();
    }

    console.log('═'.repeat(60));
    console.log('📋 MULTI_SELECT FIELDS FOUND');
    console.log('═'.repeat(60));
    console.log(`Total: ${multiSelectFields.length} fields\n`);

    for (const field of multiSelectFields) {
        console.log(`🔹 ${field.object}.${field.fieldName}`);
        console.log(`   Label: ${field.fieldLabel}`);
        console.log(`   Custom: ${field.isCustom ? 'Yes' : 'No'}`);
        console.log(`   Default: ${field.defaultValue || 'null'}`);
        console.log(`   Options Structure:`, typeof field.options);
        if (field.options) {
            console.log(`   Options Data:`, JSON.stringify(field.options, null, 2));
        } else {
            console.log(`   Options Data: null`);
        }
        console.log();
    }

    // Save results to file
    const fs = require('fs');
    const results = {
        timestamp: new Date().toISOString(),
        apiUrl: baseUrl,
        selectFields,
        multiSelectFields,
    };

    fs.writeFileSync(
        'SELECT_OPTIONS_ANALYSIS.json',
        JSON.stringify(results, null, 2)
    );

    console.log('═'.repeat(60));
    console.log('✅ Results saved to SELECT_OPTIONS_ANALYSIS.json');
    console.log('═'.repeat(60));
}

// Run the introspection
findSelectFields().catch(error => {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
});
