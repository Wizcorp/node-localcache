# LocalCache

LocalCache is a fast, minimalistic in-memory key/value cache, with support for expiration.
In essence, it's quite similar to other key/value stores like memcached, except that LocalCache
only keeps things in the current process's memory, and not in some external service.
LocalCache has no external dependencies.

## Why would I use this?

Sometimes you want to store some calculated, or externally retrieved values, because you know
you may need them again very soon. Nonetheless, you don't want to keep them around for too long.
That's where the ability to expire information comes in handy. LocalCache has its own garbage
collection mechanism for expiring old data. The main design considerations are a small
performance overhead, and a fast garbage collection mechanism.

## API

LocalCache exposes the following APIs:

### new LocalCache([cycleInterval], [options])

`cycleInterval` is the garbage collection cycle interval, in seconds. If you tend to store a lot
of data, with short TTL values, it is recommended to use a relatively low interval. If data
generally has a high TTL, you may want to raise the interval.

`options` is an object for passing options to the cache. The following values are supported:

`maxKeys` (integer, default: null). Can be set to limit the total amount of values that may be
stored in the cache. If this value gets exceeded, the values that will expire soonest will be made
to expire prematurely.

`aggressiveExpiration` (boolean, default: false). If set to true, even if a get() call yields a value,
and that value is expired (just not yet garbage collected), it will not be returned.

### cache.flush()

Resets the entire cache to zero.

### cache.diagnostics()

Returns an object containing information about the state of the cache.

### cache.add(key, value, [ttl], [touchIfExists])

Adds a value to the cache, optionally expiring after `ttl` seconds. If a value with that key did not yet
exist, it will be created and the new value will be returned. If a value did exist, it will not be
overwritten, and instead that existing value will be returned. Also, if `touchIfExists` is true, the
existing value will get `ttl` as a new time-to-live.

### cache.set(key, value, [ttl])

Adds a value to the cache, optionally expiring after `ttl` seconds. If a value with that key already
exists, it will be overwritten. For chainability, set() will return the value.

### cache.touch(key, ttl)

Resets the value's expiration time to now + `ttl` seconds. The value that `key` holds will be returned.

### cache.del(key)

Deletes the value with key `key` from the cache. If the value existed, this deleted value will be returned.
If it did not exist, undefined will be returned.

### cache.get(key, newTTL)

Returns the value stored by key `key`. If it does not exist, undefined will be returned. If `newTTL` is
defined, the value will be "touched" with the new TTL.

### cache.getExpirationTime(key)

Yields the time (unix timestamp in seconds) at which the value for key `key` will expire. if the value
will never expire, null is returned. If the value does not exist, undefined is returned.


## Example

``` javascript
var LocalCache = require('localcache').LocalCache;

// instantiate

var options = {};

var cache = new LocalCache(60, options);

// set key "hello" to value "world" and expire after 30 seconds.

cache.set('hello', 'world', 30);

// adding a key called "hello" will now fail and return the previous value "world".

cache.add('hello', 'foo');

// print "hello world"

console.log('hello', cache.get('hello'));

// extend expiration to 120 seconds after now

cache.touch('hello', 120);

// cleanup prematurely, because we can

cache.del('hello');
```

## License

LocalCache uses the MIT License.
