// Quick network debugging from browser console
async function debugModelDiscovery() {
    const API_BASE = 'http://localhost:8080';
    
    console.log('🔍 DEBUGGING MODEL DISCOVERY PIPELINE');
    console.log('====================================');
    
    // Test 1: Check API_BASE connectivity
    console.log('\n1. Testing API_BASE connectivity...');
    try {
        const healthCheck = await fetch(`${API_BASE}/health`);
        console.log('✅ Backend health:', healthCheck.status, healthCheck.statusText);
    } catch (err) {
        console.log('❌ Backend health failed:', err.message);
        return;
    }
    
    // Test 2: Get provider templates
    console.log('\n2. Testing provider templates...');
    try {
        const templatesResp = await fetch(`${API_BASE}/admin/llm/built-in/options`);
        const templates = await templatesResp.json();
        const groqProvider = templates.find(p => p.name === 'groq');
        console.log('✅ Provider templates:', templatesResp.status);
        console.log('🎯 Groq provider found:', groqProvider ? {
            name: groqProvider.name,
            id: groqProvider.id || 'NOT SET',
            model_endpoint: groqProvider.model_endpoint,
            model_fetching: groqProvider.model_fetching
        } : 'NOT FOUND');
    } catch (err) {
        console.log('❌ Provider templates failed:', err.message);
        return;
    }
    
    // Test 3: Test Groq models endpoint with different IDs
    const testIds = ['groq', 'groq-provider', 'Groq'];
    
    for (const testId of testIds) {
        console.log(`\n3.${testIds.indexOf(testId) + 1} Testing Groq models with ID: "${testId}"`);
        try {
            const modelsResp = await fetch(`${API_BASE}/admin/llm/providers/${testId}/models`);
            console.log(`📊 Response status: ${modelsResp.status} ${modelsResp.statusText}`);
            
            if (modelsResp.ok) {
                const modelsData = await modelsResp.json();
                console.log(`✅ SUCCESS with ID "${testId}":`, {
                    models_count: modelsData.models?.length || 0,
                    first_3_models: modelsData.models?.slice(0, 3) || [],
                    cached: modelsData.cached,
                    timestamp: modelsData.timestamp
                });
                break;
            } else {
                const errorText = await modelsResp.text();
                console.log(`❌ FAILED with ID "${testId}": ${errorText.substring(0, 200)}`);
            }
        } catch (err) {
            console.log(`❌ Network error with ID "${testId}":`, err.message);
        }
    }
    
    // Test 4: Check CORS headers
    console.log('\n4. Testing CORS headers...');
    try {
        const corsTest = await fetch(`${API_BASE}/admin/llm/providers/groq/models`, {
            method: 'OPTIONS'
        });
        console.log('✅ CORS preflight:', corsTest.status);
        console.log('🔧 CORS headers:', Object.fromEntries([...corsTest.headers.entries()]));
    } catch (err) {
        console.log('❌ CORS test failed:', err.message);
    }
    
    console.log('\n🏁 Debug completed. Check results above.');
}

// Run the debug
debugModelDiscovery();

// Also add to window for manual execution
window.debugModelDiscovery = debugModelDiscovery;