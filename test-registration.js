const fs = require('fs');
const path = require('path');

// Test registration functionality
const dbPath = path.join(__dirname, 'data');
const registrationsFile = path.join(dbPath, 'registrations.json');

console.log('Testing Registration System...\n');

// Check if registrations file exists
if (fs.existsSync(registrationsFile)) {
  try {
    const registrations = JSON.parse(fs.readFileSync(registrationsFile, 'utf8'));
    console.log(`✅ Registrations file exists with ${registrations.length} registrations`);
    
    if (registrations.length > 0) {
      console.log('\nAll registrations:');
      registrations.forEach((reg, index) => {
        console.log(`${index + 1}. ${reg.type} - ${reg.username} - ${reg.date}`);
      });
      
      // Group by username
      const byUser = {};
      registrations.forEach(reg => {
        if (!byUser[reg.username]) byUser[reg.username] = [];
        byUser[reg.username].push(reg);
      });
      
      console.log('\nRegistrations by user:');
      Object.keys(byUser).forEach(username => {
        console.log(`${username}: ${byUser[username].length} registrations`);
        byUser[username].forEach(reg => {
          console.log(`  - ${reg.type}`);
        });
      });
    }
  } catch (err) {
    console.log('❌ Error reading registrations file:', err.message);
  }
} else {
  console.log('❌ Registrations file does not exist');
  console.log('This means no registrations have been created yet.');
}

console.log('\nTo test:');
console.log('1. Start the server: npm run dev');
console.log('2. Login with a user (e.g., aby@gmail.com)');
console.log('3. Create a DIN certificate');
console.log('4. Check the Details button');
console.log('5. Run this test again to see if registration was saved');
