import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Trash2, PlusCircle, User, LogOut, Package } from 'lucide-react';
import productsData from './data/products.json';

const App = () => {
  // ROLE STATE
  const [userRole, setUserRole] = useState(() => localStorage.getItem('nutrifix_role'));
  const [loginForm, setLoginForm] = useState({ name: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // PRODUCT STATE (Load from localStorage if exists, else use JSON)
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('nutrifix_products');
      return saved ? JSON.parse(saved) : productsData;
    } catch (e) {
      console.error("Initial Load Error (Products):", e);
      return productsData;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentBrand, setCurrentBrand] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // IMAGE STATE
  const [images, setImages] = useState(() => {
    try {
      const saved = localStorage.getItem('nutrifix_images');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Initial Load Error (Images):", e);
      return {};
    }
  });

  // NEW PRODUCT FORM STATE
  const [newProduct, setNewProduct] = useState({
    brand: 'nf',
    name: '',
    category: '',
    composition: '',
    details: {
      "Overview & Key Benefits": "",
      "How It Works": "",
      "Dosage": "",
      "Interactions": ""
    },
    tempImage: null
  });

  // PERSISTENCE (Safe wrapper)
  useEffect(() => {
    try {
      localStorage.setItem('nutrifix_products', JSON.stringify(products));
    } catch (e) {
      console.error("Storage Error: Local storage is full.", e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('nutrifix_images', JSON.stringify(images));
    } catch (e) {
      console.error("Storage Error: Images are too large for local storage.", e);
      alert("Warning: Local storage quota exceeded. This image might be too large to save permanently.");
    }
  }, [images]);

  useEffect(() => {
    if (userRole) {
      localStorage.setItem('nutrifix_role', userRole);
    } else {
      localStorage.removeItem('nutrifix_role');
    }
  }, [userRole]);

  // AUTH ACTIONS
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.name === 'Nutrifix' && loginForm.password === 'Kenya@_2020#') {
      setUserRole('admin');
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Please try again.');
    }
  };

  const handleGuestContinue = () => {
    setUserRole('guest');
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  // PRODUCT ACTIONS
  const handleImageUpload = (id, e) => {
    if (userRole !== 'admin') return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImages(prev => ({
        ...prev,
        [id]: event.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProduct = (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    // Defensive ID generation (prevents NaN)
    const validIds = products.map(p => Number(p.id)).filter(id => !isNaN(id));
    const id = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
    
    if (newProduct.tempImage) {
      const updatedImages = { ...images, [id]: newProduct.tempImage };
      setImages(updatedImages);
      localStorage.setItem('nutrifix_images', JSON.stringify(updatedImages));
    }

    const productToAdd = {
      id,
      brand: newProduct.brand,
      name: newProduct.name,
      category: newProduct.category,
      composition: newProduct.composition,
      details: newProduct.details
    };

    setProducts(prev => [...prev, productToAdd]);
    setShowAddModal(false);
    setNewProduct({
      brand: 'nf',
      name: '',
      category: '',
      composition: '',
      tempImage: null,
      details: {
        "Overview & Key Benefits": "",
        "How It Works": "",
        "Dosage": "",
        "Interactions": ""
      }
    });
  };

  // SEARCH & FILTER (Defensive)
  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const name = p.name?.toLowerCase() || '';
    const category = p.category?.toLowerCase() || '';
    const composition = p.composition?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch = name.includes(query) || 
                          category.includes(query) ||
                          composition.includes(query);
    const matchesBrand = currentBrand === 'all' || p.brand === currentBrand;
    return matchesSearch && matchesBrand;
  });

  // INITIAL LOGIN SCREEN
  if (!userRole) {
    return (
      <div className="login-screen">
        <div className="login-card glass-panel p-10 rounded-[2rem] shadow-2xl">
          <div className="mb-6">
            <h1 className="logo-text" style={{ fontSize: '2.5rem' }}>NUTRIFIX</h1>
            <p className="text-muted text-sm font-semibold tracking-widest uppercase">Select Access Type</p>
          </div>

          <form className="login-form text-left" onSubmit={handleLogin}>
            <div className="space-y-4">
              <input 
                type="text" 
                className="login-input" 
                placeholder="Admin Name"
                value={loginForm.name}
                onChange={e => setLoginForm({...loginForm, name: e.target.value})}
              />
              <input 
                type="password" 
                className="login-input" 
                placeholder="Administrative Key"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
              {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
              <button type="submit" className="login-btn">Log in as Admin</button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <button className="guest-btn" onClick={handleGuestContinue}>Continue to Site as Guest</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <div className="logo-text">NUTRIFIX</div>
          <div className={`user-status ${userRole}`}>
            <User size={14} />
            <span>{userRole} mode</span>
          </div>
        </div>
        <button className="guest-btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LogOut size={16} />
          Logout
        </button>
      </header>

      <div className="controls">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} style={{position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
          <input 
            type="text" 
            className="search-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, category or active reagent..."
          />
        </div>
        <div className="filter-group">
          {['all', 'nf', 'dh'].map(b => (
            <button 
              key={b}
              onClick={() => setCurrentBrand(b)} 
              className={`filter-btn ${currentBrand === b ? 'active' : ''}`}
            >
              {b === 'all' ? 'All' : b === 'nf' ? 'Natural Factors' : 'Doppelherz'}
            </button>
          ))}
        </div>
        {userRole === 'admin' && (
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            <PlusCircle size={18} />
            Add Product 
          </button>
        )}
      </div>

      <div className="product-grid">
        {filteredProducts.map(product => (
          <div key={product.id} className="product-card" onClick={() => setSelectedProduct(product)}>
            <span className={`brand-badge ${product.brand}`}>
              {product.brand === 'nf' ? 'Natural Factors' : 'Doppelherz'}
            </span>
            
            {userRole === 'admin' && (
              <button className="delete-btn" onClick={(e) => handleDeleteProduct(product.id, e)}>
                <Trash2 size={16} />
              </button>
            )}

            <div className="image-container">
              {images[product.id] ? (
                <img src={images[product.id]} alt={product.name} />
              ) : (
                <div className="flex flex-col items-center text-slate-300">
                   <Package size={32} strokeWidth={1} />
                   <span className="text-[10px] uppercase font-bold mt-2">No Visual</span>
                </div>
              )}
              
              {userRole === 'admin' && (
                <div className="add-image-overlay" onClick={(e) => e.stopPropagation()}>
                  <label className="plus-btn" title="Add/Change Visual">
                    <Plus size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(product.id, e)} />
                  </label>
                </div>
              )}
            </div>

            <div className="product-info">
              <span className="product-category">{product.category}</span>
              <h3 className="product-name">{product.name}</h3>
              <p className="composition line-clamp-1 italic">{product.composition}</p>
            </div>
          </div>
        ))}
      </div>

      {/* DETAIL MODAL */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="product-name" style={{fontSize: '1.8rem', color: 'var(--primary)'}}>{selectedProduct.name}</h2>
                <p className="product-category" style={{marginTop: '0.25rem'}}>{selectedProduct.composition}</p>
              </div>
              <button className="close-btn" onClick={() => setSelectedProduct(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="modal-image">
                <div className="image-container" style={{ borderRadius: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  {images[selectedProduct.id] ? (
                    <img src={images[selectedProduct.id]} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                      {userRole === 'admin' ? (
                        <label className="plus-btn mb-4">
                           <Plus size={24} />
                           <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(selectedProduct.id, e)} />
                        </label>
                      ) : <Package size={48} />}
                      <p className="text-[10px] font-bold uppercase">Scientific File Visual Missing</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-details text-left">
                {Object.entries(selectedProduct.details).map(([key, value]) => (
                  <div key={key} className="info-section">
                    <div className="info-label">{key}</div>
                    <div className="info-value">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{maxWidth: '600px'}} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="product-name">Add New Catalogue Item</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={20}/></button>
            </div>
            <form className="p-8 space-y-6" onSubmit={handleAddProduct}>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Brand</label>
                  <select className="form-select" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})}>
                    <option value="nf">Natural Factors</option>
                    <option value="dh">Doppelherz</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Category</label>
                  <input className="form-input" placeholder="e.g. Vitamins" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} required/>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Product Name</label>
                <input className="form-input" placeholder="e.g. Zinc Citrate" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required/>
              </div>
              <div className="form-field">
                <label className="form-label">Composition</label>
                <input className="form-input" placeholder="Active ingredients" value={newProduct.composition} onChange={e => setNewProduct({...newProduct, composition: e.target.value})} required/>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-slate-100">
                 {Object.keys(newProduct.details).map(detailKey => (
                    <div key={detailKey} className="form-field">
                      <label className="form-label">{detailKey}</label>
                      <textarea className="form-textarea" placeholder={`Enter ${detailKey}`} value={newProduct.details[detailKey]} onChange={e => {
                        const updated = {...newProduct.details, [detailKey]: e.target.value};
                        setNewProduct({...newProduct, details: updated});
                      }} required/>
                    </div>
                 ))}
              </div>
              <div className="form-field pt-2">
                <label className="form-label">Product Visual (Optional)</label>
                <div className="flex items-center gap-4">
                  <label className="plus-btn scale-75" title="Upload Initial Visual">
                    <Plus size={20} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                          // Temp state for the modal until save
                          setNewProduct({...newProduct, tempImage: re.target.result});
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                  {newProduct.tempImage && <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Image Selected ✅</span>}
                </div>
              </div>

              <button type="submit" className="login-btn mt-4">Save to Master Catalogue</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
