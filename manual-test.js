const fs = require('fs');
const path = require('path');

// Manual test of registration system
const dbPath = path.join(__dirname, 'data');
const registrationsFile = path.join(dbPath, 'registrations.json');

console.log('Manual Registration Test...\n');

// Simulate creating a test registration
const testRegistration = {
  id: Date.now().toString(),
  type: 'Director Identification Number',
  companyName: 'N/A',
  businessOwner: 'Test User',
  date: new Date().toISOString(),
  username: 'aby@gmail.com', // Using existing user
  fileName: 'test-din-123456.pdf'
};

// Load existing registrations or create new array
let registrations = [];
if (fs.existsSync(registrationsFile)) {
  try {
    registrations = JSON.parse(fs.readFileSync(registrationsFile, 'utf8'));
    console.log('Loaded existing registrations:', registrations.length);
  } catch (err) {
    console.log('Error loading registrations, starting fresh');
  }
}

// Add test registration
registrations.push(testRegistration);

// Save to file
try {
  fs.writeFileSync(registrationsFile, JSON.stringify(registrations, null, 2));
  console.log('✅ Test registration saved successfully');
  console.log('Registration:', testRegistration);
} catch (err) {
  console.log('❌ Error saving test registration:', err.message);
}

// Test retrieval
console.log('\nTesting retrieval for aby@gmail.com...');
const userRegistrations = registrations.filter(reg => reg.username.toLowerCase() === 'aby@gmail.com');
console.log('Found registrations for aby@gmail.com:', userRegistrations.length);
userRegistrations.forEach(reg => {
  console.log(`- ${reg.type} (${reg.date})`);
});

console.log('\nTest completed! Now try the Details button in the web app.');
