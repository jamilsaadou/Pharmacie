// Utilitaires pour l'impression de documents

interface PrintHeaderInfo {
  pharmacieName?: string;
  pharmacieAddress?: string;
  pharmaciePhone?: string;
  pharmacieEmail?: string;
}

interface PrintDocumentOptions {
  title: string;
  documentNumber: string;
  date: string;
  headerInfo?: PrintHeaderInfo;
  content: string;
  footer?: string;
}

const defaultHeaderInfo: PrintHeaderInfo = {
  pharmacieName: "Pharmacie Garkuwa",
  pharmacieAddress: "Niamey, Niger",
  pharmaciePhone: "+227 XX XX XX XX",
  pharmacieEmail: "contact@garkuwa.ne"
};

/**
 * Génère et imprime un document
 */
export function printDocument(options: PrintDocumentOptions) {
  const { title, documentNumber, date, headerInfo = defaultHeaderInfo, content, footer } = options;

  const printContent = `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - ${documentNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: white;
            color: #1f2937;
            line-height: 1.4;
            font-size: 13px;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #10b981;
          }
          
          .header .left-section {
            flex: 1;
          }
          
          .header h1 {
            color: #10b981;
            font-size: 22px;
            margin-bottom: 5px;
            font-weight: 700;
          }
          
          .header .pharmacie-info {
            font-size: 11px;
            color: #6b7280;
            line-height: 1.4;
          }
          
          .header .qr-code {
            width: 80px;
            height: 80px;
            border: 2px solid #e5e7eb;
            border-radius: 4px;
            padding: 4px;
            background: white;
          }
          
          .header .qr-code img {
            width: 100%;
            height: 100%;
          }
          
          .document-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
            padding: 12px;
            background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%);
            border-radius: 6px;
            border-left: 4px solid #10b981;
          }
          
          .document-info .section {
            display: flex;
            flex-direction: column;
          }
          
          .document-info .label {
            font-weight: 600;
            color: #065f46;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          
          .document-info .value {
            color: #1f2937;
            font-size: 13px;
            font-weight: 500;
          }
          
          .document-title {
            font-size: 18px;
            font-weight: bold;
            color: #065f46;
            margin-bottom: 5px;
          }
          
          .document-number {
            font-size: 15px;
            color: #10b981;
            font-weight: 700;
          }
          
          table { 
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 12px;
          }
          
          th {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: none;
          }
          
          td {
            border: 1px solid #e5e7eb;
            padding: 8px 10px;
            font-size: 12px;
          }
          
          tbody tr:nth-child(even) {
            background: #f9fafb;
          }
          
          tbody tr:hover {
            background: #f0fdf4;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .font-bold {
            font-weight: 600;
          }
          
          .totals {
            margin-top: 20px;
            float: right;
            width: 300px;
          }
          
          .totals table {
            margin: 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            border-radius: 6px;
            overflow: hidden;
          }
          
          .totals td {
            padding: 8px 12px;
            border: none;
            border-bottom: 1px solid #e5e7eb;
            font-size: 12px;
          }
          
          .totals .total-row {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%) !important;
            font-weight: bold;
            font-size: 14px;
            color: #065f46;
          }
          
          .totals .total-row td {
            border-top: 2px solid #10b981;
            padding: 12px;
          }
          
          .footer {
            clear: both;
            margin-top: 40px;
            padding-top: 15px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding: 0 30px;
          }
          
          .signature-box {
            text-align: center;
            width: 180px;
          }
          
          .signature-line {
            border-top: 1.5px solid #374151;
            margin-top: 50px;
            padding-top: 8px;
            font-size: 11px;
            font-weight: 600;
            color: #374151;
          }
          
          .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          
          .badge-success {
            background: #d1fae5;
            color: #065f46;
          }
          
          .badge-warning {
            background: #fef3c7;
            color: #92400e;
          }
          
          .badge-info {
            background: #dbeafe;
            color: #1e40af;
          }
          
          .badge-danger {
            background: #fee2e2;
            color: #991b1b;
          }
          
          @media print {
            body {
              padding: 20px;
            }
            
            .no-print {
              display: none;
            }
            
            @page {
              margin: 1cm;
            }
          }
          
          .info-box {
            background: #f9fafb;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 15px;
            border-left: 3px solid #10b981;
          }
          
          .info-box h3 {
            font-size: 13px;
            color: #374151;
            margin-bottom: 8px;
            font-weight: 600;
          }
          
          .info-box p {
            font-size: 12px;
            color: #6b7280;
            margin: 3px 0;
          }
          
          .info-box strong {
            color: #1f2937;
            font-weight: 600;
          }
          
          @media screen {
            body {
              max-width: 190mm;
              margin: 0 auto;
              box-shadow: 0 0 15px rgba(0,0,0,0.08);
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${headerInfo.pharmacieName}</h1>
          <div class="pharmacie-info">
            ${headerInfo.pharmacieAddress}<br>
            Tél: ${headerInfo.pharmaciePhone} | Email: ${headerInfo.pharmacieEmail}
          </div>
        </div>
        
        <div class="document-info">
          <div class="section">
            <div class="document-title">${title}</div>
            <div class="document-number">${documentNumber}</div>
          </div>
          <div class="section text-right">
            <div class="label">Date d'émission</div>
            <div class="value">${date}</div>
          </div>
        </div>
        
        ${content}
        
        ${footer || `
          <div class="footer">
            <p>Merci de votre confiance</p>
            <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        `}
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-right: 10px;
          ">
            🖨️ Imprimer
          </button>
          <button onclick="window.close()" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          ">
            ✕ Fermer
          </button>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Auto-print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    alert('Veuillez autoriser les fenêtres contextuelles pour imprimer');
  }
}

/**
 * Génère un code QR en utilisant l'API Google Charts
 */
export function generateQRCode(data: string, size: number = 150): string {
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
}

/**
 * Formate un statut avec un badge coloré
 */
export function formatStatutBadge(statut: string): string {
  const badges = {
    'en_attente': '<span class="badge badge-warning">En attente</span>',
    'confirmee': '<span class="badge badge-info">Confirmée</span>',
    'livree': '<span class="badge badge-success">Livrée</span>',
    'annulee': '<span class="badge badge-danger">Annulée</span>',
    'en_cours': '<span class="badge badge-warning">En cours</span>',
    'validee': '<span class="badge badge-success">Validée</span>',
    'payee': '<span class="badge badge-success">Payée</span>',
  };

  return badges[statut as keyof typeof badges] || statut;
}
