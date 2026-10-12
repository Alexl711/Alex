"""Explicit build-time retrieval. TLS validation stays enabled; no browser CORS proxy.
Raw public HTML is retained locally for review, never promoted to approved records.
"""
import urllib.request, json, pathlib, concurrent.futures, datetime, re, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
registry_path=ROOT/'research/source_registry.json'
registry=json.loads(registry_path.read_text())
def retrieve(source):
    source=dict(source); previous=dict(source);source['history']=[*source.get('history',[]),{k:previous.get(k) for k in ['attemptedAt','retrievalStatus','snapshot','verifiedAt','quote','blockage']}]; source['attemptedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        req=urllib.request.Request(source['url'],headers={'User-Agent':'DegreePlannerResearch/1.0'})
        with urllib.request.urlopen(req,timeout=25) as response:
            raw=response.read(8_000_000); source['httpStatus']=response.status
        folder=ROOT/'research/snapshots';folder.mkdir(exist_ok=True)
        extension='.pdf' if raw.startswith(b'%PDF') else '.html'
        content_hash=hashlib.sha256(raw).hexdigest()
        filename=source['id']+'-'+content_hash[:16]+extension
        (folder/filename).write_bytes(raw)
        old_path=ROOT/'research'/previous.get('snapshot','') if previous.get('snapshot') else None
        changed=bool(old_path and old_path.is_file() and hashlib.sha256(old_path.read_bytes()).hexdigest()!=content_hash)
        source['snapshot']='snapshots/'+filename;source['retrievalStatus']='changed-awaiting-human-review' if changed else ('reviewed-public-evidence' if previous.get('verifiedAt') else 'retrieved-awaiting-human-review');source['blockage']=None
        if changed:source['verifiedAt']=None;source['quote']=None;source['location']=None
    except Exception as error:
        source['retrievalStatus']='inaccessible';source['blockage']=str(error);source['snapshot']=None
    return source
if __name__=='__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: results=list(pool.map(retrieve,registry))
    history=ROOT/'research/retrieval_history.jsonl'
    with history.open('a') as f:
        for result in results:f.write(json.dumps(result)+'\n')
    registry_path.write_text(json.dumps(results,indent=2)+'\n')
    print(f"Retrieved {sum(x['blockage'] is None for x in results)} / {len(results)} sources. No records automatically approved.")
