# @tracker1/logger

This is a very simple logger for console and/or file logging.  All logging output is in JSON.

It is intended for use ONLY with NODEJS server-side.  Future versions may support browser usage.

## Install

`npm i @tracker1/logger`

## Usage

Although globals are usually a bad idea, I tend to just create a global logger.

```
import createLogger from '@tracker1/logger';

global.log = createLogger();
```

Alternatively you can create a `log.mjs` file to export a shared logger instance.

```
import createLogger from '@tracker1/logger`

export default createLogger();
```

or log.js

```
const createLogger = require('@tracker1/logger');

module.exports = createLogger();
```

## Options

### Environment Variables

The following environment variables may be set:

* `LOG_PATH` to enable and set the location for rolling log files.
* `LOG_PRETTY=1` to enable pretty printing, any set value will work
* `LOG_QUIET=1` to disable console logging, for use with services
* `LOG_LEVEL` set to a matching string for the log level to choose
  * Because of other modules that may have their own logging, it's recommended to limit your setting to the most common of values (ERROR, WARN, INFO, DEBUG or TRACE).

Example:

```
cross-env LOG_PATH=/var/log LOG_QUIET=1 node -r esm yourservice.mjs
```

### createLogger(options)

The createLogger method accepts a single options parameter, which can be an object with the following options, you may alternatively set the environment variables above.

* `level` \<String> [optional] - The default lowest level to log output for
  * default: `REQUEST`
* `path` \<String> [optional] - The directory path to place rolling log files, will attempt to create it if it doesn't exist.
* `app` \<Object> [optional] - Used for logging output and log file naming, will try to use the package.json in the working directory, or a parent of the working directory.
  * `name` - Name of the application (also the log file prefix)
    * default to package.json value or `unkown-application`
  * `version` - Version of the application
    * default to package.json value or `0.0.0`
  * `build` - Build date/string for the appliation
    * will default to an entry in package.json value or `unknown-build`
* `pretty` \<Boolean> [optional] - Will adjust console output to be more visually readable.
* `quite` \<Boolean> [optional] - Will disable console output logging


## Log Levels

The following is the list of log levels available.

* FATAL - Fatal error, should only be used before shutdown regarding an error
* ERROR - When an unexpected error occurs
* START - When an application starts
* STOP - When an application is exiting
* RESPONSE - When a host service sends a response to a client
* REQUEST - When a host service receives a request from a client (DEFAULT)
* WARN - Application/Configuration Warning - Less severe than an Error
* INFO - Informational notes
* CLIENTRESPONSE - When a service is making a request to a foreign resource
* CLIENTREQUEST - When a service has received a response to a foreign resource
* DEBUG - Debug messages
* TRACE - Very detailed/verbose messages

## Logger Instance

A logger instance from `createLogger()` will have several methods, mostly corresponding to log levels.

* `levels` \<Object>\<Sealed> - An object with keys matching the log levels, and values matching a numeric value for precident.
* `level` \<String> - get/set property that can view/change the log level after the instance is created.
* `fatal(message)` - logs a message at `FATAL` level.
* `error(message)` - logs a message at `ERROR` level.
* `start(message)` - logs a message at `START` level.
* `stop(message)` - logs a message at `STOP` level.
* `response(message)` - logs a message at `RESPONSE` level.
* `request(message)` - logs a message at `REQUEST` level.
* `warn(message)` - logs a message at `WARN` level.
* `info(message)` - logs a message at `INFO` level.
* `clientResponse(message)` - logs a message at `CLIENTRESPONSE` level.
* `clientRequest(message)` - logs a message at `CLIENTREQUEST` level.
* `debug(message)` - logs a message at `DEBUG` level.
* `trace(message)` - logs a message at `TRACE` level.
* `timedRequest(message, async function)` - Detailed below
* `timedClientRequest(message, async function)` - Detailed below

### timedRequest and timedClientRequest

The methods `timedRequest` and `timedClientRequest` take a message string/oject and will log the start of the request and close of the request with the result value and result time (in ms).

`timedRequest` will log with `REQUEST` and `RESPONSE` levels.

`timedClientRequest` will log with `CLIENTREQUEST` and `CLIENTRESPONSE` respectively.

Rejected promises are logged with `ERROR` level.  The promise result or rejection will bubble up.

The methods should be passed a function that returns a promise.

#### Usage

```
log.timeRequest('LOG REQUEST', () => delay(2000).then(_ => 'SUCCESS'));

// {"level":"REQUEST",...,"detail":{"message":"LOG REQUEST"},"id":"1e10658a-faa0-4f97-aaa5-9fd766a96595"}

// {"level":"RESPONSE",...,"detail":{"message":"LOG REQUEST"},"id":"1e10658a-faa0-4f97-aaa5-9fd766a96595","result":{"value":"SUCCESS","time":2002}}
```

## License

MIT License