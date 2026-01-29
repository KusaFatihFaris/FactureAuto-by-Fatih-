
import React from 'react';
import { BillingDocument } from '../types';
import { TAX_EXEMPT_MENTION } from '../constants';

interface InvoicePreviewProps {
  invoice: BillingDocument;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice }) => {
  const calculateSubtotal = () => {
    return invoice.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = invoice.taxExempt ? 0 : (subtotal * invoice.taxRate) / 100;
  const total = subtotal + taxAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getDocLabel = () => {
    switch(invoice.type) {
      case 'devis': return 'Devis';
      case 'commande': return 'Bon de Commande';
      default: return 'Facture';
    }
  };

  const getThemeColor = () => {
    switch(invoice.type) {
      case 'devis': return 'bg-emerald-600';
      case 'commande': return 'bg-violet-600';
      default: return 'bg-blue-600';
    }
  };

  const getDateLabel = () => {
    switch(invoice.type) {
      case 'devis': return 'Validité';
      case 'commande': return 'Livraison';
      default: return 'Échéance';
    }
  };

  return (
    <div 
      className="bg-white text-gray-800 relative" 
      id="invoice-printable"
      style={{
        width: '210mm',
        height: '297mm',
        padding: '20mm', // Marges A4 plus généreuses
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Barre de couleur supérieure */}
      <div className={`absolute top-0 left-0 right-0 h-2 ${getThemeColor()}`}></div>

      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div className="w-1/2 overflow-hidden">
          <h1 className="text-xl font-black text-gray-900 tracking-tight mb-2 uppercase break-words">{invoice.seller.name}</h1>
          <div className="space-y-0.5 text-[10px] text-gray-500 leading-relaxed">
            <p className="break-words">{invoice.seller.address}</p>
            <p>{invoice.seller.zipCode} {invoice.seller.city}</p>
            <p>{invoice.seller.country}</p>
            <p className="mt-2 text-gray-400 font-semibold">SIRET : {invoice.seller.siret}</p>
            <div className="mt-2">
               {invoice.seller.email && <p className="break-all">Email: {invoice.seller.email}</p>}
               {invoice.seller.phone && <p>Tél: {invoice.seller.phone}</p>}
            </div>
          </div>
        </div>
        
        <div className="text-right w-1/3">
          <div className={`inline-block px-4 py-1.5 ${getThemeColor()} text-white font-black uppercase tracking-widest text-[11px] mb-4 rounded-sm`}>
            {getDocLabel()}
          </div>
          <p className="text-sm font-bold text-gray-900 uppercase">N° {invoice.number}</p>
          <div className="mt-3 space-y-1 text-[10px]">
            <p className="flex justify-end gap-2 text-gray-500">Date : <span className="text-gray-900 font-bold">{new Date(invoice.date).toLocaleDateString('fr-FR')}</span></p>
            <p className="flex justify-end gap-2 text-gray-500 uppercase">{getDateLabel()} : <span className="text-gray-900 font-bold">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span></p>
          </div>
        </div>
      </div>

      {/* Infos Client & Objet */}
      <div className="flex gap-8 mb-12">
         <div className="w-1/2">
             {invoice.subject && (
              <div className="h-full">
                <p className="text-[9px] uppercase font-black text-gray-400 mb-2 tracking-widest">Objet du document</p>
                <p className="text-xs font-semibold text-gray-800 leading-relaxed break-words">{invoice.subject}</p>
              </div>
            )}
         </div>
         <div className="w-1/2 bg-gray-50 p-6 rounded-sm border-l-2 border-gray-200">
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-black mb-3">Destinataire</p>
            <p className="text-sm font-black text-gray-900 mb-1 break-words">{invoice.client.name || "Client"}</p>
            <div className="text-[10px] text-gray-600 leading-relaxed">
              <p className="break-words">{invoice.client.address}</p>
              <p>{invoice.client.zipCode} {invoice.client.city}</p>
              <p>{invoice.client.country}</p>
            </div>
         </div>
      </div>

      {/* Table des prestations - TABLE-LAYOUT FIXED est CRUCIAL ici */}
      <div className="flex-grow">
        <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b-2 border-gray-900 text-[9px] font-black uppercase text-gray-400 tracking-widest">
              <th className="pb-3 px-2 w-[55%]">Description des prestations</th>
              <th className="pb-3 px-2 text-center w-[10%]">Qté</th>
              <th className="pb-3 px-2 text-right w-[15%]">P.U HT</th>
              <th className="pb-3 px-2 text-right w-[20%]">Total HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-4 px-2 text-[10px] text-gray-700 font-medium leading-normal break-words align-top">{item.description}</td>
                <td className="py-4 px-2 text-[10px] text-center text-gray-500 align-top">{item.quantity}</td>
                <td className="py-4 px-2 text-[10px] text-right text-gray-500 align-top">{formatCurrency(item.unitPrice)}</td>
                <td className="py-4 px-2 text-[10px] text-right font-black text-gray-900 align-top">{formatCurrency(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totaux */}
      <div className="flex justify-end mt-8">
        <div className="w-1/3 space-y-3">
          <div className="flex justify-between text-[10px] px-2">
            <span className="text-gray-400 font-bold uppercase tracking-widest">Total Hors Taxes</span>
            <span className="font-bold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-sm">
            <span className="font-black uppercase tracking-widest text-[9px]">Total TTC</span>
            <span className="text-lg font-black">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Mentions et Signature */}
      <div className="mt-12">
        {invoice.type === 'devis' && (
          <div className="grid grid-cols-2 gap-12 text-[9px] mb-12">
              <div className="text-center">
                  <p className="text-gray-400 font-black mb-12 uppercase tracking-widest">Cachet Entreprise</p>
                  <div className="h-24 border border-gray-200 bg-gray-50"></div>
              </div>
              <div className="text-center">
                  <p className="text-gray-400 font-black mb-2 uppercase tracking-widest">Signature Client (Accord)</p>
                  <p className="text-gray-400 italic mb-6">Mention "Bon pour accord" et signature</p>
                  <div className="h-24 border border-gray-200 bg-gray-50"></div>
              </div>
          </div>
        )}

        {/* Pied de page fixe */}
        <div className="pt-8 border-t border-gray-100 grid grid-cols-2 gap-10">
          <div className="text-[9px]">
            <p className="font-black text-gray-400 mb-2 uppercase tracking-widest">Mode de Règlement</p>
            {invoice.showBankDetails && invoice.seller.iban ? (
              <div className="font-mono text-[9px] text-gray-600 bg-gray-50 p-3 rounded-sm border border-gray-100">
                   <p className="flex justify-between mb-1">IBAN: <span className="font-bold text-gray-900">{invoice.seller.iban}</span></p>
                   {invoice.seller.bic && <p className="flex justify-between">BIC: <span className="font-bold text-gray-900">{invoice.seller.bic}</span></p>}
              </div>
            ) : <p className="italic text-gray-400">À définir selon conditions générales.</p>}
          </div>
          <div className="text-[9px]">
            <p className="font-black text-gray-400 mb-2 uppercase tracking-widest">Informations complémentaires</p>
            <p className="text-gray-600 leading-relaxed italic break-words">{invoice.notes}</p>
          </div>
        </div>

        <div className="text-center mt-8 space-y-1">
            {invoice.taxExempt && <p className="font-black text-[9px] text-gray-400 uppercase tracking-tighter">{TAX_EXEMPT_MENTION}</p>}
            <p className="text-[7px] text-gray-300 uppercase tracking-[0.2em] pt-4">Document généré numériquement via FactureAuto</p>
        </div>
      </div>
    </div>
  );
};
