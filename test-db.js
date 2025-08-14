const fs = require('fs');
const path = require('path');

// Test the database functionality
const dbPath = path.join(__dirname, 'data');
const usersFile = path.join(dbPath, 'users.json');
const registrationsFile = path.join(dbPath, 'registrations.json');

console.log('Testing Database Persistence...\n');

// Check if data directory exists
if (!fs.existsSync(dbPath)) {
  console.log('❌ Data directory does not exist');
  console.log('Creating data directory...');
  fs.mkdirSync(dbPath, { recursive: true });
  console.log('✅ Data directory created');
} else {
  console.log('✅ Data directory exists');
}

// Check users file
if (fs.existsSync(usersFile)) {
  try {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    console.log(`✅ Users file exists with ${users.length} users`);
    console.log('Users:', users.map(u => u.username));
  } catch (err) {
    console.log('❌ Error reading users file:', err.message);
  }
} else {
  console.log('❌ Users file does not exist');
}

// Check registrations file
if (fs.existsSync(registrationsFile)) {
  try {
    const registrations = JSON.parse(fs.readFileSync(registrationsFile, 'utf8'));
    console.log(`✅ Registrations file exists with ${registrations.length} registrations`);
    if (registrations.length > 0) {
      console.log('Sample registration:', registrations[0]);
    }
  } catch (err) {
    console.log('❌ Error reading registrations file:', err.message);
  }
} else {
  console.log('❌ Registrations file does not exist');
}

console.log('\nTo test the full functionality:');
console.log('1. Start the server: npm run dev');
console.log('2. Register a new user through the 3D login overlay');
console.log('3. Create some registrations');
console.log('4. Check the Details button');
console.log('5. Restart the server and verify data persists');
