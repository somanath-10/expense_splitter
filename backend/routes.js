const express = require('express');
const router = express.Router();
const { User, Expense } = require('./models');

// ... (Keep generic Create User / Add Expense routes from before) ...

// NEW: Add Expense with specific participants logic is same as before, 
// just ensure your frontend sends the specific 'members' list.

// 1. GET USER DASHBOARD (The "My Page" Logic)
router.get('/user/:userId/dashboard', async (req, res) => {
  const { userId } = req.params;

  // A. Expenses I created (Others owe me)
  const myExpenses = await Expense.find({ payer: userId }).populate('members.user');
  
  // Filter out members who have already settled
  const owedToMe = [];
  myExpenses.forEach(exp => {
    exp.members.forEach(member => {
      // Don't count myself or people who already paid
      if (member.user._id.toString() !== userId && !member.settled) {
        owedToMe.push({
          expenseId: exp._id,
          description: exp.description,
          from: member.user.name,
          amount: member.owed
        });
      }
    });
  });

  // B. Expenses where I am a member (I owe others)
  const debts = await Expense.find({ 
    "members.user": userId, 
    "payer": { $ne: userId } // Exclude expenses I paid for myself
  }).populate('payer');

  const iOwe = [];
  debts.forEach(exp => {
    const myShare = exp.members.find(m => m.user.toString() === userId);
    if (!myShare.settled) {
      iOwe.push({
        expenseId: exp._id,
        description: exp.description,
        to: exp.payer.name,
        amount: myShare.owed
      });
    }
  });

  res.json({ owedToMe, iOwe });
});

// 2. SETTLE UP (Mark a specific debt as paid)
router.post('/settle', async (req, res) => {
  const { expenseId, payerId, debtorId } = req.body; // payerId = Who originally paid (Owner), debtorId = Who is paying back now

  try {
    const expense = await Expense.findById(expenseId);
    
    // Find the member entry for the debtor and mark settled
    const memberIndex = expense.members.findIndex(m => m.user.toString() === debtorId);
    if (memberIndex > -1) {
      expense.members[memberIndex].settled = true;
      await expense.save();
      res.json({ message: "Settled successfully" });
    } else {
      res.status(404).json({ error: "Member not found in expense" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;