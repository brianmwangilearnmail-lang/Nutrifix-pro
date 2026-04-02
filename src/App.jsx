import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Trash2, PlusCircle, User, LogOut, Package, Loader2, Download, Edit3 } from 'lucide-react';
import { supabase } from './supabaseClient';
import { jsPDF } from 'jspdf';

const MultiCategorySelector = ({ rawValue, options, onChange, onRenameTag }) => {
  const [inputValue, setInputValue] = useState('');
  const [editingTag, setEditingTag] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const currentTags = rawValue ? rawValue.split(',').map(s => s.trim()).filter(Boolean) : [];

  const toggleTag = (tag) => {
    if (currentTags.includes(tag)) {
      onChange(currentTags.filter(t => t !== tag).join(', '));
    } else {
      onChange([...currentTags, tag].join(', '));
    }
  };

  const startEditing = (e, tag) => {
    e.stopPropagation();
    setEditingTag(tag);
    setEditValue(tag);
  };

  const handleEditKeyDown = (e, oldTag) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = editValue.trim();
      if (newTag && newTag !== oldTag) {
        if (onRenameTag) {
          onRenameTag(oldTag, newTag);
        } else {
          // Fallback if global rename isn't provided
          const updated = currentTags.map(t => t === oldTag ? newTag : t);
          onChange(updated.join(', '));
        }
      }
      setEditingTag(null);
    } else if (e.key === 'Escape') {
      setEditingTag(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !currentTags.includes(newTag)) {
        onChange([...currentTags, newTag].join(', '));
      }
      setInputValue('');
    }
  };

  const globalTags = options || [];
  const displayTags = [...new Set([...globalTags, ...currentTags])];

  return (
    <div className="category-pill-container" onClick={e => e.stopPropagation()}>
      {displayTags.map(tag => {
        const isSelected = currentTags.includes(tag);
        const isEditing = editingTag === tag;

        return (
          <span 
            key={tag}
            onClick={(e) => !isEditing && toggleTag(tag)}
            className={`category-pill ${isSelected ? 'selected' : ''}`}
          >
            {isEditing ? (
              <input 
                autoFocus
                className="inline-pill-input"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => handleEditKeyDown(e, tag)}
                onBlur={() => setEditingTag(null)}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {isSelected && <span style={{marginRight: '4px'}}>✓</span>} 
                <span className="tag-text">{tag}</span>
                <button 
                  className="edit-pill-btn" 
                  onClick={(e) => startEditing(e, tag)}
                  title="Edit tag"
                >
                  <Edit3 size={10} strokeWidth={3} />
                </button>
              </div>
            )}
          </span>
        );
      })}
      
      <input 
        className="pill-input"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ Add tag..."
      />
    </div>
  );
};

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
  const [currentCategory, setCurrentCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempProduct, setTempProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // TOAST NOTIFICATION STATE
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
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
      showToast('Failed to upload image. Please check your Supabase Storage settings.', 'error');
    }
  };

  const handleDeleteProduct = (id, e) => {
    e.stopPropagation();
    setConfirmDialog({
      message: 'Are you sure you want to delete this product?',
      onConfirm: async () => {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          console.error('Delete error:', error);
          showToast('Failed to delete product', 'error');
        } else {
          showToast('Product deleted', 'success');
          fetchProducts();
        }
      }
    });
  };

  const handleGlobalRename = async (oldTag, newTag) => {
    if (userRole !== 'admin') return;
    
    try {
      // 1. Update all products in the database
      const { data: allProducts, error: fetchError } = await supabase.from('products').select('*');
      if (fetchError) throw fetchError;

      const updates = allProducts
        .filter(p => {
          const tags = p.category ? p.category.split(',').map(s => s.trim()) : [];
          return tags.includes(oldTag);
        })
        .map(p => {
          const tags = p.category.split(',').map(s => s.trim());
          const updatedTags = tags.map(t => t === oldTag ? newTag : t);
          return {
            id: p.id,
            category: updatedTags.join(', ')
          };
        });

      if (updates.length > 0) {
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ category: update.category })
            .eq('id', update.id);
          if (updateError) throw updateError;
        }
      }

      // 2. Update local state for the currently edited product if any
      if (tempProduct) {
        const tags = tempProduct.category.split(',').map(s => s.trim());
        const updatedTags = tags.map(t => t === oldTag ? newTag : t);
        setTempProduct({ ...tempProduct, category: updatedTags.join(', ') });
      }

      showToast(`Renamed "${oldTag}" to "${newTag}" across ${updates.length} products.`, 'success');
      fetchProducts();
    } catch (err) {
      console.error('Rename failed:', err);
      showToast('Failed to rename tag globally.', 'error');
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
      showToast('Failed to add product to the cloud.', 'error');
    }
  };

  const handleUpdateProduct = async () => {
    if (!tempProduct) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: tempProduct.name,
          brand: tempProduct.brand,
          composition: tempProduct.composition,
          details: tempProduct.details
        })
        .eq('id', tempProduct.id);

      if (error) throw error;
      
      // Update local state
      setProducts(prev => prev.map(p => p.id === tempProduct.id ? tempProduct : p));
      setSelectedProduct(tempProduct);
      setIsEditing(false);
      showToast('Product updated successfully!', 'success');
    } catch (err) {
      console.error('Update failed:', err);
      showToast('Failed to sync changes to the cloud.', 'error');
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

      doc.setFillColor(0, 0, 0); // Pure Black
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setTextColor(255, 255, 255); // Pure White
      doc.setFontSize(32);
      doc.setFont(undefined, 'bold');
      doc.text("PRODUCT CATALOGUE", 105, 165, { align: 'center' });
      
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
        
        // --- 1. PRODUCT MAIN HEADER (WITH WRAP) ---
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
      showToast("Failed to generate PDF. Please try again.", 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // SEARCH & FILTER (Defensive)
  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const name = p.name?.toLowerCase() || '';
    const composition = p.composition?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    const productCategories = p.category ? p.category.split(',').map(s=>s.trim().toLowerCase()) : [];
    const rawCategories = p.category?.toLowerCase() || '';

    const matchesSearch = name.includes(query) || 
                          rawCategories.includes(query) ||
                          composition.includes(query);
                          
    const matchesBrand = currentBrand === 'all' || p.brand === currentBrand;
    const matchesCategory = currentCategory === 'All' || productCategories.includes(currentCategory.toLowerCase());
    
    return matchesSearch && matchesBrand && matchesCategory;
  });

  const uniqueCategories = ['All', ...new Set(products.flatMap(p => p.category ? p.category.split(',').map(s=>s.trim()).filter(Boolean) : []))];

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
        
        <select 
          className="form-select filter-btn" 
          value={currentCategory} 
          onChange={e => setCurrentCategory(e.target.value)}
          style={{ width: 'auto', minWidth: '150px', background: 'white', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}
        >
          {uniqueCategories.map(cat => (
             <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
          ))}
        </select>
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
                <div className="no-visual-placeholder">
                   <Package size={32} strokeWidth={1} />
                   <span className="no-visual-text">No Visual</span>
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
              <h3 className="product-name">{product.name}</h3>
              <p className="composition line-clamp-1 italic">{product.composition}</p>
            </div>
            
            <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
               {product.category && product.category.split(',').map(cat => {
                 const t = cat.trim();
                 if (!t) return null;
                 return (
                   <span 
                     key={t}
                     className="category-badge" 
                     onClick={(e) => { 
                       e.stopPropagation(); 
                       setCurrentCategory(t);
                       window.scrollTo({ top: 0, behavior: 'smooth' });
                     }}
                     title={`Click to filter by ${t}`}
                   >
                     {t}
                   </span>
                 );
               })}
            </div>
          </div>
        ))}
      </div>

      {/* DETAIL MODAL */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => {
            if (isEditing) {
              setConfirmDialog({
                message: 'Discard unsaved changes?',
                onConfirm: () => {
                  setSelectedProduct(null);
                  setIsEditing(false);
                }
              });
            } else {
              setSelectedProduct(null);
              setIsEditing(false);
            }
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                {isEditing ? (
                  <>
                    <input 
                      className="edit-input-name" 
                      value={tempProduct?.name || ''} 
                      onChange={(e) => setTempProduct({...tempProduct, name: e.target.value})}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <MultiCategorySelector 
                        rawValue={tempProduct?.category || ''}
                        onChange={(val) => setTempProduct({...tempProduct, category: val})}
                        options={uniqueCategories.filter(c => c !== 'All')}
                        onRenameTag={handleGlobalRename}
                      />
                      <input 
                        className="edit-input-composition" 
                        value={tempProduct?.composition || ''} 
                        onChange={(e) => setTempProduct({...tempProduct, composition: e.target.value})}
                        style={{ flex: 1, margin: 0 }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="product-name" style={{fontSize: '1.8rem', color: 'var(--primary)'}}>{selectedProduct.name}</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                      {selectedProduct.category && selectedProduct.category.split(',').map(cat => {
                        const t = cat.trim();
                        if (!t) return null;
                        return <span key={t} className="category-badge" style={{ cursor: 'default' }}>{t}</span>;
                      })}
                    </div>
                    <div className="composition-scrollable">
                       {selectedProduct.composition}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-header-actions">
                {userRole === 'admin' && !isEditing && (
                  <button 
                    className="edit-action-btn"
                    onClick={() => {
                      setTempProduct({...selectedProduct});
                      setIsEditing(true);
                    }}
                  >
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </button>
                )}
                {isEditing && (
                  <>
                    <button 
                      className="action-btn-save"
                      onClick={handleUpdateProduct}
                    >
                      Save
                    </button>
                    <button 
                      className="action-btn-cancel"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button className="close-btn" onClick={() => {
                    setSelectedProduct(null);
                    setIsEditing(false);
                }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="modal-body">
              <div className="modal-image">
                <div className="image-container" style={{ borderRadius: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  {selectedProduct.image_url ? (
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div className="no-visual-placeholder-modal">
                      {userRole === 'admin' ? (
                        <label className="plus-btn-modal">
                           <Plus size={24} />
                           <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(selectedProduct.id, e)} />
                        </label>
                      ) : <Package size={48} />}
                      <p className="no-visual-text-modal">Scientific File Visual Missing</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-details text-left">
                {isEditing && tempProduct && tempProduct.details ? (
                  Object.entries(tempProduct.details || {}).map(([key, value]) => (
                    <div key={key} className="info-section">
                      <label className="info-label edit-label">
                        {key}
                      </label>
                      <textarea 
                        className="edit-textarea"
                        value={value || ''}
                        onChange={(e) => {
                          const newDetails = {...tempProduct.details, [key]: e.target.value};
                          setTempProduct({...tempProduct, details: newDetails});
                        }}
                      />
                    </div>
                  ))
                ) : (
                  Object.entries(selectedProduct?.details || {}).map(([key, value]) => (
                    <div key={key} className="info-section">
                      <div className="info-label">{key}</div>
                      <div className="info-value">{value}</div>
                    </div>
                  ))
                )}
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
            <form className="modal-form-body" onSubmit={handleAddProduct}>
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
                  <MultiCategorySelector 
                    rawValue={newProduct.category}
                    onChange={(val) => setNewProduct({...newProduct, category: val})}
                    options={uniqueCategories.filter(c => c !== 'All')}
                    onRenameTag={handleGlobalRename}
                  />
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
              
              <div className="form-section-divider">
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

      {/* CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="confirm-modal glass-panel" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-message">{confirmDialog.message}</h3>
            <div className="confirm-actions">
              <button className="guest-btn" style={{margin: 0, width: 'auto', padding: '0.75rem 2rem'}} onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className="login-btn" style={{margin: 0, width: 'auto', padding: '0.75rem 2rem'}} onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(null);
              }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`toast-notification ${toastType}`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
