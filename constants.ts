
import { CompanyInfo, BillingDocument, DocumentType } from './types';

export const DEFAULT_COMPANY: CompanyInfo = {
  id: 'default-profile',
  name: "Ma Micro-Entreprise",
  address: "123 Rue de la Réussite",
  zipCode: "75001",
  city: "Paris",
  country: "France",
  siret: "123 456 789 00012",
  email: "contact@entreprise.fr",
  phone: "01 02 03 04 05",
  website: "www.ma-boite.fr",
  iban: "FR76 1234 5678 9012 3456 7890 123",
  bic: "ABCDEF12XXX",
  displayBankDetails: true,
  isDefault: true
};

export const TAX_EXEMPT_MENTION = "TVA non applicable, art. 293 B du CGI";

const getPrefix = (type: DocumentType) => {
  switch(type) {
    case 'devis': return 'DEV';
    case 'commande': return 'CMD';
    default: return 'FAC';
  }
};

export const createNewDocument = (type: DocumentType = 'facture', seller?: CompanyInfo): BillingDocument => ({
  id: crypto.randomUUID(),
  type: type,
  number: `${getPrefix(type)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
  subject: "",
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  items: [
    { id: crypto.randomUUID(), description: `Prestation de service (${type})`, quantity: 1, unitPrice: 0 }
  ],
  client: {
    id: crypto.randomUUID(),
    type: 'particulier',
    name: "",
    address: "",
    zipCode: "",
    city: "",
    country: "France",
    email: "",
    phone: ""
  },
  seller: seller ? { ...seller } : { ...DEFAULT_COMPANY },
  notes: type === 'devis' ? "Devis valable 30 jours." : "Merci de votre confiance !",
  taxExempt: true,
  taxRate: 0,
  showBankDetails: seller?.displayBankDetails ?? true
});
