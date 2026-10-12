"""Reviewed 2026-10-12 extraction rules. Fails on source changes; never silently approves new text."""
import json,re,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]/'research'
registry=json.loads((ROOT/'source_registry.json').read_text())
def text(n):return (ROOT/'snapshots'/f'source-{n:02}.txt').read_text()
selections={1:['Spring 112/14/2612/22/2612/29/2601/05/2701/07/2701/11/2703/05/278 weeks','Spring 202/08/2702/16/2702/23/2703/02/2703/04/2703/08/2704/30/278 weeks'],3:['Please note that this is a scheduling aid, not a guarantee of specific course offerings each semester. Course availability varies depending on the date of enrollment, so please be sure to consult the appropriate catalog for official degree/program requirements and seek guidance regularly from your faculty and professional academic advisors.'],4:['Students newly accepted for the 2026-2027 academic year or future years will automatically follow the new curriculum.'],5:['Four-year degree programs (baccalaureate): Students must complete at least 30 credit hours through UMPI. At least 12 of these credits must be in the major, and at least 9 of those 12 credits must be at the upper level (300-level or above).','All of our undergraduate YourPace programs lead to a Bachelor’s degree, which requires a total of 120 credit hours.'],6:['Academic Year 2026 – 2027\nYourPace Undergraduate\n$1800\nPer 8 week session'],9:['Students in Bachelor’s degree programs may earn a maximum of 30 credits.'],10:['Credit hours earned through portfolio assessment do not count toward residency.','The fee for Portfolio Assessment is $50 per credit hour.'],12:['Please see your Advisor to review the course chart below for the right courses that will help you complete your degree.','Complete all the required assessments with an overall score of 70% or above','1 Month\nYou want to work quickly through one or two courses.\n$99\nPer month. Auto-renews.','4 Months\nYou want to knock out several gen eds over a few months.\n25% savings\nfrom the 1 month plan\n$299\nFor four months. Auto-renews.'],13:['Program consists of 36 courses','Tuition\n$3,850\nE-Books and Resources Fee\n+\n$200'],16:['Out-of-state residents\n$4,652','Students registering for 9 or more credits per term will receive the discounted Full-Time Flat-Rate Tuition.'],18:['For $3,468, Edison Accelerate allows students with substantial prior credits to reduce their Credit Hour Residency Requirement to just 6 required course credits (SOS-1100: Critical Information Literacy and Capstone).','Beyond the Credit Hour Residency Requirement, Edison Accelerate does not waive any degree policies or requirements.'],19:['For this degree, SNHU allows you to transfer in up to 90 credits, requiring a minimum of 30 credits to be taken at SNHU.'],20:['$354/credit for undergraduate degrees'],23:['Your Modern States voucher covers the CLEP exam fee','Remote proctoring is covered by your voucher, but has strict technical requirements'],25:['Status:\nAccreditation-System','June 2020 Accredited as part of University of Maine System']}
for number,quotes in selections.items():
 source=next(s for s in registry if s['id']==f'source-{number:02}')
 raw=text(number)
 current=ROOT/source.get('snapshot','')
 canonical=ROOT/'snapshots'/(source['id']+'.html')
 if current.is_file() and canonical.is_file():assert hashlib.sha256(current.read_bytes()).digest()==hashlib.sha256(canonical.read_bytes()).digest(),'Changed source requires manual review and extraction update: '+source['id']
 for q in quotes:
  assert q in raw,(number,q)
 source.update(verifiedAt='2026-10-12',quote='\n[…]\n'.join(quotes),location='Retrieved public page; see snapshots/'+source['id']+'.txt',authority=('Institutional accreditor' if number in [25,26,27] else 'Provider-published partnership table (not registrar approval)' if number==12 else 'Official university / provider public page'),retrievalStatus='reviewed-public-evidence')
for source in registry:
 if source['id'] in ['source-14','source-15']:
  source['retrievalStatus']='javascript-shell-only';source['blockage']='HTTP 200 returned a 22-character JavaScript application shell, not transfer rows. No mapping extracted.'
