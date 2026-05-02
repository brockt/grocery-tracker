import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function PurchaseEntry() {
  const [purchases, setPurchases] = useState([]);
  const [options, setOptions] = useState({
    packaging: [],
    measurements: [],
    stores: [],
    items: []
  });
  const [editingId, setEditingId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [form, setForm] = useState({
    purchase_date: new Date(),
    store_id: '',
    item_id: '',
    packaging_id: '',
    measurement_id: '',
    pricing_type: 'unit',
    size: '',
    quantity: '1',
    price: '',
    unit_price: '',
    on_sale: false
  });

  useEffect(() => {
    fetchPurchases();
    fetchOptions();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await api.get('/api/purchases');
      setPurchases(response.data);
    } catch (error) {
      toast.error('Failed to fetch purchases');
    }
  };

  const fetchOptions = async () => {
    try {
      const response = await api.get('/api/data/options');
      setOptions(response.data);
    } catch (error) {
      toast.error('Failed to fetch options');
    }
  };

  const calculateTotalAndUnitPrice = () => {
    const price = parseFloat(form.price) || 0;
    const quantity = parseFloat(form.quantity) || 0;
    const size = parseFloat(form.size) || 0;
    
    if (form.pricing_type === 'weight') {
      const total = size * quantity * price;
      return { total: total.toFixed(2), unit_price: price.toFixed(4) };
    } else {
      const totalSize = quantity * size;
      const unitPrice = totalSize > 0 ? (price / totalSize) : 0;
      return { total: price.toFixed(2), unit_price: unitPrice.toFixed(4) };
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: newValue }));
  };

  useEffect(() => {
    const { total, unit_price } = calculateTotalAndUnitPrice();
    setForm(prev => ({
      ...prev,
      total: total,
      unit_price: unit_price
    }));
  }, [form.price, form.quantity, form.size, form.pricing_type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { total, unit_price } = calculateTotalAndUnitPrice();
      
      const data = {
        ...form,
        purchase_date: form.purchase_date.toISOString().split('T')[0],
        store_id: parseInt(form.store_id),
        item_id: parseInt(form.item_id),
        packaging_id: parseInt(form.packaging_id),
        measurement_id: parseInt(form.measurement_id),
        size: parseFloat(form.size),
        quantity: parseFloat(form.quantity),
        price: parseFloat(total),
        unit_price: parseFloat(unit_price)
      };

      if (editingId) {
        await api.put(`/api/purchases/${editingId}`, data);
        toast.success('Purchase updated!');
      } else {
        await api.post('/api/purchases', data);
        toast.success('Purchase added!');
      }
      resetForm();
      fetchPurchases();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (purchase) => {
    setEditingId(purchase.id);
    const displayPrice = purchase.pricing_type === 'weight' ? purchase.unit_price : purchase.price;
    setForm({
      purchase_date: new Date(purchase.purchase_date),
      store_id: purchase.store_id,
      item_id: purchase.item_id,
      packaging_id: purchase.packaging_id,
      measurement_id: purchase.measurement_id,
      pricing_type: purchase.pricing_type || 'unit',
      size: purchase.size,
      quantity: purchase.quantity,
      price: displayPrice,
      unit_price: purchase.unit_price,
      on_sale: purchase.on_sale
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this purchase?')) {
      try {
        await api.delete(`/api/purchases/${id}`);
        toast.success('Purchase deleted');
        if (editingId === id) resetForm();
        fetchPurchases();
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCategoryFilter('');
    setForm({
      purchase_date: new Date(),
      store_id: '',
      item_id: '',
      packaging_id: '',
      measurement_id: '',
      pricing_type: 'unit',
      size: '',
      quantity: '1',
      price: '',
      unit_price: '',
      on_sale: false
    });
  };

  const getPriceLabel = () => {
    if (form.pricing_type === 'weight') {
      const m = options.measurements.find(m => m.id === parseInt(form.measurement_id));
      return m ? `Price per ${m.unit} ($)` : 'Price per unit ($)';
    }
    return 'Total Price ($)';
  };

  const { total: calculatedTotal } = calculateTotalAndUnitPrice();

  // Group items by category, respecting category filter
  const filteredItems = categoryFilter
    ? options.items.filter(i => (i.category || '') === categoryFilter)
    : options.items;

  const groupedItems = filteredItems.reduce((groups, item) => {
    const cat = item.category || 'Uncategorized';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
    return groups;
  }, {});

  const sortedCategories = Object.keys(groupedItems).sort();

  // All distinct categories for the filter dropdown
  const allCategories = [...new Set(options.items.map(i => i.category || 'Uncategorized'))].sort();

  return (
    <div className="purchase-entry">
      <div className="entry-form">
        <h2>{editingId ? '✏️ Edit Purchase' : '🛒 New Purchase'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <DatePicker selected={form.purchase_date} onChange={(date) => setForm({...form, purchase_date: date})} dateFormat="yyyy-MM-dd" className="form-control" />
            </div>
            <div className="form-group">
              <label>Store</label>
              <select name="store_id" value={form.store_id} onChange={handleChange} required>
                <option value="">Select</option>
                {options.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setForm(prev => ({ ...prev, item_id: '' })); }}>
                <option value="">All</option>
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Item</label>
              <select name="item_id" value={form.item_id} onChange={handleChange} required>
                <option value="">Select</option>
                {sortedCategories.map(cat => (
                  <optgroup key={cat} label={cat}>
                    {groupedItems[cat].map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Packaging</label>
              <select name="packaging_id" value={form.packaging_id} onChange={handleChange} required>
                <option value="">Select</option>
                {options.packaging.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Pricing Type</label>
              <select name="pricing_type" value={form.pricing_type} onChange={handleChange}>
                <option value="unit">Per Package</option>
                <option value="weight">By Weight/Volume</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{form.pricing_type === 'weight' ? 'Weight/Vol' : 'Size'}</label>
              <input type="number" name="size" value={form.size} onChange={handleChange} required step="0.001" min="0" />
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required step="1" min="1" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Unit</label>
              <select name="measurement_id" value={form.measurement_id} onChange={handleChange} required>
                <option value="">Select</option>
                {options.measurements.map(m => <option key={m.id} value={m.id}>{m.unit}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{getPriceLabel()}</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} required step="0.01" min="0" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Total ($)</label>
              <input type="text" value={calculatedTotal} readOnly />
            </div>
            <div className="form-group checkbox-group">
              <label><input type="checkbox" name="on_sale" checked={form.on_sale} onChange={handleChange} /> On Sale 🏷️</label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add'} Purchase</button>
            {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="purchases-list">
        <h2>Recent Purchases</h2>
        {purchases.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>No purchases yet.</p>
        ) : (
          purchases.map(purchase => (
            <div key={purchase.id} className={`purchase-card ${editingId === purchase.id ? 'highlighted' : ''}`}>
              <div className="purchase-card-header">
                <span className="purchase-date">{purchase.purchase_date}</span>
                <span className="purchase-store">{purchase.store}</span>
                {purchase.on_sale && <span className="purchase-sale-badge">SALE</span>}
                <div className="purchase-actions">
                  <button className="btn-small btn-edit" onClick={() => handleEdit(purchase)}>Edit</button>
                  <button className="btn-small btn-delete" onClick={() => handleDelete(purchase.id)}>Delete</button>
                </div>
              </div>
              <div className="purchase-card-body">
                <div className="purchase-detail">
                  <strong>{purchase.item_name}</strong> — {purchase.packaging}
                </div>
                <div className="purchase-detail">
                  {purchase.size} {purchase.measurement} × {purchase.quantity} = ${purchase.price?.toFixed(2)}
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    (${purchase.unit_price?.toFixed(4)}/{purchase.measurement})
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PurchaseEntry;
