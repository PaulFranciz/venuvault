#!/usr/bin/env node

/**
 * Script to test and debug hydration mismatch issues
 * Focuses on payment success page and icon rendering
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3002';

console.log('🔍 Testing Hydration Mismatch Issues');
console.log('='.repeat(50));

async function testPaymentSuccessPage() {
  console.log('\n1️⃣ Testing Payment Success Page SSR vs Client Rendering...');
  
  try {
    // Test the payment success page with a mock reference
    const testUrl = `${BASE_URL}/payment/success?reference=test_hydration_fix&trxref=test_hydration_fix`;
    
    console.log(`🌐 Fetching: ${testUrl}`);
    
    const response = await fetch(testUrl);
    const html = await response.text();
    
    console.log('📄 Server-rendered HTML analysis:');
    
    // Check for specific patterns that might cause hydration issues
    const patterns = [
      { name: 'SVG elements', regex: /<svg[^>]*>/g },
      { name: 'Lucide icons', regex: /lucide-/g },
      { name: 'CheckCircle references', regex: /CheckCircle|circle-check/g },
      { name: 'Loading states', regex: /Processing|animate-spin/g },
      { name: 'Conditional rendering', regex: /mb-6/g }
    ];
    
    patterns.forEach(pattern => {
      const matches = html.match(pattern.regex);
      console.log(`  - ${pattern.name}: ${matches ? matches.length : 0} found`);
      if (matches && matches.length > 0) {
        console.log(`    Examples: ${matches.slice(0, 3).join(', ')}`);
      }
    });
    
    // Check for hydration-sensitive content
    console.log('\n🔎 Potential hydration issues:');
    
    if (html.includes('<svg')) {
      console.log('  ⚠️  SVG elements found in SSR - this can cause hydration mismatch');
    }
    
    if (html.includes('lucide-')) {
      console.log('  ⚠️  Lucide classes found in SSR - icons may render differently on client');
    }
    
    if (html.includes('CheckCircle')) {
      console.log('  ⚠️  CheckCircle component in SSR - likely source of hydration mismatch');
    }
    
    console.log('\n✅ Payment success page analysis complete');
    
  } catch (error) {
    console.error('❌ Error testing payment success page:', error.message);
  }
}

async function testIconRendering() {
  console.log('\n2️⃣ Testing Icon Rendering Patterns...');
  
  // Test different icon rendering approaches
  const testUrls = [
    '/payment/success?reference=test_ref',
    '/tickets',
    '/'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`\n🔗 Testing: ${BASE_URL}${url}`);
      const response = await fetch(`${BASE_URL}${url}`);
      const html = await response.text();
      
      const iconCount = (html.match(/<svg/g) || []).length;
      const lucideCount = (html.match(/lucide-/g) || []).length;
      
      console.log(`  - SVG icons: ${iconCount}`);
      console.log(`  - Lucide references: ${lucideCount}`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  await testPaymentSuccessPage();
  await testIconRendering();
  
  console.log('\n🏁 Testing Complete');
  console.log('\nRecommended fixes:');
  console.log('1. Replace Lucide icons with simple HTML/CSS alternatives for SSR pages');
  console.log('2. Use suppressHydrationWarning for client-only content');
  console.log('3. Ensure consistent initial render structure');
}

runAllTests().catch(console.error); 