(ROOT/'source_registry.json').write_text(json.dumps(registry,indent=2)+'\n')
# Named academic map rows only. No general elective placeholders made into courses.
reqs=[]
for line in text(3).splitlines():
 match=re.match(r'((?:UNV|ENG|ACC/BUS|BUS/COM|BUS/ECO|BUS) \d{3})(.+?)(\d) credits',line)
 if not match:continue
 code,title,credits=match.groups();title=title.rstrip('*');rid='umpi-map-'+code.lower().replace('/','-').replace(' ','-')
 reqs.append(dict(id=rid,universityId='umpi',programId='umpi-program',catalogYear='2026–27 (unconfirmed for this map)',category='Program map — unclassified',subcategory='Scheduling guide',courseCode=code,title=title,description='Description not available from scheduling guide.',credits=int(credits),upper=int(code[-3:])>=300,prerequisites=[],corequisites=[],minimumGrade=None,alternatives=[],residencyImplications='Not confirmed; map is not individual degree audit.',sourceIds=['source-03'],quote=line,location='Academic map course table',verifiedAt='2026-10-12',status='provisional',confidence='Directly listed in official scheduling guide; catalog applicability and requirement classification unresolved.',notes='No authoritative course description, prerequisites or 2026–27 degree applicability retrieved.'))
record=json.loads((ROOT/'umpi_2026_2027_requirements.json').read_text());record['requirements']=reqs;record['findings']=['The current retrieved academic map DOES include second-year spring. The supplied omission claim was not reproduced.','120 total credits and 30/12/9 residency are publicly documented in YourPace FAQ; complete catalog requirements remain unavailable.'];(ROOT/'umpi_2026_2027_requirements.json').write_text(json.dumps(record,indent=2))
# Parse actual provider partnership table. Only first table is published equivalency.
from html.parser import HTMLParser
class Rows(HTMLParser):
 def __init__(self):super().__init__();self.row=None;self.cell=None;self.rows=[]
 def handle_starttag(self,t,a):
  if t=='tr':self.row=[]
  if t in ['td','th']:self.cell=[]
 def handle_endtag(self,t):
  if t in ['td','th'] and self.cell is not None:
   if self.row is not None:self.row.append(' '.join(''.join(self.cell).split()))
   self.cell=None
  if t=='tr' and self.row is not None:self.rows.append(self.row);self.row=None
 def handle_data(self,d):
  if self.cell is not None:self.cell.append(d+' ')
p=Rows();p.feed((ROOT/'snapshots/source-12.html').read_text());courses=[];eqs=[];second=False
for row in p.rows:
 if row and row[0]=='Sophia Course':second=True
 if len(row)<5 or not row[3].startswith('SOPH-'):continue
 _,title,equivalent,ace,credits,*rest=row
 cid='sophia-'+ace.lower();courses.append(dict(id=cid,provider='Sophia',providerCourseId=ace,title=title,credits=int(credits),upper=False,aceId=ace,validFrom='',validTo='',hours=30,hoursBasis='estimate',cost=0,prerequisites=[],status='Not Started',startDate='',dueDate='',notes='Published course library, not a personal plan. 30-hour workload is a user-editable planning estimate, not provider data. Subscription cost is separate; recommendation level and validity must be confirmed.',competencies=[]))
 if not second:eqs.append(dict(id='umpi-'+ace.lower(),courseId=cid,universityId='umpi',equivalent=equivalent,requirementIds=[],status='published-equivalency',sourceId='source-12',quote=' | '.join(row[1:5]),catalogYear='Not specified in published partnership table',minimumGrade='Sophia completion: 70% or above; university requirement unresolved',risk='Provider-published equivalency only. Major, new GEC, level, recommendation validity and ACE/CPL limit need university confirmation.',reviewedAt='2026-10-12',expiresAt=''))
(ROOT/'provider_courses.json').write_text(json.dumps(courses,indent=2));record={'schemaVersion':1,'completeness':'published provider table extracted; degree applicability unconfirmed','authority':'Sophia partnership table, not registrar evaluation','equivalencies':eqs};(ROOT/'umpi_sophia_equivalencies.json').write_text(json.dumps(record,indent=2))
# Verified public price excerpts; Study.com and CLEP numeric claims remain unverified.
prices=json.loads((ROOT/'provider_prices.json').read_text())
for price in prices:
 source={'UMPI':'source-06','WGU':'source-13','TESU':'source-16','TESU Edison Accelerate':'source-18','SNHU':'source-20','Sophia':'source-12','UMPI portfolio assessment':'source-10'}.get(price['provider'])
 if source:
  price.update(verificationStatus='documented',origin='Reviewed exact public-page excerpt',sourceIds=[source],verifiedAt='2026-10-12',quote=next(s['quote'] for s in registry if s['id']==source))
(ROOT/'provider_prices.json').write_text(json.dumps(prices,indent=2))
print(f'{len(reqs)} provisional map rows, {len(courses)} provider courses, {len(eqs)} published equivalencies. Zero personal credits.')
