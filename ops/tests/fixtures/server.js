const http=require('node:http');const mutations=new Set();let duplicates=0;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://fixture');res.setHeader('content-type','application/json');
 const reply=()=>res.end(JSON.stringify({release:process.env.APP_RELEASE,readiness:'ready',mutations:mutations.size,duplicates}));
 if(url.pathname==='/api/internal/jobs/run'){res.statusCode=503;return res.end(JSON.stringify({disabled:true}));}
 if(req.method==='POST'){const id=url.searchParams.get('id');if(mutations.has(id)){duplicates++;res.statusCode=409;}else mutations.add(id);}
 if(url.pathname==='/slow')return setTimeout(reply,2500);reply();
}).listen(3000,'0.0.0.0');
