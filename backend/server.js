const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Expense,Group } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

// JWT Secret Key (In real apps, put this in .env)
const JWT_SECRET = "super_secret_key_123";

// --- DB CONNECTION ---
mongoose.connect('mongodb+srv://somanathr2004:iwp1hBSZtsv27JBA@cluster0.wyntp.mongodb.net/expense_splitter')
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// --- AUTH ROUTES ---

// 1. Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// 2. Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  
  if (!user) return res.status(400).json({ error: "User not found" });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (isPasswordValid) {
    const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET);
    return res.json({ status: 'ok', token, userId: user._id, name: user.name });
  } else {
    return res.status(400).json({ error: "Invalid password" });
  }
});

// 3. Get All Users (For the dropdown list)
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'name email');
  res.json(users);
});

// --- EXPENSE ROUTES ---

// 4. Create Expense
app.post('/api/expenses', async (req, res) => {
  const { description, amount, payerId, splitType, members } = req.body;
  // 'members' = List of ALL participants including the Owner
  
  try {
    const totalAmount = Number(amount);
    let calculatedSplits = [];

    // --- STEP 1: CALCULATE SPLIT FOR EVERYONE (Including Owner) ---
    
    if (splitType === 'EQUAL') {
      // Logic: $100 / 3 people = $33.33 each
      const splitAmount = parseFloat((totalAmount / members.length).toFixed(2));
      
      calculatedSplits = members.map(m => ({
        user: m.userId,
        owed: splitAmount
      }));

      // Penny adjustment (Give remainder to the first person, usually owner)
      const totalCalc = splitAmount * members.length;
      const difference = totalAmount - totalCalc;
      if (difference !== 0) {
        calculatedSplits[0].owed += difference;
      }
    } 
    else if (splitType === 'EXACT') {
      // Validate: Alice($30) + Bob($30) + Charlie($40) = $100
      const sum = members.reduce((acc, m) => acc + Number(m.value), 0);
      if (sum !== totalAmount) return res.status(400).json({ error: "Total split amounts must equal the bill amount." });
      
      calculatedSplits = members.map(m => ({ user: m.userId, owed: Number(m.value) }));
    } 
    else if (splitType === 'PERCENTAGE') {
      const sum = members.reduce((acc, m) => acc + Number(m.value), 0);
      if (sum !== 100) return res.status(400).json({ error: "Percentages must add up to 100%." });

      calculatedSplits = members.map(m => ({
        user: m.userId,
        owed: parseFloat(((m.value / 100) * totalAmount).toFixed(2))
      }));
    }

    // --- STEP 2: REMOVE THE PAYER FROM DEBT LIST ---
    // The owner paid $100. Their share was $33. 
    // We only record that Bob owes $33 and Charlie owes $33.
    const finalDebts = calculatedSplits.filter(m => m.user !== payerId);

    if (finalDebts.length === 0) {
      return res.status(400).json({ error: "You cannot add an expense with only yourself." });
    }

    await Expense.create({
      description,
      amount: totalAmount,
      splitType,
      payer: payerId,
      members: finalDebts // Saving only the debts of others
    });

    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  const { name, memberIds } = req.body;
  try {
    const group = await Group.create({ name, members: memberIds });
    res.json(group);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- NEW ROUTE: GET GROUPS ---
app.post('/api/groups', async (req, res) => {
  const { name, memberIds } = req.body; // Expects: { name: "Goa Trip", memberIds: ["id1", "id2"] }
  
  try {
    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({ error: "A group must have members." });
    }
    
    const group = await Group.create({ 
      name, 
      members: memberIds 
    });
    
    res.json({ status: 'ok', group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: API to Get All Groups (For the dropdown)
app.get('/api/groups', async (req, res) => {
  try {
    // .populate() replaces the ID with the actual User Object (name, email)
    const groups = await Group.find().populate('members'); 
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { description, amount, payerId, splitType, members } = req.body;
  // 'members' = The list of participants selected by the owner
  
  try {
    // Validation: Ensure valid data
    if (!members || members.length === 0) {
      return res.status(400).json({ error: "Please add at least one participant." });
    }

    let finalSplits = [];
    const totalAmount = Number(amount);

    // --- SPLIT LOGIC ---
    // The split happens ONLY among the 'members' array
    
    if (splitType === 'EQUAL') {
      // Example: Amount 100, 2 Participants (Bob, Charlie).
      // Calculation: 100 / 2 = 50 each.
      const splitAmount = parseFloat((totalAmount / members.length).toFixed(2));
      
      finalSplits = members.map(m => ({
        user: m.userId,
        owed: splitAmount
      }));

      // Fix rounding errors (Penny adjustment)
      // If 100 / 3 = 33.33 + 33.33 + 33.33 = 99.99. Add 0.01 to first person.
      const totalCalculated = splitAmount * members.length;
      const difference = totalAmount - totalCalculated;
      if (difference !== 0) {
        finalSplits[0].owed += difference;
      }
    } 
    else if (splitType === 'EXACT') {
      // Validate totals
      const sum = members.reduce((acc, m) => acc + Number(m.value), 0);
      if (sum !== totalAmount) return res.status(400).json({ error: "Split amounts do not equal total." });
      
      finalSplits = members.map(m => ({ user: m.userId, owed: Number(m.value) }));
    } 
    else if (splitType === 'PERCENTAGE') {
      // Validate percentage
      const sum = members.reduce((acc, m) => acc + Number(m.value), 0);
      if (sum !== 100) return res.status(400).json({ error: "Percentages must add up to 100%." });

      finalSplits = members.map(m => ({
        user: m.userId,
        owed: parseFloat(((m.value / 100) * totalAmount).toFixed(2))
      }));
    }

    // Save to DB
    await Expense.create({
      description,
      amount: totalAmount,
      splitType,
      payer: payerId,
      members: finalSplits
    });

    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get User Dashboard (Owed To Me vs I Owe)
// backend/server.js

app.get('/api/user/:userId/dashboard', async (req, res) => {
  const { userId } = req.params;

  // 1. Fetch expenses involving the user
  const expenses = await Expense.find({
    $or: [ { payer: userId }, { "members.user": userId } ]
  }).populate('payer').populate('members.user');

  let balanceMap = {}; 

  // 2. Process Expenses
  expenses.forEach(exp => {
    // A. If I PAID (Others owe me)
    if (exp.payer._id.toString() === userId) {
      exp.members.forEach(m => {
        if (!m.settled && m.user._id.toString() !== userId) {
          const mId = m.user._id.toString();
          
          // Init user in map if not exists
          if (!balanceMap[mId]) {
             balanceMap[mId] = { name: m.user.name, netBalance: 0, transactions: [] };
          }
          
          // Update Math
          balanceMap[mId].netBalance += m.owed;
          
          // Add Description
          balanceMap[mId].transactions.push({
            expenseId: exp._id, // <--- ADD THIS LINE
            description: exp.description,
            amount: m.owed,
            type: "OWES_YOU"
          });
        }
      });
    } 
    // B. If I AM A MEMBER (I owe them)
    else {
      const myShare = exp.members.find(m => m.user._id.toString() === userId);
      if (myShare && !myShare.settled) {
        const payerId = exp.payer._id.toString();
        
        // Init user in map if not exists
        if (!balanceMap[payerId]) {
           balanceMap[payerId] = { name: exp.payer.name, netBalance: 0, transactions: [] };
        }

        // Update Math (Subtract because I owe)
        balanceMap[payerId].netBalance -= myShare.owed;

        // Add Description
        balanceMap[payerId].transactions.push({
            expenseId: exp._id, // <--- ADD THIS LINE
          description: exp.description,
          amount: myShare.owed,
          type: "YOU_OWE"
        });
      }
    }
  });

  // 3. Format Response
  const result = Object.keys(balanceMap).map(id => ({
    userId: id,
    name: balanceMap[id].name,
    netBalance: parseFloat(balanceMap[id].netBalance.toFixed(2)),
    transactions: balanceMap[id].transactions
  }));

  res.json(result);
});

// 6. Settle Up Endpoint
app.post('/api/settle', async (req, res) => {
  const { expenseId, debtorId } = req.body;
  
  const expense = await Expense.findById(expenseId);
  const member = expense.members.find(m => m.user.toString() === debtorId);
  
  if (member) {
    member.settled = true;
    await expense.save();
    res.json({ status: 'ok' });
  } else {
    res.status(400).json({ error: "Member not found" });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));