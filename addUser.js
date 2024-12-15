const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');

// Path to users.json
const usersFilePath = path.join(__dirname, 'users.json');

// Function to add a new user
const addUser = async (username, password) => {
    if (!username || !password) {
        console.error('Username and password are required.');
        return;
    }

    let users = {};
    // Handle missing or malformed users.json
    if (fs.existsSync(usersFilePath)) {
        try {
            users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        } catch (err) {
            console.error('Error reading users.json. Reinitializing file...');
            users = {}; // Reinitialize users
        }
    }

    // Check if the username already exists
    if (users[username]) {
        console.error(`User "${username}" already exists.`);
        return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Add the user to the users object
    users[username] = hashedPassword;

    // Write the updated users object to users.json
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
        console.log(`User "${username}" added successfully.`);
    } catch (err) {
        console.error('Error writing to users.json:', err);
    }
};

// Collect input from the command line
const [,, username, password] = process.argv;

if (!username || !password) {
    console.log('Usage: node addUser.js <username> <password>');
} else {
    addUser(username, password);
}