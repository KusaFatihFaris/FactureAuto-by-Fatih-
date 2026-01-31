
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
      className="bg-white text-gray-800 shadow-xl" 
      id="invoice-printable"
      style={{
        width: '794px',        // Largeur exacte A4 à 96 DPI
        minHeight: '1123px',   // Hauteur exacte A4 à 96 DPI
        padding: '0',          // Padding géré en interne pour éviter les calculs de box-sizing complexes sur l'export
        boxSizing: 'border-box',
        margin: '0 auto',      // Centrage visuel
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'     // Interdire tout débordement
      }}
    >
      {/* Barre de couleur supérieure (Flux normal, pas d'absolute) */}
      <div className={`w-full h-3 ${getThemeColor()}`}></div>

      {/* Conteneur principal avec padding fixe en pixels (approx 20mm = 75px) */}
      <div style={{ padding: '75px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          {/* Bloc Vendeur - Largeur fixe */}
          <div style={{ width: '350px' }}>
            <h1 className="text-xl font-black text-gray-900 tracking-tight mb-2 uppercase break-words leading-tight">
              {invoice.seller.name}
            </h1>
            <div className="space-y-1 text-[11px] text-gray-500 leading-snug">
              <p className="break-words font-medium text-gray-700">{invoice.seller.address}</p>
              <p>{invoice.seller.zipCode} {invoice.seller.city}</p>
              <p>{invoice.seller.country}</p>
              <p className="pt-2 font-mono text-gray-400">SIRET : {invoice.seller.siret}</p>
              <div className="pt-1">
                {invoice.seller.email && <p className="break-all">Email: {invoice.seller.email}</p>}
                {invoice.seller.phone && <p>Tél: {invoice.seller.phone}</p>}
              </div>
            </div>
          </div>
          
          {/* Bloc Info Document - Largeur fixe */}
          <div className="text-right" style={{ width: '250px' }}>
            <div className={`inline-block px-4 py-2 ${getThemeColor()} text-white font-black uppercase tracking-widest text-[11px] mb-4 rounded`}>
              {getDocLabel()}
            </div>
            <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">N° {invoice.number}</p>
            <div className="mt-4 space-y-2 text-[11px]">
              <p className="flex justify-end gap-3 text-gray-500">
                <span>Date d'émission :</span> 
                <span className="text-gray-900 font-bold">{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
              </p>
              <p className="flex justify-end gap-3 text-gray-500 uppercase">
                <span>{getDateLabel()} :</span> 
                <span className="text-gray-900 font-bold">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Infos Client & Objet */}
        <div className="flex justify-between items-stretch mb-12 gap-8">
          <div style={{ width: '300px' }}>
              {invoice.subject && (
                <div className="h-full flex flex-col justify-center">
                  <p className="text-[10px] uppercase font-black text-gray-400 mb-2 tracking-widest border-b border-gray-100 pb-1 w-max">Objet</p>
                  <p className="text-xs font-bold text-gray-800 leading-relaxed break-words">
                    {invoice.subject}
                  </p>
                </div>
              )}
          </div>
          <div className="bg-gray-50 p-6 rounded border-l-4 border-gray-200" style={{ width: '300px' }}>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-3">Destinataire</p>
              <p className="text-sm font-black text-gray-900 mb-2 break-words">{invoice.client.name || "Client"}</p>
              <div className="text-[11px] text-gray-600 leading-snug">
                <p className="break-words">{invoice.client.address}</p>
                <p>{invoice.client.zipCode} {invoice.client.city}</p>
                <p>{invoice.client.country}</p>
              </div>
          </div>
        </div>

        {/* Table des prestations */}
        <div className="flex-grow mb-8">
          <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b-2 border-gray-900 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                <th className="pb-3 pl-2 w-[340px]">Désignation</th>
                <th className="pb-3 px-2 text-center w-[80px]">Qté</th>
                <th className="pb-3 px-2 text-right w-[110px]">P.U HT</th>
                <th className="pb-3 pr-2 text-right w-[110px]">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 pl-2 text-[11px] text-gray-700 font-medium leading-normal break-words align-top">
                    {item.description}
                  </td>
                  <td className="py-4 px-2 text-[11px] text-center text-gray-500 align-top font-mono">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-2 text-[11px] text-right text-gray-500 align-top font-mono">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-4 pr-2 text-[11px] text-right font-black text-gray-900 align-top font-mono">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="flex justify-end mt-4 mb-12">
          <div style={{ width: '280px' }} className="space-y-3">
            <div className="flex justify-between text-[11px] px-2 border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-medium">Total Hors Taxes</span>
              <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded shadow-sm">
              <span className="font-black uppercase tracking-widest text-[10px]">Net à payer</span>
              <span className="text-lg font-black">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Mentions légales et Pied de page (Fixé en bas du flux) */}
        <div className="mt-auto">
          {invoice.type === 'devis' && (
            <div className="grid grid-cols-2 gap-12 text-[10px] mb-12 pt-8 border-t border-dashed border-gray-200">
                <div>
                    <p className="text-gray-400 font-bold mb-8 uppercase tracking-widest">Pour l'entreprise</p>
                    <div className="h-16 border-b border-gray-300"></div>
                </div>
                <div>
                    <p className="text-gray-400 font-bold mb-2 uppercase tracking-widest">Pour le client</p>
                    <p className="text-[9px] text-gray-400 italic mb-6">"Bon pour accord", date et signature</p>
                    <div className="h-16 border-b border-gray-300"></div>
                </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-200 grid grid-cols-2 gap-8">
            <div className="text-[10px]">
              <p className="font-black text-gray-400 mb-2 uppercase tracking-widest">Règlement</p>
              {invoice.showBankDetails && invoice.seller.iban ? (
                <div className="font-mono text-[10px] text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 leading-relaxed">
                    <div className="flex gap-2">
                      <span className="w-8 text-gray-400">IBAN</span>
                      <span className="font-bold text-gray-900">{invoice.seller.iban}</span>
                    </div>
                    {invoice.seller.bic && (
                      <div className="flex gap-2 mt-1">
                        <span className="w-8 text-gray-400">BIC</span>
                        <span className="font-bold text-gray-900">{invoice.seller.bic}</span>
                      </div>
                    )}
                </div>
              ) : <p className="italic text-gray-400">Voir conditions générales.</p>}
            </div>
            <div className="text-[10px]">
              <p className="font-black text-gray-400 mb-2 uppercase tracking-widest">Notes</p>
              <p className="text-gray-600 leading-relaxed italic break-words">{invoice.notes}</p>
            </div>
          </div>

          <div className="text-center mt-8 pt-4">
              {invoice.taxExempt && <p className="font-bold text-[9px] text-gray-500 uppercase">{TAX_EXEMPT_MENTION}</p>}
              <p className="text-[8px] text-gray-300 uppercase tracking-widest mt-2">FactureAuto v3.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};
