const bcrypt = require('bcryptjs');

const hash = '$2a$10$lz9LxAMYakUFyYTHBVDI6OX4OhczEiyJV92H2JMxP4rgGQoYXEZ8i';
const password = 'Demo2024!Admin';

console.log('Testing admin password...');
console.log('Hash:', hash);
console.log('Password:', password);
console.log('Match:', bcrypt.compareSync(password, hash));
