
export type DocumentType = 'facture' | 'devis' | 'commande';

export interface CompanyInfo {
  id: string;
  name: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  siret: string;
  email: string;
  phone: string;
  website?: string;
  iban?: string;
  bic?: string;
  displayBankDetails?: boolean;
  isDefault?: boolean;
}

export interface ClientInfo {
  id: string;
  type: 'particulier' | 'entreprise';
  name: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  siret?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BillingDocument {
  id: string;
  type: DocumentType;
  number: string;
  subject: string;
  date: string;
  dueDate: string; // Pour Devis: Date de validité / Pour Commande: Date livraison / Pour Facture: Date échéance
  items: InvoiceItem[];
  client: ClientInfo;
  seller: CompanyInfo;
  notes: string;
  taxExempt: boolean;
  taxRate: number;
  showBankDetails: boolean;
}

export type ViewMode = 'edit' | 'preview' | 'dashboard' | 'clients' | 'profiles' | 'devis' | 'commandes';
