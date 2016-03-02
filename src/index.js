/**
 * Created by amira on 2/8/15.
 */
import _ from 'lodash';
// TODO nice logger https://github.com/visionmedia/debug

export const levels = Object.freeze(['debug', 'info', 'warn', 'error', 'fatal']);
const DEBUG= 0, INFO= 1, WARN= 2, ERROR= 3, FATAL=4;
const levelIdx = Object.freeze({
	debug:DEBUG,
	info:INFO,
	warn:WARN,
	error:ERROR,
	fatal:FATAL
});
export function getMailBox(context){
	var mailBox = new Mailbox(postOfficeFactory(context));
	mailboxes.push({mailBox, context});
	return mailBox;
}

class Mailbox {
	constructor(postOffice){
		this.postOffice = postOffice;
	}
	post(level, ...params){
		var levelIndex = levelIdx[level];
		if (typeof levelIndex === 'undefined') {
			throw new Error(`log level unknown : ${level}`);
		} else {
			this.postOffice.post(levelIndex, ...params);
		}
	}
	debug(...params){
		this.postOffice.post(DEBUG, ...params);
	}
	info(...params){
		this.postOffice.post(INFO, ...params);
	}
	warn(...params){
		this.postOffice.post(WARN, ...params);
	}
	error(...params){
		this.postOffice.post(ERROR, ...params);
	}
	fatal(...params){
		this.postOffice.post(FATAL, ...params);
	}
	levelCheck(level){
		var levelIndex = levelIdx[level];
		return this.postOffice.isActive(levelIndex);
	}
	debugCheck(){
		return this.postOffice.isActive(DEBUG);
	}
	infoCheck(){
		return this.postOffice.isActive(INFO);
	}
	warnCheck(){
		return this.postOffice.isActive(WARN);
	}
	errorCheck(){
		return this.postOffice.isActive(ERROR);
	}
	fatalCheck(){
		return true;
	}
}

export function config(configParams){
	if (configParams) {
		MAILBOX.warn(`configuration changes : ${Object.keys(configParams)}`);
		moduleConfig = _.defaults({}, _.cloneDeep(configParams), moduleConfig);
		// replace old strategies;
		mailboxes.forEach(e => {
//		MAILBOX.debug(`applying new configuration to ${JSON.stringify(e.context)}`);
			e.mailBox.postOffice = postOfficeFactory(e.context);
		});
	}
	return _.cloneDeep(moduleConfig);
}

const DEFAULT_LOGGER = {
	error : (...params) => console.error(...params),
	warn : (...params) => console.warn(...params),
	info : (...params) => console.info(...params),
	debug : (...params) => console.info(...params) // some environments don't have console.debug
};

function defaultPanic(...params){
	var error = new Error(params.join(' '));
	error.params = params;
	if (error.stack) {
		error.stack = error.stack.split('\n');
		error.stack.splice(1, 3);
		error.stack = error.stack.join('\n');
	}
	throw error;
}

// by default, ignore context and supply preset values
var moduleConfig = {
	loggerStrategy : (ctx) => DEFAULT_LOGGER,
	panicStrategy :  (ctx) => defaultPanic,
	logThresholdStrategy :  (ctx) => 'info' ,
	panicThresholdStrategy :  (ctx) => 'error'
};

var mailboxes = [];

function postOfficeFactory(context) {
	return new PostOffice(
		moduleConfig.loggerStrategy(context),
		moduleConfig.panicStrategy(context),
		moduleConfig.logThresholdStrategy(context),
		moduleConfig.panicThresholdStrategy(context)
	);
}

class PostOffice {
	constructor(logger, panic, logThreshold, panicThreshold) {
		this.logger = logger;
		this.panic = panic;
		this.logThreshold = levels.indexOf(logThreshold);
		this.panicThreshold = levels.indexOf(panicThreshold);
		if (this.panicThreshold < this.logThreshold) {
			var msg = `log threshold ${logThreshold} is higher than panic threshold ${panicThreshold}`;
			if (MAILBOX){
				MAILBOX.error(msg);
			} else {
				throw new Error(msg);
			}
		}
	}
	isActive(levelIndex){
		return levelIndex >= this.logThreshold;
	}
	post(levelIndex, ...params){
		if (this.isActive(levelIndex)){
			if (levelIndex >= this.panicThreshold) {
				this.panic(...params);
			} else {
				this.logger[levels[levelIndex]](...params);
			}
		}
	}
}

const MAILBOX = getMailBox('escalate');