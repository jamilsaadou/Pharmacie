import getpass, json, subprocess
secret = getpass.getpass('Jeton e-MCF (non affiché) : ')
subprocess.run(['node', 'scripts/configure-esecef.cjs'], input=json.dumps({'token': secret, 'isf': '45977'}), text=True, check=True)
