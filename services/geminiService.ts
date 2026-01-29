
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const improveDescription = async (currentDescription: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Améliore cette description d'item pour une facture professionnelle d'auto-entrepreneur. Sois concis et formel : "${currentDescription}"`,
    });
    return response.text || currentDescription;
  } catch (error) {
    console.error("Gemini Error:", error);
    return currentDescription;
  }
};

export const generateThankYouNote = async (clientName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Génère un court message de remerciement (maximum 2 phrases) pour une facture adressée à ${clientName}. Le ton doit être professionnel et chaleureux.`,
    });
    return response.text || "Merci de votre confiance !";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Merci de votre confiance !";
  }
};

export const extractInvoiceDataFromPDF = async (base64Pdf: string) => {
  try {
    // Utilisation de gemini-3-flash-preview pour ses capacités multimodales rapides
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf
            }
          },
          {
            text: `Analyse ce document PDF (qui est une facture) et extrais les informations suivantes au format JSON strict.
            Si une information est manquante, laisse le champ vide ou à 0.
            
            Format attendu:
            {
              "number": "Numéro de la facture",
              "date": "YYYY-MM-DD",
              "dueDate": "YYYY-MM-DD",
              "sellerName": "Nom de l'émetteur",
              "clientName": "Nom du client",
              "clientAddress": "Adresse du client",
              "subject": "Objet global de la facture ou résumé",
              "items": [
                { "description": "Description ligne 1", "quantity": 1, "unitPrice": 0.0 }
              ]
            }`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini PDF Extraction Error:", error);
    return null;
  }
};
