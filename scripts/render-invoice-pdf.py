"""Render the verified fiscal snapshot as an original monochrome A4 document."""
import json
import argparse
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing

pdfmetrics.registerFont(TTFont('InvoiceArial','/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('InvoiceArialBold','/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--input',default=str(root/'tmp/pdfs/facture-certifiee.json'));parser.add_argument('--output',default=str(root/'output/pdf/facture-certifiee-test.pdf'));args=parser.parse_args()
d=json.loads(Path(args.input).read_text())
out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
black=colors.HexColor('#191919');grey=colors.HexColor('#666666');line=colors.HexColor('#dddddd');light=colors.HexColor('#f3f3f3')
styles={
 'body':ParagraphStyle('body',fontName='InvoiceArial',fontSize=9,leading=13,textColor=black),
 'small':ParagraphStyle('small',fontName='InvoiceArial',fontSize=8,leading=12,textColor=grey),
 'label':ParagraphStyle('label',fontName='InvoiceArialBold',fontSize=8,leading=12,textColor=grey,spaceAfter=6),
 'issuer':ParagraphStyle('issuer',fontName='InvoiceArialBold',fontSize=16,leading=20,textColor=black,spaceAfter=7),
 'title':ParagraphStyle('title',fontName='InvoiceArialBold',fontSize=22,leading=27,textColor=black,spaceAfter=7),
 'white':ParagraphStyle('white',fontName='InvoiceArialBold',fontSize=8,leading=11,textColor=colors.white),
 'value':ParagraphStyle('value',fontName='InvoiceArialBold',fontSize=22,leading=27,textColor=colors.white,alignment=TA_RIGHT),
 'right':ParagraphStyle('right',fontName='InvoiceArial',fontSize=9,leading=13,textColor=black,alignment=TA_RIGHT),
}
def p(v,kind='body'):return Paragraph(escape(str(v if v is not None else '')),styles[kind])
def amount(v):return ('- ' if v<0 else '')+f'{abs(round(v)):,}'.replace(',',' ')
credit=d['typeFacture'] in ('FA','EA','CA','ER')
def signed(v):return -abs(v) if credit else v
story=[]
if d.get('environnement')=='test':
 banner=Table([[p('ENVIRONNEMENT DE TEST DGI - DOCUMENT DE TEST','label')]],colWidths=[511]);banner.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),light),('BOX',(0,0),(-1,-1),.6,line),('LEFTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),6)]));story +=[banner,Spacer(1,12)]
issuer=[p(d.get('raisonSociale') or d['pharmacieName'],'issuer'),p('Point de vente : '+d['pharmacieName'])]
for label,key in [('NIF','nif'),('RCCM','rccm'),('','boitePostale'),('','adresse'),('Téléphone','telephone'),('Email','email'),('Opérateur','operateur')]:
 if d.get(key):issuer.append(p((label+' : ' if label else '')+str(d[key]),'small'))
c=d.get('client') or {};client=[p('CLIENT','label'),p(c.get('nom') or 'Client anonyme')]
for label,key in [('NIF','nif'),('Adresse','adresse'),('Contact','contact')]:
 client.append(p(label+' : '+str(c.get(key) or '-'),'small'))
header=Table([[issuer,client]],colWidths=[306,205]);header.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,-1),light),('LINEBEFORE',(0,0),(0,0),3,black),('LEFTPADDING',(0,0),(-1,-1),15),('RIGHTPADDING',(0,0),(-1,-1),15),('TOPPADDING',(0,0),(-1,-1),11),('BOTTOMPADDING',(0,0),(-1,-1),11)]));story +=[header,Spacer(1,14)]
label='FACTURE D’AVOIR' if credit else 'FACTURE DE VENTE'
if d.get('isCopie'):label='DUPLICATA '+label
story +=[p(label,'title'),p('Facture # '+d['numeroFacture'],'small'),p('Établie le '+d['securityElements']['dateHeure'],'small')]
if d.get('referenceFactureOriginale'):story +=[p('Référence de la facture d’origine : '+d['referenceFactureOriginale'],'small')]
story.append(Spacer(1,11))
rows=[[p(x,'white') for x in ['#','Désignation','P.U. TTC','Qté','Montant']]]
for i,item in enumerate(d['items'],1):
 description=item['nom']+' ['+item['groupeTaxation']+']'
 desc=[p(description)]
 if item.get('descriptionModification'):desc.append(p(item['descriptionModification'],'small'))
 rows.append([p(i),desc,p(amount(abs(item['prixUnitaire'])),'right'),p(amount(signed(item['quantite'])),'right'),p(amount(signed(item['montant'])),'right')])
