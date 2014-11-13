var assert = require('assert');
var LocalStash = require('..').LocalStash;

var cache = new LocalStash(3, { aggressiveExpiration: true });

// test: add

var addObj = { hello: 'world' };

var addedObj = cache.add('key1', addObj);
var addedObj2 = cache.add('key1', { dummy: true });

assert.strictEqual(addObj, addedObj);
assert.strictEqual(addObj, addedObj2);

// test: set

var setObj = { anew: 'obj' };
var addedObj = cache.set('key1', setObj, 2);
assert.notStrictEqual(addObj, addedObj);
assert.strictEqual(setObj, addedObj);

// test: del

var deleted = cache.del('key1');
assert.strictEqual(setObj, deleted);

// test: get

var got = cache.get('key1');
assert.strictEqual(got, undefined);

cache.set('key1', 5);
got = cache.get('key1');
assert.strictEqual(got, 5);

// test: touch

cache.set('key1', 'hello');
cache.touch('key1', 1);
got = cache.get('key1');
assert.strictEqual(got, 'hello');

setTimeout(function () {
	var got = cache.get('key1');
	assert.strictEqual(got, undefined);

	// shutdown

	cache.shutdown();

	console.log('Success');
}, 2100);
