import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BalanceView = ({ groupId, refreshTrigger }) => {
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/groups/${groupId}/balance`);
        setBalances(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (groupId) fetchBalance();
  }, [groupId, refreshTrigger]);

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', minWidth: '300px' }}>
      <h3>Group Balances</h3>
      {balances.length === 0 ? <p>No expenses yet.</p> : (
        <ul>
          {balances.map((b, i) => (
            <li key={i} style={{ color: b.netBalance >= 0 ? 'green' : 'red' }}>
              <strong>{b.user}</strong>: {b.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BalanceView;