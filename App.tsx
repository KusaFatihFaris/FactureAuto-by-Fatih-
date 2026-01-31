
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FilePlus, 
  FileText, 
  LayoutDashboard, 
  Save, 
  Printer, 
  Trash2, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Users,
  UserCircle,
  Briefcase,
  UserPlus,
  Sparkles,
  Search,
  TrendingUp,
  CreditCard,
  Download,
  Upload,
  CheckSquare,
  Square,
  MapPin,
  Phone,
  Mail,
  Building2,
  User,
  Globe,
  Landmark,
  Menu,
  X,
  FileDown,
  BookOpen,
  Loader2,
  RefreshCcw,
  FileCheck,
  ShoppingCart,
  Star,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import { BillingDocument, ViewMode, InvoiceItem, ClientInfo, CompanyInfo, DocumentType } from './types';
import { createNewDocument, DEFAULT_COMPANY } from './constants';
import { Button } from './components/Button';
import { InvoicePreview } from './components/InvoicePreview';
import { improveDescription, generateThankYouNote, extractInvoiceDataFromPDF } from './services/geminiService';

declare var html2pdf: any;

const App: React.FC = () => {
  const [documents, setDocuments] = useState<BillingDocument[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [profiles, setProfiles] = useState<CompanyInfo[]>([DEFAULT_COMPANY]);
  const [activeDocument, setActiveDocument] = useState<BillingDocument | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  
  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop collapse state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile drawer state

  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isImportingPDF, setIsImportingPDF] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // États pour la sélection et suppression
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);

  // Persistance
  useEffect(() => {
    const savedDocs = localStorage.getItem('factureauto_v3_docs');
    const savedClients = localStorage.getItem('factureauto_v3_clients');
    const savedProfiles = localStorage.getItem('factureauto_v3_profiles');
    if (savedDocs) setDocuments(JSON.parse(savedDocs));
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
  }, []);

  useEffect(() => {
    localStorage.setItem('factureauto_v3_docs', JSON.stringify(documents));
    localStorage.setItem('factureauto_v3_clients', JSON.stringify(clients));
    localStorage.setItem('factureauto_v3_profiles', JSON.stringify(profiles));
  }, [documents, clients, profiles]);

  // Fermer le menu mobile lors d'un changement de vue
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [viewMode]);

  // Filtrage
  const filteredDocs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.number.toLowerCase().includes(q) || 
      doc.client.name.toLowerCase().includes(q) ||
      doc.subject.toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const totalRevenue = useMemo(() => {
    return documents.filter(d => d.type === 'facture').reduce((acc, d) => {
      return acc + d.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    }, 0);
  }, [documents]);

  const handleCreateNew = (type: DocumentType = 'facture') => {
    const defaultProfile = profiles.find(p => p.isDefault) || profiles[0];
    const fresh = createNewDocument(type, defaultProfile);
    setActiveDocument(fresh);
    setViewMode('edit');
  };

  const handleSaveDocument = () => {
    if (!activeDocument) return;
    setDocuments(prev => {
      const index = prev.findIndex(d => d.id === activeDocument.id);
      if (index !== -1) {
        const next = [...prev];
        next[index] = activeDocument;
        return next;
      }
      return [activeDocument, ...prev];
    });
    setViewMode('dashboard');
  };

  const handleDownloadPDF = () => {
    if (!activeDocument) return;
    setIsGeneratingPDF(true);
    
    // On cible l'élément imprimable
    const element = document.getElementById('invoice-printable');
    
    const opt = {
      margin: 0,
      filename: `${activeDocument.type}_${activeDocument.number}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        width: 794,        
        windowWidth: 794,  
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
      },
      jsPDF: { 
        unit: 'px', 
        format: [794, 1123],
        orientation: 'portrait',
        compress: true,
        hotfixes: ['px_scaling'] 
      }
    };

    const currentScroll = window.scrollY;
    window.scrollTo(0, 0);

    setTimeout(() => {
      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setIsGeneratingPDF(false);
          window.scrollTo(0, currentScroll);
        })
        .catch((err: any) => {
          console.error("PDF Generation Error:", err);
          setIsGeneratingPDF(false);
          window.scrollTo(0, currentScroll);
        });
    }, 150);
  };

  const handleImportInvoicePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    setIsImportingPDF(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = (ev.target?.result as string).split(',')[1];
      const extractedData = await extractInvoiceDataFromPDF(base64Data);
      if (extractedData) {
        const defaultProfile = profiles.find(p => p.isDefault) || profiles[0];
        const newDoc: BillingDocument = {
          ...createNewDocument('facture', defaultProfile),
          number: extractedData.number || `IMP-${Date.now()}`,
          date: extractedData.date || new Date().toISOString().split('T')[0],
          subject: extractedData.subject || "Facture Importée",
          client: { ...createNewDocument('facture', defaultProfile).client, name: extractedData.clientName || "Client Inconnu", address: extractedData.clientAddress || "" },
          items: extractedData.items?.map((item: any) => ({
            id: crypto.randomUUID(),
            description: item.description || "Prestation",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0
          })) || [{ id: crypto.randomUUID(), description: "Prestation importée", quantity: 1, unitPrice: 0 }]
        };
        setDocuments([newDoc, ...documents]);
        setActiveDocument(newDoc);
        setViewMode('edit');
      }
      setIsImportingPDF(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImproveDesc = async (itemId: string) => {
    if (!activeDocument || isProcessingAI) return;
    const item = activeDocument.items.find(i => i.id === itemId);
    if (!item?.description) return;
    setIsProcessingAI(true);
    const improved = await improveDescription(item.description);
    setActiveDocument({ ...activeDocument, items: activeDocument.items.map(i => i.id === itemId ? { ...i, description: improved } : i) });
    setIsProcessingAI(false);
  };

  const handleGenerateThanks = async () => {
    if (!activeDocument || isProcessingAI) return;
    setIsProcessingAI(true);
    const note = await generateThankYouNote(activeDocument.client.name || "notre client");
    setActiveDocument({ ...activeDocument, notes: note });
    setIsProcessingAI(false);
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map(d => d.id));
    }
  };

  const initiateDelete = (ids: string[]) => {
    setIdsToDelete(ids);
    setShowDeleteConfirm(true);
  };

  const confirmDeletion = () => {
    setDocuments(prev => prev.filter(d => !idsToDelete.includes(d.id)));
    setSelectedDocIds(prev => prev.filter(id => !idsToDelete.includes(id)));
    setShowDeleteConfirm(false);
    setIdsToDelete([]);
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white text-gray-900 placeholder-gray-400";
  const labelClass = "text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block";

  const renderDashboard = () => (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Tableau de Bord</h1>
          <p className="text-gray-500 mt-1">Gérez vos factures, devis et commandes.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto mt-4 xl:mt-0">
          <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleImportInvoicePDF} />
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isImportingPDF} icon={isImportingPDF ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}>
            {isImportingPDF ? 'IA en cours...' : 'Importer PDF'}
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => handleCreateNew()} icon={<Plus size={18} />}>Nouveau</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><TrendingUp size={28} /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">CA Facturé</p>
            <p className="text-2xl font-black text-gray-900">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalRevenue)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><FileCheck size={28} /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Documents</p>
            <p className="text-2xl font-black text-gray-900">{documents.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0"><Users size={28} /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Clients</p>
            <p className="text-2xl font-black text-gray-900">{clients.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
           <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <h2 className="font-bold text-gray-800">Historique</h2>
              {selectedDocIds.length > 0 && (
                <div className="flex items-center gap-3 animate-in zoom-in-95 duration-200">
                  <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{selectedDocIds.length}</span>
                  <button onClick={() => initiateDelete(selectedDocIds)} className="flex items-center gap-2 text-xs font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"><Trash2 size={14} /> Supprimer</button>
                </div>
              )}
           </div>
           <div className="relative w-full md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Rechercher..." className="pl-10 pr-4 py-2 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
           </div>
        </div>
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
              <tr>
                <th className="px-6 py-4 w-10">
                  <button onClick={toggleSelectAll} className="p-1">
                    {selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0 ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-300" />}
                  </button>
                </th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Numéro</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Montant</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${selectedDocIds.includes(doc.id) ? 'bg-blue-50/30' : ''}`} onClick={() => { setActiveDocument(doc); setViewMode('preview'); }}>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleSelectDoc(doc.id)} className="p-1">
                      {selectedDocIds.includes(doc.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      doc.type === 'devis' ? 'bg-emerald-50 text-emerald-600' : 
                      doc.type === 'commande' ? 'bg-violet-50 text-violet-600' : 
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 whitespace-nowrap">
                      {doc.number}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${doc.client.type === 'entreprise' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            {doc.client.type === 'entreprise' ? <Building2 size={12} /> : <User size={12} />}
                        </div>
                        <span className="font-bold text-gray-700 text-xs truncate max-w-[150px]">{doc.client.name || "Client sans nom"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(doc.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-black text-gray-900 bg-gray-50 px-2 py-1 rounded-md text-xs whitespace-nowrap">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(doc.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0))}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setActiveDocument(doc); setViewMode('edit'); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Modifier"><FileText size={18} /></button>
                      <button onClick={() => initiateDelete([doc.id])} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-gray-400 font-medium">
                    Aucun document trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}>
           <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-black mb-3 text-center text-gray-900">Confirmer la suppression</h3>
            <p className="text-gray-500 text-center mb-8 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer {idsToDelete.length > 1 ? `ces ${idsToDelete.length} documents` : 'ce document'} ? Cette action est irréversible.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="w-full">Annuler</Button>
              <Button variant="danger" onClick={confirmDeletion} className="w-full">Supprimer définitivement</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderEditForm = () => {
    if (!activeDocument) return null;
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-8 no-print">
          <Button variant="ghost" icon={<ChevronLeft size={18} />} onClick={() => setViewMode('dashboard')}>Retour</Button>
          <div className="flex gap-2 md:gap-4">
             <Button className="hidden md:flex" variant="secondary" onClick={() => setViewMode('preview')}>Aperçu</Button>
             <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveDocument}>Enregistrer</Button>
          </div>
        </div>
        
        {/* Mobile Preview Button */}
        <div className="md:hidden mb-6">
           <Button className="w-full" variant="secondary" onClick={() => setViewMode('preview')}>Voir l'aperçu PDF</Button>
        </div>

        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Edition */}
          <div className="p-6 md:p-12 border-b border-gray-50 bg-gray-50/50">
             <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-2 md:pb-0">
                    {(['facture', 'devis', 'commande'] as DocumentType[]).map(type => (
                      <button 
                        key={type}
                        onClick={() => setActiveDocument({ ...activeDocument, type })}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                          activeDocument.type === type 
                          ? (type === 'devis' ? 'bg-emerald-600 text-white' : type === 'commande' ? 'bg-violet-600 text-white' : 'bg-blue-600 text-white') 
                          : 'bg-white text-gray-400 border border-gray-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Objet du document</label>
                  <input className="text-xl md:text-3xl font-black text-gray-900 bg-transparent border-b-2 border-gray-200 focus:border-blue-600 outline-none w-full" value={activeDocument.subject} onChange={(e) => setActiveDocument({ ...activeDocument, subject: e.target.value })} placeholder="Ex: Création de logo..." />
                </div>
                <div className="w-full md:w-48 space-y-4">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Numéro</label>
                   <input className={inputClass} value={activeDocument.number} onChange={(e) => setActiveDocument({ ...activeDocument, number: e.target.value })} />
                </div>
             </div>
          </div>

          <div className="p-6 md:p-12 space-y-12">
            {/* Émetteur et Client */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex justify-between items-center"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Votre Profil</p><button onClick={() => setShowProfileSelector(true)} className="text-[10px] font-bold text-blue-600 hover:underline">Changer</button></div>
                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100"><p className="font-bold text-gray-900">{activeDocument.seller.name}</p><p className="text-xs text-gray-500 mt-1 break-all">{activeDocument.seller.email}</p></div>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Destinataire</p><button onClick={() => setShowClientSelector(true)} className="text-[10px] font-bold text-blue-600 hover:underline">Rechercher</button></div>
                <div className="space-y-3">
                  <input className={inputClass} placeholder="Nom du client" value={activeDocument.client.name} onChange={(e) => setActiveDocument({...activeDocument, client: {...activeDocument.client, name: e.target.value}})} />
                  <input className={inputClass} placeholder="Adresse" value={activeDocument.client.address} onChange={(e) => setActiveDocument({...activeDocument, client: {...activeDocument.client, address: e.target.value}})} />
                  <div className="grid grid-cols-2 gap-3">
                     <input className={inputClass} placeholder="Code Postal" value={activeDocument.client.zipCode} onChange={(e) => setActiveDocument({...activeDocument, client: {...activeDocument.client, zipCode: e.target.value}})} />
                     <input className={inputClass} placeholder="Ville" value={activeDocument.client.city} onChange={(e) => setActiveDocument({...activeDocument, client: {...activeDocument.client, city: e.target.value}})} />
                  </div>
                </div>
              </div>
            </section>

            {/* Articles */}
            <section>
              <div className="flex justify-between items-center mb-6"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Prestations & Tarifs</p><Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => setActiveDocument({...activeDocument, items: [...activeDocument.items, {id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0}]})}>Ajouter</Button></div>
              <div className="space-y-4">
                {activeDocument.items.map(item => (
                  <div key={item.id} className="flex flex-col md:flex-row gap-4 items-start group border-b md:border-b-0 border-gray-100 pb-4 md:pb-0 last:border-0 last:pb-0">
                    <div className="flex-1 relative w-full">
                      <input className={inputClass} placeholder="Désignation de la prestation..." value={item.description} onChange={(e) => setActiveDocument({...activeDocument, items: activeDocument.items.map(i => i.id === item.id ? {...i, description: e.target.value} : i)})} />
                      <button onClick={() => handleImproveDesc(item.id)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-purple-500 transition-colors" title="Améliorer via IA"><Sparkles size={16} /></button>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <div className="w-24 shrink-0"><input type="number" className={`${inputClass} text-center`} value={item.quantity} onChange={(e) => setActiveDocument({...activeDocument, items: activeDocument.items.map(i => i.id === item.id ? {...i, quantity: Number(e.target.value)} : i)})} /></div>
                      <div className="w-full md:w-32"><input type="number" className={`${inputClass} text-right`} value={item.unitPrice} onChange={(e) => setActiveDocument({...activeDocument, items: activeDocument.items.map(i => i.id === item.id ? {...i, unitPrice: Number(e.target.value)} : i)})} /></div>
                      <button onClick={() => setActiveDocument({...activeDocument, items: activeDocument.items.filter(i => i.id !== item.id)})} className="p-2.5 text-gray-300 hover:text-red-500 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Total et Dates */}
            <section className={`rounded-[2.5rem] p-8 md:p-12 text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl transition-colors duration-500 ${
              activeDocument.type === 'devis' ? 'bg-emerald-700' : activeDocument.type === 'commande' ? 'bg-violet-700' : 'bg-gray-900'
            }`}>
              <div className="space-y-2 text-center md:text-left"><p className="text-white/50 font-bold text-[10px] uppercase">Total à Payer</p><p className="text-4xl md:text-5xl font-black">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(activeDocument.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0))}</p></div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <div className="space-y-1 flex-1">
                    <label className="text-[9px] font-black uppercase text-white/40 ml-2">Date émission</label>
                    <input type="date" className="bg-white/10 border-none rounded-xl px-4 py-2 text-sm text-white w-full outline-none focus:bg-white/20" value={activeDocument.date} onChange={(e) => setActiveDocument({ ...activeDocument, date: e.target.value })} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <label className="text-[9px] font-black uppercase text-white/40 ml-2">{activeDocument.type === 'devis' ? 'Validité' : activeDocument.type === 'commande' ? 'Livraison' : 'Échéance'}</label>
                    <input type="date" className="bg-white/10 border-none rounded-xl px-4 py-2 text-sm text-white w-full outline-none focus:bg-white/20" value={activeDocument.dueDate} onChange={(e) => setActiveDocument({ ...activeDocument, dueDate: e.target.value })} />
                  </div>
              </div>
            </section>

            {/* Notes */}
            <section className="space-y-4">
              <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-gray-400">Notes & Remerciements</label><button onClick={handleGenerateThanks} className="flex items-center gap-2 text-xs font-bold text-purple-600"><Sparkles size={14} />IA : Remercier</button></div>
              <textarea className={`${inputClass} h-24`} value={activeDocument.notes} onChange={(e) => setActiveDocument({ ...activeDocument, notes: e.target.value })} />
            </section>
          </div>
        </div>
      </div>
    );
  };

  const renderClients = () => (
    <div className="p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mes Clients</h1>
        <Button className="w-full md:w-auto" onClick={() => setClients([...clients, { id: crypto.randomUUID(), type: 'particulier', name: "Nouveau Client", address: "", zipCode: "", city: "", country: "France", email: "", phone: "" }])} icon={<UserPlus size={18} />}>Ajouter</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {clients.map(client => (
          <div key={client.id} className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4 w-full">
                 <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                    {client.type === 'entreprise' ? <Building2 size={24} /> : <User size={24} />}
                 </div>
                 <div className="flex-1 min-w-0">
                    <input className="font-black text-xl text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-blue-500 w-full truncate" value={client.name} onChange={(e) => setClients(clients.map(c => c.id === client.id ? { ...c, name: e.target.value } : c))} placeholder="Nom ou Raison Sociale" />
                    <div className="flex gap-2 mt-2 flex-wrap">
                        {(['particulier', 'entreprise'] as const).map(t => (
                            <button key={t} onClick={() => setClients(clients.map(c => c.id === client.id ? { ...c, type: t } : c))} className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${client.type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                 </div>
              </div>
              <button onClick={() => setClients(clients.filter(c => c.id !== client.id))} className="p-2 text-gray-300 hover:text-red-500 transition-colors ml-2"><Trash2 size={18} /></button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2"><MapPin size={10} /> Facturation</p>
                    <div>
                        <label className={labelClass}>Adresse complète</label>
                        <input className={inputClass} value={client.address} onChange={(e) => setClients(clients.map(c => c.id === client.id ? { ...c, address: e.target.value } : c))} placeholder="N° et Nom de rue" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Code Postal</label>
                            <input className={inputClass} value={client.zipCode} onChange={(e) => setClients(clients.map(c => c.id === client.id ? { ...c, zipCode: e.target.value } : c))} placeholder="75000" />
                        </div>
                        <div>
                            <label className={labelClass}>Ville</label>
                            <input className={inputClass} value={client.city} onChange={(e) => setClients(clients.map(c => c.id === client.id ? { ...c, city: e.target.value } : c))} placeholder="Paris" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Pays</label>
                        <input className={inputClass} value={client.country} onChange={(e) => setClients(clients.map(c => c.id === client.id ? { ...c, country: e.target.value } : c))} placeholder="France" />
                    </div>
                </div>
                
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2"><Phone size={10} /> Contact</p>
                    <div>
                        <label className={labelClass}>Email</label>
                        <input className={inputClass} type="email" value={client.email} onChange={(e) => setClients(clients.map(c => c.id === client.id ? { ...c, email: e.target.value } : c))} placeholder="client@exemple.com" />
                    </div>
                    <div>
                        <label className={labelClass}>Téléphone</label>
                        <input className={inputClass} type="tel" value={client.phone} onChange={(e) => setClients(clients.map(c => c.id === client.id ? { ...c, phone: e.target.value } : c))} placeholder="06 00 00 00 00" />
                    </div>
                    {client.type === 'entreprise' && (
                        <div>
                            <label className={labelClass}>SIRET (Optionnel)</label>
                            <input className={inputClass} value={client.siret || ''} onChange={(e) => setClients(clients.map(c => c.id === client.id ? { ...c, siret: e.target.value } : c))} placeholder="123 456 789 00012" />
                        </div>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const handleSetDefaultProfile = (profileId: string) => {
    setProfiles(profiles.map(p => ({
      ...p,
      isDefault: p.id === profileId
    })));
  };

  const handleAddProfile = () => {
    const newProfile: CompanyInfo = {
      ...DEFAULT_COMPANY,
      id: crypto.randomUUID(),
      name: "Nouveau Profil",
      isDefault: profiles.length === 0,
      displayBankDetails: true
    };
    setProfiles([...profiles, newProfile]);
  };

  const handleDeleteProfile = (profileId: string) => {
    if (profiles.length <= 1) return;
    const deletedProfile = profiles.find(p => p.id === profileId);
    const nextProfiles = profiles.filter(p => p.id !== profileId);
    
    // Si on supprime le profil par défaut, on en désigne un autre
    if (deletedProfile?.isDefault && nextProfiles.length > 0) {
      nextProfiles[0].isDefault = true;
    }
    
    setProfiles(nextProfiles);
  };

  const renderProfiles = () => (
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Mes Profils</h1>
            <Button className="w-full md:w-auto" onClick={handleAddProfile} icon={<Plus size={18} />}>Ajouter un profil</Button>
        </div>
        
        <div className="grid grid-cols-1 gap-12">
            {profiles.map(p => (
                <div key={p.id} className={`bg-white rounded-[2rem] border-2 p-6 md:p-12 shadow-sm space-y-10 transition-all ${p.isDefault ? 'border-blue-600' : 'border-gray-100'}`}>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white shrink-0 shadow-lg transition-colors ${p.isDefault ? 'bg-blue-600 shadow-blue-600/20' : 'bg-gray-400 shadow-gray-400/20'}`}>
                            <Briefcase size={32} />
                        </div>
                        <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <input className="text-3xl font-black text-gray-900 w-full outline-none bg-transparent border-b border-gray-100 focus:border-blue-600 py-2 transition-all" value={p.name} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, name: e.target.value } : pr))} placeholder="Ma Micro-Entreprise" />
                                <div className="flex items-center gap-2 self-end md:self-auto">
                                    <button 
                                        onClick={() => handleSetDefaultProfile(p.id)}
                                        className={`p-3 rounded-2xl transition-all ${p.isDefault ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-300 hover:text-blue-400'}`}
                                        title={p.isDefault ? "Profil par défaut" : "Définir comme par défaut"}
                                    >
                                        <Star size={20} fill={p.isDefault ? "currentColor" : "none"} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteProfile(p.id)}
                                        className={`p-3 rounded-2xl bg-red-50 text-red-400 hover:text-red-600 transition-all ${profiles.length <= 1 ? 'opacity-20 cursor-not-allowed' : ''}`}
                                        disabled={profiles.length <= 1}
                                        title="Supprimer ce profil"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-400 text-xs mt-2 uppercase font-black tracking-widest">{p.isDefault ? 'Émetteur par défaut' : 'Profil secondaire'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest border-b border-blue-50 pb-2">Identification & Siège</p>
                            <div>
                                <label className={labelClass}>SIRET</label>
                                <input className={inputClass} value={p.siret} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, siret: e.target.value } : pr))} placeholder="123 456 789 00012" />
                            </div>
                            <div>
                                <label className={labelClass}>Adresse complète</label>
                                <textarea className={`${inputClass} h-24 resize-none`} value={p.address} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, address: e.target.value } : pr))} placeholder="123 Rue de la Réussite" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Code Postal</label>
                                    <input className={inputClass} value={p.zipCode} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, zipCode: e.target.value } : pr))} />
                                </div>
                                <div>
                                    <label className={labelClass}>Ville</label>
                                    <input className={inputClass} value={p.city} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, city: e.target.value } : pr))} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Pays</label>
                                <input className={inputClass} value={p.country} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, country: e.target.value } : pr))} />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-blue-50 pb-2">
                                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Coordonnées & Paiement</p>
                                <button 
                                    onClick={() => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, displayBankDetails: !pr.displayBankDetails } : pr))}
                                    className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded transition-colors ${p.displayBankDetails ? 'text-blue-600 bg-blue-50' : 'text-gray-400 bg-gray-50'}`}
                                >
                                    {p.displayBankDetails ? <Eye size={12} /> : <EyeOff size={12} />}
                                    {p.displayBankDetails ? 'Affiché' : 'Masqué'}
                                </button>
                            </div>
                            <div>
                                <label className={labelClass}>Email professionnel</label>
                                <input className={inputClass} type="email" value={p.email} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, email: e.target.value } : pr))} />
                            </div>
                            <div>
                                <label className={labelClass}>Téléphone</label>
                                <input className={inputClass} type="tel" value={p.phone} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, phone: e.target.value } : pr))} />
                            </div>
                            <div className={`transition-opacity ${!p.displayBankDetails ? 'opacity-40' : 'opacity-100'}`}>
                                <label className={labelClass}>IBAN</label>
                                <input className={`${inputClass} font-mono text-xs`} value={p.iban || ''} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, iban: e.target.value } : pr))} placeholder="FR76 1234..." />
                            </div>
                            <div className={`transition-opacity ${!p.displayBankDetails ? 'opacity-40' : 'opacity-100'}`}>
                                <label className={labelClass}>BIC / SWIFT</label>
                                <input className={`${inputClass} font-mono uppercase`} value={p.bic || ''} onChange={(e) => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, bic: e.target.value } : pr))} placeholder="ABCDEF..." />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button 
                                  onClick={() => setProfiles(profiles.map(pr => pr.id === p.id ? { ...pr, displayBankDetails: !pr.displayBankDetails } : pr))}
                                  className={`w-10 h-5 rounded-full relative transition-colors ${p.displayBankDetails ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${p.displayBankDetails ? 'left-6' : 'left-1'}`} />
                                </button>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Afficher RIB sur documents</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        <div className="fixed bottom-8 right-8 no-print z-40">
            <Button size="lg" icon={<Save size={20} />} onClick={() => setViewMode('dashboard')} className="shadow-2xl">Enregistrer et quitter</Button>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fcfdfe]">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0"><FileText size={16} /></div>
          <span className="font-black text-lg text-gray-900">FactureAuto</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500">
           {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 h-screen z-50 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        w-64 md:w-auto
      `}>
        <div className="p-8 flex items-center gap-4 hidden md:flex">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0"><FileText size={20} /></div>
          {isSidebarOpen && <span className="font-black text-lg text-gray-900">FactureAuto</span>}
        </div>
        
        {/* Mobile Sidebar Header */}
        <div className="p-6 md:hidden">
          <h2 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4">Navigation</h2>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setViewMode('dashboard')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${viewMode === 'dashboard' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-50'}`}>
            <LayoutDashboard size={22} /> {(isSidebarOpen || isMobileMenuOpen) && <span className="text-sm font-bold">Dashboard</span>}
          </button>
          <button onClick={() => setViewMode('clients')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${viewMode === 'clients' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-50'}`}>
            <Users size={22} /> {(isSidebarOpen || isMobileMenuOpen) && <span className="text-sm font-bold">Clients</span>}
          </button>
          <button onClick={() => setViewMode('profiles')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${viewMode === 'profiles' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-400 hover:bg-gray-50'}`}>
            <UserCircle size={22} /> {(isSidebarOpen || isMobileMenuOpen) && <span className="text-sm font-bold">Profils</span>}
          </button>
        </nav>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-8 text-gray-300 hidden md:block">
          {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </button>
      </aside>

      <main className="flex-1 w-full overflow-hidden">
        {viewMode === 'dashboard' && renderDashboard()}
        {viewMode === 'edit' && renderEditForm()}
        {viewMode === 'clients' && renderClients()}
        {viewMode === 'profiles' && renderProfiles()}
        {viewMode === 'preview' && activeDocument && (
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
             <div className="flex justify-between mb-8 no-print">
                <Button variant="ghost" icon={<ChevronLeft size={18} />} onClick={() => setViewMode('edit')}>Modifier</Button>
                <div className="flex gap-4">
                  <Button variant="secondary" icon={<FileDown size={18} />} onClick={handleDownloadPDF} disabled={isGeneratingPDF}>{isGeneratingPDF ? '...' : 'Télécharger PDF'}</Button>
                  <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveDocument}>Terminer</Button>
                </div>
             </div>
             
             {/* Container de prévisualisation avec mise à l'échelle pour mobile */}
             <div className="flex justify-center bg-gray-100 p-2 md:p-10 rounded-3xl overflow-hidden relative min-h-[500px] md:min-h-0">
                {/* 
                  On utilise une transformation CSS (scale) pour faire rentrer la facture de 794px 
                  sur un écran de mobile (300-400px).
                  origin-top-left permet de coller la facture en haut à gauche.
                */}
                <div className="md:block hidden">
                   <InvoicePreview invoice={activeDocument} />
                </div>
                
                <div className="md:hidden w-full overflow-x-auto flex justify-center pt-4 pb-20">
                   <div style={{ transform: 'scale(0.42)', transformOrigin: 'top center', height: '1123px' }}>
                     <InvoicePreview invoice={activeDocument} />
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Modals de sélection */}
      {showClientSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6" onClick={() => setShowClientSelector(false)}>
           <div className="bg-white rounded-[2.5rem] p-6 md:p-10 w-full max-w-md shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black mb-6 text-gray-900 shrink-0">Charger un client</h3>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {clients.map(c => (
                <button key={c.id} className="w-full text-left p-6 hover:bg-blue-600 hover:text-white rounded-3xl border border-gray-100 flex items-center gap-4 transition-all group" onClick={() => { setActiveDocument({ ...activeDocument!, client: c }); setShowClientSelector(false); }}>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-white/20 group-hover:text-white transition-colors shrink-0">
                    {c.type === 'entreprise' ? <Building2 size={20} /> : <User size={20} />}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold block text-gray-900 group-hover:text-white truncate">{c.name}</span>
                    <span className="text-xs text-gray-500 group-hover:text-white/80 truncate block">{c.city || 'Ville non renseignée'}</span>
                  </div>
                </button>
              ))}
              {clients.length === 0 && <p className="text-center py-10 text-gray-400">Aucun client enregistré.</p>}
            </div>
          </div>
        </div>
      )}

      {showProfileSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6" onClick={() => setShowProfileSelector(false)}>
           <div className="bg-white rounded-[2.5rem] p-6 md:p-10 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black mb-6 text-gray-900">Changer d'émetteur</h3>
            <div className="space-y-3">
              {profiles.map(p => (
                <button key={p.id} className="w-full text-left p-6 hover:bg-blue-600 hover:text-white rounded-3xl border border-gray-100 flex items-center gap-4 transition-all group" onClick={() => { setActiveDocument({ ...activeDocument!, seller: p, showBankDetails: p.displayBankDetails ?? true }); setShowProfileSelector(false); }}>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-white/20 group-hover:text-white transition-colors shrink-0">
                    <Briefcase size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold block text-gray-900 group-hover:text-white truncate">{p.name}</span>
                    {p.isDefault && <span className="text-[9px] uppercase font-black tracking-widest text-blue-600 group-hover:text-white/80">Par défaut</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
