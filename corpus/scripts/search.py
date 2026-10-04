
import argparse,sqlite3,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('query');p.add_argument('--source',default=None);p.add_argument('--limit',type=int,default=5);a=p.parse_args()
c=sqlite3.connect(Path(__file__).resolve().parents[1]/'research_index.sqlite');c.row_factory=sqlite3.Row
query='SELECT chunk_id,source_id,tradition,locator,text FROM passages WHERE passages MATCH ? AND length(text)>=200'
args=[a.query]
if a.source:query+=' AND source_id=?';args.append(a.source)
query+=' ORDER BY bm25(passages) LIMIT ?';args.append(max(1,min(a.limit,20)))
try:
 for r in c.execute(query,args):print(json.dumps(dict(r),ensure_ascii=False))
except sqlite3.OperationalError as e:raise SystemExit('Invalid FTS query: '+str(e))
