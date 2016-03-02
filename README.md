# Escalate
 
A generic logger / error reporting facade. 
Can apply different loggers to different logging contexts, and escalate logging into runtime errors.
Provides a useful test-kit to check that your code issues the expected log.
## Usage
In your code:
### Logging
```es6
import {getMailBox} from 'escalate';
const MAILBOX = getMailBox(context);
```
where ```context``` can be anything you want to use to identify the logging events from that specific instance.
Usually, that would be a string namespace in dot notation, like ```'my.beautiful.library'```.
Naming the instance ```MAILBOX``` is a code convention that will allow future tools to filter some logging invocation from the code before producing a production version.
then issue reports like so:
```es6
MAILBOX.error(`Something unexpected happened: ${message}`);
```
or like so:
```es6
MAILBOX.post('error', misMatchMessage(errorContext,fieldDef,fieldDef.defaults(),path));
```
supported logging levels: ```debug, info, warn, error, fatal'```
By default, the ```debug``` level is ignored, and the ```error``` and ```fatal``` levels will throw an error.
### Configuring
You can configure the behavior by using the ```config``` method:
```es6
import {config} from 'escalate';
config(configuration);
```
The ```configuration``` object may have any of 4 optional methods:
```es6
{
  loggerStrategy : (context) => logger
  panicStrategy : (context) => panic
  logThresholdStrategy : (context) => logThreshold
  panicThresholdStrategy : (context) => panicThreshold
}
```
The ```logger``` type has 4 mandatory handler methods, named```debug, info, warn, error'```. By default, this will be used:
```es6
let logger = {
  error : (...params) => console.error(...params),
  warn : (...params) => console.warn(...params),
  info : (...params) => console.info(...params),
  debug : (...params) => console.info(...params) // some environments don't have console.debug
};
```
The ```panic``` type is a method that will be called whenever a logging event that passes the panic threshold occures. for example:
```es6
function panic(...params){
  throw new Error(params.join(' '));
}
```
```logThresholdStrategy``` and ```panicThresholdStrategy``` are methods that accept a context and return a logging level (string). 
Any log event that is below the logging threshold returned by ```logThresholdStrategy``` will be ignored at runtime, while any log event that is equal or above the logging threshold returned by ```panicThresholdStrategy``` will escalate to the panic returned by ```panicStrategy```.

## No Semantic verisoning yet (alpha phase)
This software is in alpha version phase, and so does not respect semantic versioning yet. Breaking changes may occur between patch versions. 
## Develop
- to install
```$
npm install
```
- to test and debug
```$
npm start
```
and then open browser at `http://localhost:8080/webpack-dev-server/test`

- To build for release:
`$ npm run build:src` 

# License
We use a custom license, see ```LICENSE.md```