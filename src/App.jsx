import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import './App.css';

// REPLACE THIS WITH YOUR NEW REMIX CONTRACT ADDRESS
const CONTRACT_ADDRESS = "0xABbb7d2661b955670bd9f19a4b4df17432aC3da9";

const CONTRACT_ABI = [
  "function productCount() view returns (uint256)",
  "function products(uint256) view returns (uint256 id, string name, uint256 priceInWei, bool isSold, address buyer)",
  "function addProduct(string _name, uint256 _priceInWei) external",
  "function buyProduct(uint256 _id) external payable",
  "event ProductPurchased(uint256 indexed id, string name, uint256 price, address indexed buyer)"
];

function App() {
  const [account, setAccount] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // New Product Form
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProducts = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const count = await contract.productCount();
      
      let items = [];
      for (let i = 1; i <= Number(count); i++) {
        const item = await contract.products(i);
        items.push({
          id: Number(item.id),
          name: item.name,
          price: ethers.formatEther(item.priceInWei),
          priceInWei: item.priceInWei,
          isSold: item.isSold,
          buyer: item.buyer
        });
      }
      setProducts(items);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      if (!ignore) {
        await loadProducts();
      }
    };
    fetchData();
    return () => {
      ignore = true;
    };
  }, [account, loadProducts]);

  // Transaction 1: Add a Product to Store
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newTitle || !newPrice) return;
    try {
      setLoading(true);
      setStatus("Listing product on blockchain...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const priceWei = ethers.parseEther(newPrice);
      const tx = await contract.addProduct(newTitle, priceWei);
      await tx.wait();

      setStatus("✅ Product listed successfully!");
      setNewTitle("");
      setNewPrice("");
      loadProducts();
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to list product.");
    } finally {
      setLoading(false);
    }
  };

  // Transaction 2: Buy Product with ETH
  const handleBuyProduct = async (id, priceInWei) => {
    try {
      setLoading(true);
      setStatus(`Processing payment for Item #${id}...`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.buyProduct(id, { value: priceInWei });
      await tx.wait();

      setStatus(`🎉 Item #${id} purchased successfully!`);
      loadProducts();
    } catch (err) {
      console.error(err);
      setStatus("❌ Purchase failed or rejected.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>🛒 Cryptify</h1>
        {account ? (
          <button style={{ padding: '0.5rem 1rem' }}>Connected: {account.slice(0, 6)}...{account.slice(-4)}</button>
        ) : (
          <button onClick={connectWallet} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Connect Wallet</button>
        )}
      </header>

      {status && <p style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '5px' }}>{status}</p>}

      <section style={{ marginBottom: '3rem' }}>
        <h2>List New Item (Store Owner)</h2>
        <form onSubmit={handleAddProduct} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Item Name (e.g., Mechanical Keyboard)" 
            value={newTitle} 
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ padding: '0.5rem', flex: 1 }}
          />
          <input 
            type="number" 
            step="0.0001"
            placeholder="Price in ETH (e.g., 0.001)" 
            value={newPrice} 
            onChange={(e) => setNewPrice(e.target.value)}
            style={{ padding: '0.5rem', width: '150px' }}
          />
          <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem' }}>List Item</button>
        </form>
      </section>

      <section>
        <h2>Store Catalog</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {products.map((item) => (
            <div key={item.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem' }}>
              <h3>{item.name}</h3>
              <p><strong>Price:</strong> {item.price} ETH</p>
              <p><strong>Status:</strong> {item.isSold ? "🔴 Sold Out" : "🟢 Available"}</p>
              {item.isSold ? (
                <small>Purchased by: {item.buyer.slice(0,6)}...</small>
              ) : (
                <button 
                  onClick={() => handleBuyProduct(item.id, item.priceInWei)} 
                  disabled={loading || !account}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', cursor: 'pointer' }}
                >
                  Buy with Crypto
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;