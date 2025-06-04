// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export default function AdminDashboard() {
  const [audits, setAudits] = useState([]);
  const [users, setUsers]   = useState([]);

  useEffect(() => {
    const db = getFirestore();

    getDocs(collection(db, 'audits')).then(snap =>
      setAudits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    getDocs(collection(db, 'users')).then(snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>

      <section>
        <h2>All Audits</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {audits.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.createdBy.email}</td>
                <td>
                  {a.createdAt?.toDate
                    ? a.createdAt.toDate().toLocaleDateString()
                    : new Date(a.createdAt).toLocaleDateString()}
                </td>
                <td>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>User Management</h2>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
