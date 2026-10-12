"""Extract the documented standard path from the retrieved October 2026 catalog.
The entire graduation policy is not declared complete by this extraction.
"""
import pathlib,re,json,subprocess,hashlib
r=pathlib.Path(__file__).resolve().parents[1]/'research'
registry=json.loads((r/'source_registry.json').read_text());current=r/next(s['snapshot'] for s in registry if s['id']=='wgu-october-2026-catalog');canonical=r/'snapshots/wgu-october-2026-catalog.pdf';assert hashlib.sha256(current.read_bytes()).digest()==hashlib.sha256(canonical.read_bytes()).digest(),'Catalog changed; manual review is required';
pdf=r/'snapshots/wgu-october-2026-catalog.pdf';out=r/'snapshots/wgu-october-2026-catalog.txt';subprocess.run(['pdftotext','-layout',str(pdf),str(out)],check=True)
subprocess.run(['pdftotext','-layout',str(r/'snapshots/wgu-bsscom-guide.pdf'),str(r/'snapshots/wgu-bsscom-guide.txt')],check=True)
text=out.read_text();heading=text.index('Bachelor of Science, Supply Chain and Operations Management',text.index('BSHA        202509'));start=text.index('MGMT 3000         C715',heading);end=text.index('BSSCOM      202605',start);section=text[start:end];rows=[]
for line in section.splitlines():
 line=line.strip('\f')
 m=re.match(r'^([A-Z]+\s+\d{4})\s+([CD]\d{3})\s+(.+?)\s+(\d+)\s+(\d+)\s*$',line)
 if m:
  ccn,code,title,units,term=m.groups();rows.append({'ccn':ccn,'code':code,'title':title.strip(),'units':int(units),'term':int(term)})
 elif rows and line.startswith(' '):
  continuation=line.strip()
  if continuation and not any(v in continuation for v in ['©','Total','CUs','Western Governors']) and len(continuation)<60:rows[-1]['title']+=' '+continuation
assert len(rows)==36,len(rows);assert sum(x['units'] for x in rows)==110
requirements=[]
for row in rows:
 requirements.append(dict(id='wgu-'+row['code'].lower(),universityId='wgu',programId='wgu-program',catalogYear='October 2026 · program version 202605',category='Standard path',subcategory='Capstone' if 'Capstone' in row['title'] else 'Required course',courseCode=row['code'],title=row['title'],description='See official program guide for learning outcomes; competency units are not assumed equivalent to semester credits.',credits=row['units'],creditUnit='competency units',upper=False,prerequisites=[],corequisites=[],minimumGrade=None,alternatives=[],residencyImplications='Transfer guidelines and degree residency must be reviewed separately.',sourceIds=['wgu-october-2026-catalog'],quote=f"{row['ccn']} | {row['code']} | {row['title']} | {row['units']} CUs | Standard term {row['term']}",location='Catalog PDF printed pages 85–86; BSSCOM standard path',verifiedAt='2026-10-12',status='documented',confidence='Exact official catalog standard path. Complete graduation policy and level classification not established.',notes='Upper division, prerequisites, transfer alternatives and passing criteria require additional record review. Boolean upper=false does not establish lower-level designation.'))
record={'schemaVersion':1,'university':'WGU','degree':'B.S. Supply Chain and Operations Management','catalogYear':'October 2026','programVersion':'202605','totalCompetencyUnits':110,'completeCourseList':True,'completeness':'Course list complete; graduation/transfer policy audit incomplete','requirements':requirements,'sourceIds':['wgu-october-2026-catalog','wgu-bsscom-guide'],'notes':'The catalog lists 36 courses and 110 competency units. Never substitute a fabricated 120-semester-credit map.'}
(r/'wgu_supply_chain_requirements.json').write_text(json.dumps(record,indent=2))
registry=json.loads((r/'source_registry.json').read_text())
for sid,quote,location in [('wgu-october-2026-catalog','BSSCOM 202605 · Total CUs: 110','PDF printed pages 85–86'),('wgu-bsscom-guide','Program Code: BSSCOM Catalog Version: 202605 Published Date: 12/29/2025','Guide cover; standard path total 110 CUs')]:
 s=next(s for s in registry if s['id']==sid);s.update(verifiedAt='2026-10-12',quote=quote,location=location,retrievalStatus='reviewed-public-evidence')
(r/'source_registry.json').write_text(json.dumps(registry,indent=2))
print('36 WGU courses, 110 competency units; full graduation policy remains incomplete.')
