import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import { toast } from 'react-toastify';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#e74c3c', '#2ecc71', '#9b59b6'];

function Reports({ token }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [storeComparison, setStoreComparison] = useState([]);
  const [monthlySpending, setMonthlySpending] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchAllReports();
  }, []);

  useEffect(() => {
    fetchPriceHistory();
  }, [selectedItemId, selectedCategory]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/reports/items');
      setItems(response.data.items);
    } catch (error) {
      toast.error('Failed to fetch items');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedItemId) params.item_id = selectedItemId;
      if (selectedCategory) params.category = selectedCategory;
      const response = await api.get('/api/reports/price-history', { params });
      setPriceHistory(response.data);
    } catch (error) {
      toast.error('Failed to fetch price history');
    }
    setLoading(false);
  };

  const fetchAllReports = async () => {
    try {
      const [storeResp, monthlyResp, categoryResp] = await Promise.all([
        api.get('/api/reports/store-comparison'),
        api.get('/api/reports/monthly-spending'),
        api.get('/api/reports/category-spending')
      ]);
      setStoreComparison(storeResp.data);
      setMonthlySpending(monthlyResp.data);
      setCategorySpending(categoryResp.data);
    } catch (error) {
      toast.error('Failed to fetch reports');
    }
  };

  const isWeightBased = () => {
    if (priceHistory.length === 0) return false;
    const weightCount = priceHistory.filter(p => p.pricing_type === 'weight').length;
    return weightCount > priceHistory.length / 2;
  };

  const processStoreSeriesData = () => {
    if (!selectedItemId || priceHistory.length === 0) return { data: [], stores: [] };
    const uniqueStores = [...new Set(priceHistory.map(p => p.store))].sort();
    const allDates = [...new Set(priceHistory.map(p => p.date))].sort();
    const priceField = isWeightBased() ? 'unit_price' : 'price';
    const chartData = allDates.map(date => {
      const point = { date };
      uniqueStores.forEach(store => {
        const purchase = priceHistory.find(p => p.date === date && p.store === store);
        point[store] = purchase ? purchase[priceField] : null;
      });
      return point;
    });
    return { data: chartData, stores: uniqueStores, priceField };
  };

  const formatMonthYear = (item) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[item.month - 1]} ${item.year}`;
  };

  const getItemName = (id) => {
    const item = items.find(i => i.id === parseInt(id));
    return item ? item.name : '';
  };

  const handleItemChange = (e) => {
    const id = e.target.value;
    setSelectedItemId(id);
    setSelectedItemName(getItemName(id));
  };

  const storeSeriesData = processStoreSeriesData();
  const weightBased = isWeightBased();

  // Dynamically choose decimal places based on typical values in the data
  const getDecimalPlaces = (data, dataKey) => {
    if (!data || data.length === 0) return 2;
    // Get all non-null values
    const values = data.map(d => d[dataKey]).filter(v => v != null);
    if (values.length === 0) return 2;
    const maxVal = Math.max(...values.map(Math.abs));
    if (maxVal < 0.01) return 4;
    if (maxVal < 1) return 3;
    return 2;
  };

  const yAxisDecimals = getDecimalPlaces(priceHistory, 'unit_price');
  const storeDecimals = selectedItemId ? getDecimalPlaces(storeSeriesData.data.flatMap(d => storeSeriesData.stores.map(s => d[s])).filter(v => v != null), null) : 2;

  return (
    <div>
      <h2>📊 Price Tracking Reports</h2>

      {/* Item Price History with Store Comparison */}
      <div className="report-section">
        <h3>📈 Price History - Compare Stores</h3>
        <div className="filter-group">
          <label>Select Item:</label>
          <select onChange={handleItemChange} value={selectedItemId}>
            <option value="">-- Choose an item --</option>
            {items.map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}
          </select>
          <label>Filter by Category:</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : selectedItemId ? (
          <>
            {storeSeriesData.stores.length > 0 ? (
              <div className="chart-container">
                {weightBased ? (
                  <p className="chart-description">Showing unit price (per {priceHistory[0]?.measurement || 'unit'}) for {selectedItemName} across stores.</p>
                ) : (
                  <p className="chart-description">Showing package price ($) for {selectedItemName} across stores.</p>
                )}
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={storeSeriesData.data} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(storeDecimals)}`} width={60} />
                    <Tooltip formatter={(value, name) => [`$${parseFloat(value).toFixed(storeDecimals)}`, name]} labelStyle={{ fontWeight: 'bold' }} />
                    <Legend />
                    {storeSeriesData.stores.map((store, index) => (
                      <Line key={store} type="monotone" dataKey={store} stroke={COLORS[index % COLORS.length]} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                <h4>Detailed Price Summary by Store</h4>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Store</th><th>Date</th><th>Size</th><th>Qty</th><th>Package Price</th>
                      {weightBased && <th>Unit Price</th>}<th>On Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.sort((a, b) => b.date.localeCompare(a.date)).map((purchase, idx) => (
                      <tr key={idx}>
                        <td>{purchase.store}</td>
                        <td>{purchase.date}</td>
                        <td>{purchase.size} {purchase.measurement}</td>
                        <td>{purchase.quantity}</td>
                        <td>${purchase.price.toFixed(2)}</td>
                        {weightBased && <td>${purchase.unit_price.toFixed(4)}/{purchase.measurement}</td>}
                        <td>{purchase.on_sale ? '🏷️ Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4>Store Summary</h4>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Store</th><th>Avg Package Price</th>{weightBased && <th>Avg Unit Price</th>}<th>Best Price</th><th>Times Purchased</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeSeriesData.stores.map(store => {
                      const storePurchases = priceHistory.filter(p => p.store === store);
                      const prices = storePurchases.map(p => p.price);
                      const unitPrices = storePurchases.map(p => p.unit_price);
                      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                      const avgUnitPrice = unitPrices.length > 0 ? unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length : 0;
                      const bestPrice = Math.min(...prices);
                      return (
                        <tr key={store}>
                          <td>{store}</td>
                          <td>${avgPrice.toFixed(2)}</td>
                          {weightBased && <td>${avgUnitPrice.toFixed(4)}/{storePurchases[0]?.measurement}</td>}
                          <td>${bestPrice.toFixed(2)}</td>
                          <td>{storePurchases.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No purchase history for this item yet.</p>
            )}
          </>
        ) : selectedCategory ? (
          <p>Select an item above to see price comparison across stores, or choose a category to see all history.</p>
        ) : (
          <p>Select an item above to see price comparison across stores.</p>
        )}
      </div>

      {/* All Items Price History */}
      <div className="report-section">
        <h3>📋 All Items Price History</h3>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : priceHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceHistory.map(p => ({ ...p }))} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value.toFixed(yAxisDecimals)}`} width={60} />
              <Tooltip formatter={(value, name) => [`$${parseFloat(value).toFixed(yAxisDecimals)}`, 'Unit Price']} labelStyle={{ fontWeight: 'bold' }} />
              <Legend />
              <Line type="monotone" dataKey="unit_price" stroke="#8884d8" name="Unit Price" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No purchase data available.</p>
        )}
      </div>

      {/* Category Spending */}
      <div className="report-section">
        <h3>🏷️ Spending by Category</h3>
        {categorySpending.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categorySpending} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ category, total }) => `${category} ($${total.toFixed(2)})`}>
                {categorySpending.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Total']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p>No data available.</p>
        )}
      </div>

      {/* Store Comparison and Monthly Spending */}
      <div className="report-section">
        <h3>🏬 Average Price by Store</h3>
        {storeComparison.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={storeComparison} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="store" />
              <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} width={60} />
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Avg Unit Price']} />
              <Bar dataKey="avg_price" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>No data available.</p>
        )}
      </div>

      <div className="report-section">
        <h3>📅 Monthly Spending</h3>
        {monthlySpending.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlySpending.map(m => ({...m, month: formatMonthYear(m)}))} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} width={60} />
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Total Spent']} />
              <Bar dataKey="total" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>No data available.</p>
        )}
      </div>

      {/* Shopping Distribution */}
      <div className="report-section">
        <h3>🛒 Shopping Distribution by Store</h3>
        {storeComparison.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={storeComparison} dataKey="purchase_count" nameKey="store" cx="50%" cy="50%" outerRadius={100} label={({ store, purchase_count }) => `${store} (${purchase_count})`}>
                {storeComparison.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Purchases']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p>No data available.</p>
        )}
      </div>
    </div>
  );
}

export default Reports;
