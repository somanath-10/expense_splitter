const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Expense,Group } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());
const JWT_SECRET = "super_secret_key_123";

mongoose.connect('mongodb+srv://somanathr2004:iwp1hBSZtsv27JBA@cluster0.wyntp.mongodb.net/expense_splitter')
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));


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

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'name email');
  res.json(users);
});


app.post('/api/expenses', async (req, res) => {
  const { description, amount, payerId, splitType, members } = req.body;
  
  try {
    const totalAmount = Number(amount);
    let calculatedSplits = [];
        if (splitType === 'EQUAL') {
      const splitAmount = parseFloat((totalAmount / members.length).toFixed(2));      
      calculatedSplits = members.map(m => ({
        user: m.userId,
        owed: splitAmount
      }));

      const totalCalc = splitAmount * members.length;
      const difference = totalAmount - totalCalc;
      if (difference !== 0) {
        calculatedSplits[0].owed += difference;
      }
    } 
    else if (splitType === 'EXACT') {
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

    const finalDebts = calculatedSplits.filter(m => m.user !== payerId);

    if (finalDebts.length === 0) {
      return res.status(400).json({ error: "You cannot add an expense with only yourself." });
    }

    await Expense.create({
      description,
      amount: totalAmount,
      splitType,
      payer: payerId,
      members: finalDebts 
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

app.post('/api/groups', async (req, res) => {
  const { name, memberIds } = req.body; 
  
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

app.get('/api/groups', async (req, res) => {
  try {
    const groups = await Group.find().populate('members'); 
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { description, amount, payerId, splitType, members } = req.body;  
  try {
    if (!members || members.length === 0) {
      return res.status(400).json({ error: "Please add at least one participant." });
    }

    let finalSplits = [];
    const totalAmount = Number(amount);

    
    if (splitType === 'EQUAL') {
      const splitAmount = parseFloat((totalAmount / members.length).toFixed(2));
      
      finalSplits = members.map(m => ({
        user: m.userId,
        owed: splitAmount
      }));
      const totalCalculated = splitAmount * members.length;
      const difference = totalAmount - totalCalculated;
      if (difference !== 0) {
        finalSplits[0].owed += difference;
      }
    } 
    else if (splitType === 'EXACT') {
      const sum = members.reduce((acc, m) => acc + Number(m.value), 0);
      if (sum !== totalAmount) return res.status(400).json({ error: "Split amounts do not equal total." });
      
      finalSplits = members.map(m => ({ user: m.userId, owed: Number(m.value) }));
    } 
    else if (splitType === 'PERCENTAGE') {
      const sum = members.reduce((acc, m) => acc + Number(m.value), 0);
      if (sum !== 100) return res.status(400).json({ error: "Percentages must add up to 100%." });

      finalSplits = members.map(m => ({
        user: m.userId,
        owed: parseFloat(((m.value / 100) * totalAmount).toFixed(2))
      }));
    }

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

app.get('/api/user/:userId/dashboard', async (req, res) => {
  const { userId } = req.params;

  const expenses = await Expense.find({
    $or: [ { payer: userId }, { "members.user": userId } ]
  }).populate('payer').populate('members.user');

  let balanceMap = {}; 

  expenses.forEach(exp => {
    if (exp.payer._id.toString() === userId) {
      exp.members.forEach(m => {
        if (!m.settled && m.user._id.toString() !== userId) {
          const mId = m.user._id.toString();
          
          if (!balanceMap[mId]) {
             balanceMap[mId] = { name: m.user.name, netBalance: 0, transactions: [] };
          }
          
          balanceMap[mId].netBalance += m.owed;
          balanceMap[mId].transactions.push({
            expenseId: exp._id, 
            description: exp.description,
            amount: m.owed,
            type: "OWES_YOU"
          });
        }
      });
    } 
    else {
      const myShare = exp.members.find(m => m.user._id.toString() === userId);
      if (myShare && !myShare.settled) {
        const payerId = exp.payer._id.toString();
        
        if (!balanceMap[payerId]) {
           balanceMap[payerId] = { name: exp.payer.name, netBalance: 0, transactions: [] };
        }

        balanceMap[payerId].netBalance -= myShare.owed;

        balanceMap[payerId].transactions.push({
            expenseId: exp._id, 
          description: exp.description,
          amount: myShare.owed,
          type: "YOU_OWE"
        });
      }
    }
  });

  const result = Object.keys(balanceMap).map(id => ({
    userId: id,
    name: balanceMap[id].name,
    netBalance: parseFloat(balanceMap[id].netBalance.toFixed(2)),
    transactions: balanceMap[id].transactions
  }));

  res.json(result);
});

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