t=Table(rows,colWidths=[25,230,93,40,123],repeatRows=1,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),black),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,light]),('LINEBELOW',(0,1),(-1,-1),.5,line),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8)]));story +=[t,Spacer(1,14)]
totalrows=[]
for group,totals in d['totauxParGroupe'].items():
 totalrows +=[[p(f'Total H.T. [{group}] {totals["tauxTVA"]}%','small'),p(amount(signed(totals['totalHT'])),'right')],[p(f'Total TVA [{group}] {totals["tauxTVA"]}%','small'),p(amount(signed(totals['totalTVA'])),'right')]]
totalrows +=[[p('TOTAL TVA','small'),p(amount(signed(d['totalTVA'])),'right')]]
totals=Table(totalrows,colWidths=[150,95]);totals.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
card=Table([[p('TOTAL TTC · FCFA','white'),p(amount(signed(d['totalTTC'])),'value')]],colWidths=[118,127]);card.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),black),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12)]))
left=[p('RÈGLEMENT','label'),p('Paiement : '+' / '.join(p['type'] for p in d['paiements']),'small'),Spacer(1,12),p(f'Nombre d’articles : {len(d["items"])}','small')]
summary=Table([[left,[totals,Spacer(1,8),card]]],colWidths=[266,245]);summary.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0)]));story +=[KeepTogether(summary),Spacer(1,12)]
words=d['montantEnLettres']
story +=[p('Arrêté la présente facture à la somme de '+words+' francs CFA TTC.','small'),Spacer(1,14)]
sec=d['securityElements'];qr=QrCodeWidget(sec['qrCodeData']);bounds=qr.getBounds();w=bounds[2]-bounds[0];drawing=Drawing(92,92,transform=[92/w,0,0,92/w,0,0]);drawing.add(qr)
security=[p('CODE SECeF / DGI','label'),p(sec['codeSECeFDGI']),Spacer(1,5),p('NIM : '+sec['nim'],'small'),p('Compteurs : '+sec['compteurs'],'small'),p('Heure DGI : '+sec['dateHeure'],'small')]
securitytable=Table([[drawing,security]],colWidths=[120,391]);securitytable.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),light),('BOX',(0,0),(-1,-1),.6,line),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12),('LEFTPADDING',(0,0),(-1,-1),14)]))
story.append(KeepTogether([p('ÉLÉMENTS DE SÉCURITÉ · FACTURE CERTIFIÉE     |     ISF : '+d['isf'],'label'),securitytable]))
def footer(canvas,doc):
 canvas.saveState();canvas.setStrokeColor(line);canvas.line(42,35,553,35);canvas.setFont('InvoiceArial',7);canvas.setFillColor(grey);canvas.drawString(42,23,'Document établi électroniquement · Montants en FCFA');canvas.drawRightString(553,23,str(doc.page));canvas.restoreState()
SimpleDocTemplate(str(out),pagesize=(595.2756,841.8898),rightMargin=42,leftMargin=42,topMargin=26,bottomMargin=34,title='Facture certifiée - environnement de test',author=d.get('raisonSociale') or d['pharmacieName']).build(story,onFirstPage=footer,onLaterPages=footer)
print('PDF généré :',out.name)
