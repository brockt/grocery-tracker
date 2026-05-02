import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import { toast } from 'react-toastify';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#e74c3c', '#2ecc71', '#9b59b6'];

function Reports({ token }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [storeComparison, setStoreComparison] = useState([]);
  const [monthlySpending, setMonthlySpending] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchAllReports();
  }, []);

  useEffect(() => {
    fetchPriceHistory();
  }, [selectedItemId]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/reports/items');
      setItems(response.data.items);
    } catch (error) {
      toast.error('Failed to fetch items');
    }
  };

  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      const params = selectedItemId ? { item_id: selectedItemId } : {};
      const response = await api.get('/api/reports/price-history', { params });
      setPriceHistory(response.data);
    } catch (error) {
      toast.error('Failed to fetch price history');
    }
    setLoading(false);
  };

  const fetchAllReports = async () => {
    try {
      const [storeResp, monthlyResp] = await Promise.all([
        api.get('/api/reports/store-comparison'),
        api.get('/api/reports/monthly-spending')
      ]);
      setStoreComparison(storeResp.data);
      setMonthlySpending(monthlyResp.data);
    } catch (error) {
      toast.error('Failed to fetch reports');
    }
  };

  // Determine if this item is typically sold by weight or discrete
  const isWeightBased = () => {
    if (priceHistory.length === 0) return false;
    // Check the majority of purchases
    const weightCount = priceHistory.filter(p => p.pricing_type === 'weight').length;
    return weightCount > priceHistory.length / 2;
  };

  // Process price history into separate series per store
  const processStoreSeriesData = () => {
    if (!selectedItemId || priceHistory.length === 0) return { data: [], stores: [] };
    
    const uniqueStores = [...new Set(priceHistory.map(p => p.store))].sort();
    const allDates = [...new Set(priceHistory.map(p => p.date))].sort();
    
    // For weight-based items, compare unit_price; for discrete items, compare the actual price
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

  return (
    <div className="reports">
      <h2>Price Tracking Reports</h2>

      {/* Item Price History with Store Comparison */}
      <div className="report-section">
        <h3>Price History - Compare Stores</h3>
        <div className="filter-group">
          <label>Select Item:</label>
          <select 
            value={selectedItemId} 
            onChange={handleItemChange}
          >
            <option value="">-- Choose an item to compare stores --</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        
        {loading ? (
          <div className="loading">Loading...</div>
        ) : selectedItemId ? (
          <>
            {storeSeriesData.stores.length > 0 ? (
              <div>
                <p className="chart-description">
                  {weightBased ? (
                    <>Showing <strong>unit price ({storeSeriesData.priceField === 'unit_price' ? 'per ' + (priceHistory[0]?.measurement || 'unit') : ''})</strong> for <strong>{selectedItemName}</strong> across stores. This item is typically sold by weight/volume.</>
                  ) : (
                    <>Showing <strong>package price ($)</strong> for <strong>{selectedItemName}</strong> across stores. Each colored line represents a different store. Compare at the package level since sizes may vary.</>
                  )}
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={storeSeriesData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: weightBased ? `Unit Price ($/${priceHistory[0]?.measurement || 'unit'})` : 'Package Price ($)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { fontSize: 12 } 
                      }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [`$${parseFloat(value).toFixed(2)}`, name]}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend 
                      verticalAlign="top"
                      height={36}
                    />
                    {storeSeriesData.stores.map((store, index) => (
                      <Line
                        key={store}
                        type="monotone"
                        dataKey={store}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 5, strokeWidth: 2 }}
                        activeDot={{ r: 7 }}
                        connectNulls={false}
                        name={store}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                {/* Detailed price summary table */}
                <div style={{ marginTop: '1.5rem' }}>
                  <h4>Detailed Price Summary by Store</h4>
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Store</th>
                          <th>Date</th>
                          <th>Size</th>
                          <th>Qty</th>
                          <th>Package Price</th>
                          {weightBased && <th>Unit Price</th>}
                          <th>On Sale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((purchase, idx) => (
                          <tr key={idx}>
                            <td><strong>{purchase.store}</strong></td>
                            <td>{purchase.date}</td>
                            <td>{purchase.size} {purchase.measurement}</td>
                            <td>{purchase.quantity}</td>
                            <td>${purchase.price.toFixed(2)}</td>
                            {weightBased && (
                              <td>${purchase.unit_price.toFixed(4)}/{purchase.measurement}</td>
                            )}
                            <td>{purchase.on_sale ? '🏷️ Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary stats */}
                <div style={{ marginTop: '1.5rem' }}>
                  <h4>Store Summary</h4>
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Store</th>
                          <th>Avg Package Price</th>
                          {weightBased && <th>Avg Unit Price</th>}
                          <th>Best Price</th>
                          <th>Times Purchased</th>
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
                              <td><strong>{store}</strong></td>
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
                </div>
              </div>
            ) : (
              <div className="loading">No purchase history for this item yet. Add some purchases to see comparisons.</div>
            )}
          </>
        ) : (
          <div className="loading">Select an item above to see price comparison across stores.</div>
        )}
      </div>

      {/* All Items Price History */}
      <div className="report-section">
        <h3>All Items Price History</h3>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : priceHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={priceHistory.map(p => ({ ...p }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value, name) => [`$${parseFloat(value).toFixed(4)}`, 'Unit Price']}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="unit_price" 
                stroke="#8884d8" 
                name="Unit Price ($)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="loading">No purchase data available.</div>
        )}
      </div>

      {/* Store Comparison and Monthly Spending */}
      <div className="report-grid">
        <div className="report-section">
          <h3>Average Price by Store</h3>
          {storeComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storeComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="store" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg_price" fill="#82ca9d" name="Avg Unit Price ($)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="loading">No data available.</div>
          )}
        </div>

        <div className="report-section">
          <h3>Monthly Spending</h3>
          {monthlySpending.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlySpending.map(m => ({...m, month: formatMonthYear(m)}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Total Spent']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#ff7300" 
                  name="Total Spent ($)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#ff7300' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="loading">No data available.</div>
          )}
        </div>
      </div>

      {/* Shopping Distribution */}
      <div className="report-section">
        <h3>Shopping Distribution by Store</h3>
        {storeComparison.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={storeComparison}
                dataKey="purchase_count"
                nameKey="store"
                cx="50%"
                cy="50%"
                outerRadius={140}
                label={({ store, purchase_count }) => `${store} (${purchase_count})`}
              >
                {storeComparison.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="loading">No data available.</div>
        )}
      </div>
    </div>
  );
}

export default Reports;
