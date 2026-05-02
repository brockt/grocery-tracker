import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import { toast } from 'react-toastify';

function AdminOptions() {
  const [activeTab, setActiveTab] = useState('stores');
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packaging, setPackaging] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchAll();
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/admin/categories');
      setCategories(response.data);
    } catch (error) {
      // Silently fail - categories may not be critical for all views
    }
  };

  const fetchAll = () => {
    switch(activeTab) {
      case 'stores':
        fetchStores();
        break;
      case 'items':
        fetchItems();
        break;
      case 'categories':
        fetchCategories();
        break;
      case 'packaging':
        fetchPackaging();
        break;
      case 'measurements':
        fetchMeasurements();
        break;
    }
  };

  const fetchStores = async () => {
    try {
      const response = await api.get('/api/admin/stores');
      setStores(response.data);
    } catch (error) {
      toast.error('Failed to fetch stores');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/admin/items');
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch items');
    }
  };

  const fetchPackaging = async () => {
    try {
      const response = await api.get('/api/admin/packaging');
      setPackaging(response.data);
    } catch (error) {
      toast.error('Failed to fetch packaging');
    }
  };

  const fetchMeasurements = async () => {
    try {
      const response = await api.get('/api/admin/measurements');
      setMeasurements(response.data);
    } catch (error) {
      toast.error('Failed to fetch measurements');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const endpoint = `/api/admin/${activeTab}`;
      let data;
      
      if (activeTab === 'items') {
        data = { 
          name: newName, 
          category_id: newCategoryId || null,
          category: newCategory || ''
        };
      } else if (activeTab === 'measurements') {
        data = { unit: newName };
      } else {
        data = { name: newName };
      }

      await api.post(endpoint, data);
      toast.success(`${activeTab.slice(0, -1)} added successfully`);
      setNewName('');
      setNewCategory('');
      setNewCategoryId('');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add');
    }
  };

  const handleEdit = async (id) => {
    try {
      const endpoint = `/api/admin/${activeTab}/${id}`;
      let data;
      
      if (activeTab === 'items') {
        data = { 
          name: editName, 
          category_id: editCategoryId || null,
          category: editCategory || ''
        };
      } else if (activeTab === 'measurements') {
        data = { unit: editName };
      } else {
        data = { name: editName };
      }

      await api.put(endpoint, data);
      toast.success('Updated successfully');
      setEditingId(null);
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await api.delete(`/api/admin/${activeTab}/${id}`);
        toast.success('Deleted successfully');
        fetchAll();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name || item.unit);
    setEditCategory(item.category || '');
    setEditCategoryId(item.category_id || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCategory('');
    setEditCategoryId('');
  };

  return (
    <div className="admin-options">
      <h2>Manage Reference Data</h2>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'stores' ? 'active' : ''}`}
          onClick={() => setActiveTab('stores')}
        >
          Stores
        </button>
        <button 
          className={`tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => { setActiveTab('items'); fetchCategories(); }}
        >
          Items
        </button>
        <button 
          className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button 
          className={`tab ${activeTab === 'packaging' ? 'active' : ''}`}
          onClick={() => setActiveTab('packaging')}
        >
          Packaging
        </button>
        <button 
          className={`tab ${activeTab === 'measurements' ? 'active' : ''}`}
          onClick={() => setActiveTab('measurements')}
        >
          Measurements
        </button>
      </div>

      <div className="tab-content">
        {/* Add Form */}
        {activeTab !== 'categories' ? (
          <div className="add-form">
            <h3>Add New {activeTab.slice(0, -1)}</h3>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group">
                  <label>{activeTab === 'measurements' ? 'Unit' : 'Name'}</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    placeholder={activeTab === 'measurements' ? 'e.g., ml, L, kg' : 'Enter name'}
                    style={{ height: '44px' }}
                  />
                </div>
                {activeTab === 'items' && (
                  <div className="form-group">
                    <label>Category</label>
                    <select 
                      value={newCategoryId} 
                      onChange={(e) => {
                        setNewCategoryId(e.target.value);
                        if (e.target.value) {
                          const cat = categories.find(c => c.id === parseInt(e.target.value));
                          setNewCategory(cat ? cat.name : '');
                        } else {
                          setNewCategory('');
                        }
                      }}
                      style={{ height: '44px' }}
                    >
                      <option value="">None</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button type="submit" className="btn-primary">Add</button>
            </form>
          </div>
        ) : (
          <div className="add-form">
            <h3>Add New Category</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="e.g., Dairy, Produce, Spices"
                />
              </div>
              <button type="submit" className="btn-primary">Add</button>
            </form>
          </div>
        )}

        {/* Lists */}
        <div className="list-section">
          <h3>Existing {activeTab}</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  {activeTab === 'items' && <th>Category</th>}
                  {activeTab === 'categories' && <th>Items Using</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Stores */}
                {activeTab === 'stores' && stores.map(store => (
                  <tr key={store.id}>
                    <td>
                      {editingId === store.id ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : store.name}
                    </td>
                    <td>
                      {editingId === store.id ? (
                        <>
                          <button className="btn-small btn-edit" onClick={() => handleEdit(store.id)}>Save</button>
                          <button className="btn-small btn-delete" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-small btn-edit" onClick={() => startEdit(store)}>Edit</button>
                          <button className="btn-small btn-delete" onClick={() => handleDelete(store.id, store.name)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Items */}
                {activeTab === 'items' && items.map(item => (
                  <tr key={item.id}>
                    <td>
                      {editingId === item.id ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : item.name}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
                          <option value="">None</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (item.category || '-')}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <>
                          <button className="btn-small btn-edit" onClick={() => handleEdit(item.id)}>Save</button>
                          <button className="btn-small btn-delete" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-small btn-edit" onClick={() => startEdit(item)}>Edit</button>
                          <button className="btn-small btn-delete" onClick={() => handleDelete(item.id, item.name)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Categories */}
                {activeTab === 'categories' && categories.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      {editingId === cat.id ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : cat.name}
                    </td>
                    <td>
                      {items.filter(i => i.category_id === cat.id).length}
                    </td>
                    <td>
                      {editingId === cat.id ? (
                        <>
                          <button className="btn-small btn-edit" onClick={() => handleEdit(cat.id)}>Save</button>
                          <button className="btn-small btn-delete" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-small btn-edit" onClick={() => startEdit(cat)}>Edit</button>
                          <button className="btn-small btn-delete" onClick={() => handleDelete(cat.id, cat.name)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Packaging */}
                {activeTab === 'packaging' && packaging.map(pack => (
                  <tr key={pack.id}>
                    <td>
                      {editingId === pack.id ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : pack.name}
                    </td>
                    <td>
                      {editingId === pack.id ? (
                        <>
                          <button className="btn-small btn-edit" onClick={() => handleEdit(pack.id)}>Save</button>
                          <button className="btn-small btn-delete" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-small btn-edit" onClick={() => startEdit(pack)}>Edit</button>
                          <button className="btn-small btn-delete" onClick={() => handleDelete(pack.id, pack.name)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Measurements */}
                {activeTab === 'measurements' && measurements.map(meas => (
                  <tr key={meas.id}>
                    <td>
                      {editingId === meas.id ? (
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : meas.unit}
                    </td>
                    <td>
                      {editingId === meas.id ? (
                        <>
                          <button className="btn-small btn-edit" onClick={() => handleEdit(meas.id)}>Save</button>
                          <button className="btn-small btn-delete" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-small btn-edit" onClick={() => startEdit(meas)}>Edit</button>
                          <button className="btn-small btn-delete" onClick={() => handleDelete(meas.id, meas.unit)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminOptions;
