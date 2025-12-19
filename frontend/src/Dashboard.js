import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddExpense from './AddExpense';
import CreateGroup from './CreateGroup';

const Dashboard = ({ user }) => {
  const [balances, setBalances] = useState([]);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (user) {
      axios.get(`https://expense-splitter-n6it.onrender.com/api/user/${user.userId}/dashboard`)
        .then(res => setBalances(res.data))
        .catch(err => console.error(err));
    }
  }, [user, refresh]);

  const handleSettle = async (expenseId, amount, type) => {
    const msg = type === 'YOU_OWE' 
      ? `Mark debt of $${amount} as PAID?` 
      : `Confirm you RECEIVED $${amount}?`;

    if (!window.confirm(msg)) return;

    try {      
      await axios.post('https://expense-splitter-n6it.onrender.com/api/settle', {
        expenseId,
        debtorId: user.userId 
      });
      setRefresh(!refresh);
    } catch (err) { alert('Error settling'); }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', flexWrap: 'wrap' }}>
      
      <div style={{ flex: 1, minWidth: '350px' }}>
        <CreateGroup onSuccess={() => console.log("Group created")} />
        <br />
        <AddExpense user={user} onSuccess={() => setRefresh(!refresh)} />
      </div>

      <div style={{ flex: 1, minWidth: '350px' }}>
        <h2>My Balances</h2>
        {balances.length === 0 ? <p>No active debts.</p> : balances.map(friend => (
          <div key={friend.userId} style={{ 
            border: '1px solid #ccc', borderRadius: '8px', padding: '15px', marginBottom: '15px',
            background: friend.netBalance > 0 ? '#e8f5e9' : '#ffebee' 
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>{friend.name}</h3>
              <h3 style={{ margin: 0, color: friend.netBalance >= 0 ? 'green' : 'red' }}>
                {friend.netBalance >= 0 ? `Owes you $${friend.netBalance}` : `You owe $${Math.abs(friend.netBalance)}`}
              </h3>
            </div>

            <div style={{ background: 'white', padding: '10px', borderRadius: '5px', fontSize: '14px' }}>
              <strong>Details:</strong>
              <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                {friend.transactions.map((t, idx) => (
                  <li key={idx} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    
                    <span>
                      {t.description}: 
                      <span style={{ fontWeight: 'bold', margin: '0 5px' }}>${t.amount}</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        ({t.type === "OWES_YOU" ? "They owe" : "You owe"})
                      </span>
                    </span>

                    {t.type === 'YOU_OWE' && (
                      <button 
                        onClick={() => handleSettle(t.expenseId, t.amount, t.type)}
                        style={{ 
                          background: '#d32f2f', color: 'white', border: 'none', 
                          padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' 
                        }}
                      >
                        Pay
                      </button>
                    )}

                  </li>
                ))}
              </ul>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;