const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/archive.js'), 'utf8');
const KEY = 'groker.runs.v1';
function boot(storage) {
  const context = {window:{},localStorage:storage};
  vm.runInNewContext(source, context);
  return context.window.GrokerArchive;
}
function storage(quota=Infinity) {
  const values = new Map();
  return {getItem:key=>values.get(key)||null, setItem(key,value){
    if(value.length>quota)throw new Error('QuotaExceededError');values.set(key,value);
  }};
}
function job(index) {
  return {id:index.toString(16).padStart(12,'0'),url:'https://example.com/',status:'complete',
    created_at:new Date(2026,0,index).toISOString(),report:{findings:[],counts:{error:0}}};
}
test('finished reports survive a page reload without an API request',()=>{
  const disk=storage();const archive=boot(disk);
  assert.equal(archive.save(job(1)),true);
  assert.equal(boot(disk).get(job(1).id).id,job(1).id);
});
test('keeps only the latest 20 reports',()=>{
  const archive=boot(storage());for(let i=1;i<=24;i++)archive.save(job(i));
  assert.equal(archive.list().length,20);
  assert.equal(archive.get(job(1).id),undefined);
  assert.equal(archive.list()[0].id,job(24).id);
});
test('storage quota evicts older reports while keeping the newest',()=>{
  const disk=storage(JSON.stringify([job(1),job(2)]).length+5);const archive=boot(disk);
  for(let i=1;i<=4;i++)assert.equal(archive.save(job(i)),true);
  const reloaded=boot(disk);
  assert.equal(reloaded.list().length,2);
  assert.equal(reloaded.get(job(4).id).id,job(4).id);
});
test('blocked storage retains the current result in memory and reports failure',()=>{
  const archive=boot({getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}});
  assert.equal(archive.save(job(1)),false);
  assert.equal(archive.get(job(1).id).id,job(1).id);
});
test('corrupt storage and malformed reports do not break navigation',()=>{
  const disk=storage();disk.setItem(KEY,'not json');const archive=boot(disk);
  assert.equal(archive.list().length,0);
  assert.throws(()=>archive.save({id:'bad'}),/incomplete/);
});
