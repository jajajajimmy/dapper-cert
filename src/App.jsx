import { useState } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = "0x77deFFE7e6D9206B3fB96331821aE537915CFF5f";

const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function certificates(bytes32) view returns (string recipientName, string courseName, uint256 issueDate, bool isRevoked, bool exists)",
  "function issueCertificate(bytes32 certId, string recipientName, string courseName) external",
  "function revokeCertificate(bytes32 certId) external",
  "function verifyCertificate(bytes32 certId) external view returns (bool isValid, string recipientName, string courseName, uint256 issueDate)"
];

function App() {
  const [account, setAccount] = useState('');
  const [certId, setCertId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [courseName, setCourseName] = useState('');
  
  const [verifyId, setVerifyId] = useState('');
  const [certData, setCertData] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // Converts any user string reliably to bytes32 format
  const formatCertId = (id) => {
    const trimmed = id.trim();
    if (trimmed.startsWith('0x') && trimmed.length === 66) return trimmed;
    return ethers.id(trimmed);
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert('Please install MetaMask!');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!account) return alert('Please connect wallet first!');
    if (!certId || !recipientName || !courseName) return alert('Fill in all fields!');

    try {
      setLoading(true);
      setStatusMsg({ text: '1/2: Please confirm transaction in MetaMask...', type: 'info' });
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const formattedId = formatCertId(certId);
      
      // Send transaction
      const tx = await contract.issueCertificate(formattedId, recipientName, courseName);
      setStatusMsg({ text: '2/2: Mining transaction on Sepolia... Please wait.', type: 'info' });
      
      // Wait for block confirmation
      await tx.wait();
      
      setStatusMsg({ text: `✅ Certificate "${certId}" successfully issued on Sepolia!`, type: 'success' });
      setCertId('');
      setRecipientName('');
      setCourseName('');
    } catch (err) {
      console.error("Issue Error Details:", err);
      const reason = err?.reason || err?.message || 'Transaction failed or rejected';
      setStatusMsg({ text: `❌ Failed to issue: ${reason}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyId) return alert('Enter a Certificate ID to verify!');
    try {
      setLoading(true);
      setStatusMsg({ text: 'Querying Sepolia network...', type: 'info' });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const formattedId = formatCertId(verifyId);
      
      // Safe call to read contract data
      const res = await contract.verifyCertificate(formattedId);

      const isValid = res.isValid ?? res[0];
      const name = res.recipientName ?? res[1];
      const course = res.courseName ?? res[2];
      const date = res.issueDate ?? res[3];

      if (!isValid || name === "") {
        setCertData({ isValid: false });
        setStatusMsg({ text: `⚠️ Certificate "${verifyId}" not found on Sepolia. Did you issue it first?`, type: 'error' });
      } else {
        setCertData({
          isValid: true,
          recipientName: name,
          courseName: course,
          issueDate: date ? new Date(Number(date) * 1000).toLocaleString() : 'N/A'
        });
        setStatusMsg({ text: '✅ Certificate found on-chain!', type: 'success' });
      }
    } catch (err) {
      console.error("Verify Error Details:", err);
      setStatusMsg({ text: '❌ Error connecting to contract on Sepolia.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.navbar}>
        <div style={styles.brand}>🎓 <span>CertiVerify</span> DApp</div>
        <div>
          {!account ? (
            <button style={styles.connectBtn} onClick={connectWallet}>
              Connect MetaMask
            </button>
          ) : (
            <div style={styles.walletBadge}>
              <span style={styles.statusDot}></span>
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          )}
        </div>
      </header>

      <main style={styles.container}>
        {statusMsg.text && (
          <div style={{
            ...styles.alert,
            backgroundColor: statusMsg.type === 'error' ? '#fee2e2' : statusMsg.type === 'success' ? '#dcfce7' : '#e0f2fe',
            color: statusMsg.type === 'error' ? '#991b1b' : statusMsg.type === 'success' ? '#166534' : '#075985',
          }}>
            {statusMsg.text}
          </div>
        )}

        <div style={styles.grid}>
          {/* Issue Section */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Issue Certificate</h2>
            <p style={styles.cardSub}>Only smart contract owner can issue new records.</p>
            
            <form onSubmit={handleIssue} style={styles.form}>
              <div style={styles.group}>
                <label style={styles.label}>Certificate ID</label>
                <input 
                  style={styles.input}
                  placeholder="e.g. CERT-2026-001" 
                  value={certId} 
                  onChange={(e) => setCertId(e.target.value)} 
                />
              </div>

              <div style={styles.group}>
                <label style={styles.label}>Recipient Name</label>
                <input 
                  style={styles.input}
                  placeholder="e.g. John Doe" 
                  value={recipientName} 
                  onChange={(e) => setRecipientName(e.target.value)} 
                />
              </div>

              <div style={styles.group}>
                <label style={styles.label}>Course Name</label>
                <input 
                  style={styles.input}
                  placeholder="e.g. Blockchain DApp Engineering" 
                  value={courseName} 
                  onChange={(e) => setCourseName(e.target.value)} 
                />
              </div>

              <button style={styles.primaryBtn} type="submit" disabled={loading}>
                {loading ? 'Processing...' : 'Issue Certificate'}
              </button>
            </form>
          </div>

          {/* Verify Section */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Verify Certificate</h2>
            <p style={styles.cardSub}>Public lookup on Sepolia Ethereum testnet.</p>
            
            <form onSubmit={handleVerify} style={styles.form}>
              <div style={styles.group}>
                <label style={styles.label}>Certificate ID</label>
                <input 
                  style={styles.input}
                  placeholder="e.g. CERT-2026-001" 
                  value={verifyId} 
                  onChange={(e) => setVerifyId(e.target.value)} 
                />
              </div>

              <button style={styles.secondaryBtn} type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Verify On-Chain'}
              </button>
            </form>

            {certData && (
              <div style={{
                ...styles.resultCard,
                borderColor: certData.isValid ? '#22c55e' : '#ef4444'
              }}>
                <div style={styles.resultHeader}>
                  <span style={{ fontSize: '1.25rem' }}>
                    {certData.isValid ? '✅ Valid Certificate' : '❌ Invalid / Not Found'}
                  </span>
                </div>
                {certData.isValid && (
                  <div style={styles.resultDetails}>
                    <p><strong>Recipient:</strong> {certData.recipientName}</p>
                    <p><strong>Course:</strong> {certData.courseName}</p>
                    <p><strong>Issue Date:</strong> {certData.issueDate}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 2rem',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  brand: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  connectBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  walletBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#334155',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontFamily: 'monospace',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  container: {
    maxWidth: '1000px',
    margin: '2rem auto',
    padding: '0 1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '1.75rem',
    border: '1px solid #334155',
  },
  cardTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.3rem',
    color: '#f1f5f9',
  },
  cardSub: {
    margin: '0 0 1.5rem 0',
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '0.65rem 0.8rem',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  secondaryBtn: {
    backgroundColor: '#0284c7',
    color: '#fff',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  alert: {
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  resultCard: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    borderLeft: '4px solid',
  },
  resultHeader: {
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  resultDetails: {
    fontSize: '0.9rem',
    lineHeight: '1.6',
    color: '#cbd5e1',
  }
};

export default App;