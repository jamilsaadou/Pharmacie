import json, subprocess
from pypdf import PdfReader
text=PdfReader('/Users/air/Downloads/Facture_FC_ES01012222_1-19_2026_20261013110422.pdf').pages[0].extract_text().replace('\u00a0',' ')
lines=text.splitlines()
fields={'raisonSociale':lines[0], 'rccm':next(x.split('RCCM : ')[-1] for x in lines if 'RCCM' in x),'telephone':next(x for x in lines if x=='90108274'), 'email':next(x for x in lines if '@' in x),'boitePostale':next(x for x in lines if x=='BF 100')}
subprocess.run(['node','scripts/save-company-identity.cjs'],input=json.dumps(fields),text=True,check=True)
