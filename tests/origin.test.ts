import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sameOrigin, publicOrigin} from '../src/lib/request-origin';
const request=(headers:Record<string,string>)=>new Request('http://localhost:3000/api/session',{headers});
test('aceita origem local e origem HTTPS encaminhada pelo proxy',()=>{
 assert.ok(sameOrigin(request({host:'localhost:3000',origin:'http://localhost:3000'})));
 const r=request({host:'localhost:3000',origin:'https://financeiro.example.test','x-forwarded-host':'financeiro.example.test','x-forwarded-proto':'https'});
 assert.ok(sameOrigin(r));assert.equal(publicOrigin(r),'https://financeiro.example.test');
});
test('rejeita origem externa, protocolo diferente e hosts encaminhados ambíguos',()=>{
 for(const origin of ['https://evil.test','http://financeiro.example.test','null'])assert.equal(sameOrigin(request({host:'localhost:3000',origin,'x-forwarded-host':'financeiro.example.test','x-forwarded-proto':'https'})),false);
 assert.equal(sameOrigin(request({host:'localhost:3000',origin:'https://evil.test','x-forwarded-host':'evil.test,financeiro.example.test','x-forwarded-proto':'https'})),false);
});
