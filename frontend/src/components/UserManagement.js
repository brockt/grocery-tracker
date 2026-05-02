import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import { toast } from 'react-toastify';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    is_admin: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (!data.password) delete data.password;

      if (editingUser) {
        await api.put(`/api/admin/users/${editingUser.id}`, data);
        toast.success('User updated successfully');
      } else {
        await api.post('/api/auth/register', data);
        toast.success('User created successfully');
      }
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', is_admin: user.is_admin });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/api/admin/users/${id}`);
        toast.success('User deleted');
        fetchUsers();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', is_admin: false });
  };

  return (
    <div className="user-management">
      <div className="user-form">
        <h2>{editingUser ? 'Edit User' : 'Create User'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Password {editingUser && '(leave blank)'}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required={!editingUser} />
          </div>
          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={form.is_admin} onChange={(e) => setForm({...form, is_admin: e.target.checked})} />
              Admin User
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingUser ? 'Update' : 'Create'} User</button>
            {editingUser && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="users-list">
        <h2>Users</h2>
        <div className="table-responsive">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td><td>{user.name}</td><td>{user.email}</td>
                  <td>{user.is_admin ? 'Admin' : 'User'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-small btn-edit" onClick={() => handleEdit(user)}>Edit</button>
                    <button className="btn-small btn-delete" onClick={() => handleDelete(user.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
