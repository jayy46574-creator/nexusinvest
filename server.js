const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(cors());

// Function to load data from file
function loadData() {
    try {
        if (fs.existsSync('data.json')) {
            const data = fs.readFileSync('data.json', 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
    return { users: [], pendingDeposits: [], transactions: [] };
}

// Function to save data to file
function saveData() {
    const data = { users, pendingDeposits, transactions };
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

// Initialize data from file
const initialData = loadData();
let users = initialData.users || [];
let pendingDeposits = initialData.pendingDeposits || [];
let transactions = initialData.transactions || [];

// Sign Up Route - Expanded Profile Model
app.post('/api/signup', (req, res) => {
    const { firstName, lastName, phone, country, email, password, address, referralId } = req.body;

    // Check if the user email already exists
    const userExists = users.some(u => u.email === email);
    if (userExists) {
        return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Push new structured profile object into your array
    users.push({ 
        firstName, 
        lastName, 
        phone, 
        country, 
        email, 
        password, 
        address, 
        referralId: referralId || null, // Stores as null if left blank by the user
        balance: 0 
    });

    saveData(); // Commit the expanded user dataset to data.json
    res.json({ message: 'User registered successfully!' });
});

// Login Route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({ success: true, balance: user.balance });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Admin route to see all users
app.get('/api/admin/users', (req, res) => {
    res.json(users);
});

 // Admin route to update balance
app.post('/api/admin/update-balance', (req, res) => {
    const { email, newBalance } = req.body;
    const user = users.find(u => u.email === email);
    saveData();
    if (user) {
        user.balance = newBalance;
        res.json({ success: true, message: 'Balance updated!' });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// Route for users to request a deposit
app.post('/api/deposit', (req, res) => {
    const { email, amount } = req.body;
    const depositId = Date.now().toString(); 
    pendingDeposits.push({ depositId, email, amount: parseFloat(amount), status: 'Pending' });
    saveData();
    res.json({ success: true, message: 'Deposit request submitted! Admin will verify shortly.' });
});

// Admin route to fetch pending deposits
app.get('/api/admin/pending', (req, res) => {
    res.json(pendingDeposits);
});

// Admin route to approve a deposit
app.post('/api/admin/approve-deposit', (req, res) => {
    const { depositId } = req.body;
    const depositIndex = pendingDeposits.findIndex(d => d.depositId === depositId);

    if (depositIndex > -1) {
        const deposit = pendingDeposits[depositIndex];
        const user = users.find(u => u.email === deposit.email);
        
        if (user) {
            user.balance += deposit.amount; 
            
            const txid = "TXN" + Math.floor(100000 + Math.random() * 900000);
            
            transactions.push({
                txid,
                email: deposit.email,
                type: 'Deposit',
                amount: deposit.amount,
                status: 'Completed'
            });

            pendingDeposits.splice(depositIndex, 1); 
            
            // SAVE ONLY AFTER SUCCESS
            saveData(); 
            
            res.json({ success: true });
        }
    } else {
        res.status(404).json({ success: false, message: 'Deposit not found' });
    }
});

// Route for users to fetch their personal transaction history
app.get('/api/transactions', (req, res) => {
    const { email } = req.query;
    const userTransactions = transactions.filter(t => t.email === email);
    res.json(userTransactions);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// New route to get specific user data
app.get('/api/user', (req, res) => {
    const email = req.query.email;
    const user = users.find(u => u.email === email);

    if (user) {
        res.json({ balance: user.balance, email: user.email });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});
// Admin route to delete a user
app.post('/api/admin/delete-user', (req, res) => {
    const { email } = req.body;
    users = users.filter(u => u.email !== email); // Remove the user
    saveData(); // Save changes to data.json
    res.json({ success: true, message: 'User deleted successfully!' });
});