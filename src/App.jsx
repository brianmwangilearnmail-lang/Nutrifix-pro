import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Trash2, PlusCircle, User, LogOut, Package, Loader2, Download } from 'lucide-react';
import { supabase } from './supabaseClient';
import { jsPDF } from 'jspdf';

const App = () => {
  // ROLE STATE
  const [userRole, setUserRole] = useState(() => localStorage.getItem('nutrifix_role'));
  const [loginForm, setLoginForm] = useState({ name: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // PRODUCT STATE
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentBrand, setCurrentBrand] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // IMAGE CACHE (Local cache for performance, but source is Supabase image_url)
  const [images, setImages] = useState({});

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

  // FETCH PRODUCTS ON MOUNT
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

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
  const uploadToStorage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleImageUpload = async (id, e) => {
    if (userRole !== 'admin') return;
    const file = e.target.files[0];
    if (!file) return;

    try {
      const publicUrl = await uploadToStorage(file);
      
      const { error } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', id);

      if (error) throw error;
      fetchProducts(); // Refresh
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload image. Please check your Supabase Storage settings.');
    }
  };

  const handleDeleteProduct = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
    } else {
      fetchProducts();
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    try {
      let finalImageUrl = null;
      if (newProduct.tempImageFile) {
        finalImageUrl = await uploadToStorage(newProduct.tempImageFile);
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{
          id: Date.now(), // Unique ID
          brand: newProduct.brand,
          name: newProduct.name,
          category: newProduct.category,
          composition: newProduct.composition,
          details: newProduct.details,
          image_url: finalImageUrl
        }]);

      if (error) throw error;
      
      fetchProducts();
      setShowAddModal(false);
      setNewProduct({
        brand: 'nf',
        name: '',
        category: '',
        composition: '',
        tempImageFile: null,
        tempImageUrl: null,
        details: {
          "Overview & Key Benefits": "",
          "How It Works": "",
          "Indications": "",
          "Precautions": "",
          "Dosage": "",
          "Interactions": "",
          "Duration of Use": "",
          "Other Therapies": "",
          "Best Time To Take": ""
        }
      });
    } catch (err) {
      console.error('Add product failed:', err);
      alert('Failed to add product to the cloud.');
    }
  };
  // PDF GENERATION
  const fetchImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Max width for PDF images to save memory
          const MAX_WIDTH = 800;
          const scale = MAX_WIDTH / img.width;
          const width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
          const height = img.width > MAX_WIDTH ? img.height * scale : img.height;
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% JPEG
        };
        img.src = URL.createObjectURL(blob);
      });
    } catch (e) {
      console.error("Failed to load image for PDF:", e);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    if (products.length === 0) return;
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Load static logo once
      const nutrifixLogo = await fetchImageAsBase64('/nutrifix-logo.png');

      // --- COVER PAGE ---
      doc.setFillColor(15, 23, 42); // Deep Navy/Slate
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont(undefined, 'bold');
      doc.text("PRODUCT CATALOGUE", 105, 150, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'normal');
      const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(date, 105, 175, { align: 'center' });
      
      // --- PRODUCT PAGES ---
      for (const product of products) {
        doc.addPage();
        
        // --- 0. GEOMETRIC FOUNDATION (SPLIT COLUMNS) ---
        // Right Column (Black Sidebar)
        doc.setFillColor(0, 0, 0);
        doc.rect(140, 0, 70, 297, 'F');
        
        // --- 1. TOP HEADER (Nutrifix Logo) ---
        if (nutrifixLogo) {
          doc.addImage(nutrifixLogo, 'PNG', 15, 10, 35, 14); // Scaled for top left
        }

        // --- 2. PRODUCT MAIN HEADER (WITH WRAP) ---
        doc.setTextColor(15, 23, 42); // Black
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        const nameLines = doc.splitTextToSize(product.name.toUpperCase(), 115);
        doc.text(nameLines, 15, 45);
        
        const headerBottom = 45 + (nameLines.length * 8);

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(product.category.toUpperCase(), 15, headerBottom + 2);

        // --- 2. HERO IMAGE (In Black Sidebar) ---
        if (product.image_url) {
          const imgData = await fetchImageAsBase64(product.image_url);
          if (imgData) {
             // Position in the center of the black column
             doc.addImage(imgData, 'JPEG', 147.5, 40, 55, 55, undefined, 'FAST');
          }
        }

        let contentY = 75;

        // --- 4. CLINICAL DATA SECTIONS (LEFT COLUMN) ---
        const drawSplitSectionHeader = (title, y) => {
          // Red Square Bullet
          doc.setFillColor(234, 84, 85); // Red (#EA5455)
          doc.rect(15, y - 4, 6, 4, 'F'); 
          
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text(title.toUpperCase(), 25, y);
          
          // Red Horizontal Underline
          doc.setDrawColor(234, 84, 85);
          doc.setLineWidth(0.5);
          doc.line(15, y + 2, 130, y + 2); // Stays in the white section
        };

        // Render all available details with auto-pagination logic
        Object.entries(product.details).forEach(([key, value]) => {
          if (!value) return; 

          // Pagination check
          if (contentY > 250) {
            doc.addPage();
            // Re-draw background on new page
            doc.setFillColor(0, 0, 0);
            doc.rect(140, 0, 70, 297, 'F');
            contentY = 30;
          }

          drawSplitSectionHeader(key, contentY);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(11); // Slightly larger for better readability
          
          const lines = doc.splitTextToSize(value, 115); // Width restricted to white area
          doc.text(lines, 15, contentY + 12);
          
          contentY += (lines.length * 6) + 22;
        });

        // Technical Composition (The last section usually)
        if (product.composition) {
          if (contentY > 250) {
              doc.addPage();
              doc.setFillColor(0, 0, 0);
              doc.rect(140, 0, 70, 297, 'F');
              contentY = 30;
          }
          drawSplitSectionHeader("Active Reagents", contentY);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(11);
          const compLines = doc.splitTextToSize(product.composition, 115);
          doc.text(compLines, 15, contentY + 12);
        }

        // --- 5. FOOTER (CLEAN & MINIMAL) ---
        doc.setTextColor(156, 163, 175);
        doc.setFontSize(10);
        doc.text(`REFERENCE PG. ${doc.internal.getNumberOfPages()}`, 15, 285);
      }

      doc.save(`Nutrifix_Professional_Catalogue_${new Date().getFullYear()}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
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
        <button 
          className={`download-btn ${isGeneratingPDF ? 'loading' : ''}`} 
          onClick={handleDownloadPDF} 
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          {isGeneratingPDF ? 'Generating...' : 'Download Catalogue'}
        </button>
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
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
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
                  {selectedProduct.image_url ? (
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                        const url = URL.createObjectURL(file);
                        setNewProduct({...newProduct, tempImageFile: file, tempImageUrl: url});
                      }
                    }} />
                  </label>
                  {newProduct.tempImageUrl && <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Image Selected ✅</span>}
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
