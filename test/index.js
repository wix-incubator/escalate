/**
 * Created by amira on 2/8/15.
 */
import * as _ from 'lodash';
import sinon from 'sinon';
import * as escalate from '../src/index.js';
import {Report} from '../test-kit/testDrivers/index';
import testKit from '../test-kit';
import chai from 'chai';
const expect = chai.expect;
chai.use(testKit.chai);

import "../test-kit/test";

var EXPECTED_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
var PARAMS = ['TEST PARAMS', 1, {}];

describe('escalate', () => {
	var sandbox, originalConfig;
	after(() => {
		sandbox.restore();
	});
	before('save original configuration', () => {
		originalConfig = escalate.config();
		sandbox = sinon.sandbox.create();
	});
	afterEach('reset configurations', () => {
		escalate.config(originalConfig);
	});
	EXPECTED_LEVELS.forEach((level) => {
		it(`${level} is a legal report level`, ()=> {
			expect(escalate.levels).to.contain(level);
		});
	});
	describe('default configuration', () => {
		before('spy on console', () => {
			['info', 'warn', 'error'].forEach((level) => {
				sandbox.spy(console, level);
			});
		});
		it('logger threshold is info', ()=> {
			expect(originalConfig.logThresholdStrategy()).to.eql('info');
		});
		it('panic threshold is error', ()=> {
			expect(originalConfig.panicThresholdStrategy()).to.eql('error');
		});
		it('panic throws', ()=> {
			expect(() => originalConfig.panicStrategy()(...PARAMS), 'reporting fatal with default configuration').to.throw;
		});
		var checkStackTrace = function (thrower) {
			var stack1 = new Error('hi').stack.split('\n');
			var stack2;
			try {
				thrower(escalate.getMailBox());
			} catch (e) {
				stack2 = e.stack.split('\n');
			}
			const shorterStack=_.min([stack1.length, stack2.length]) -1;
			for (let i = 1; i < shorterStack; ++i) {
				expect(stack1[i].split(/\s+/)[2], 'line ' + i).to.equal(stack2[i+1].split(/\s+/)[2]); 	// ['','at','Context.<anonymous>','(dist/test/index.js:79:43)']
			}
		};
		it('.fatal() stack trace starts in same place as regular throws (transparent stack trace)', ()=> {
			checkStackTrace( (mailBox) => mailBox.fatal('hi'));
		});
		it('.post("fatal") stack trace starts in same place as regular throws (transparent stack trace)', ()=> {
			checkStackTrace( (mailBox) => mailBox.post('fatal', 'hi'));
		});
		['debug', 'info', 'warn', 'error'].forEach((level) => {
			var consoleLevel = (level === 'debug') ? 'info' : level;
			it(`logger.${level} writes to console.${consoleLevel}`, ()=> {
				console[consoleLevel].reset();
				originalConfig.loggerStrategy()[level](...PARAMS);
				expect(console[consoleLevel].called, 'logger called').to.be.true;
				expect(console[consoleLevel].args, 'arguments of logger call').to.eql([PARAMS]);
			});
		});
	});
	describe('.config()', () => {
		beforeEach('reset configurations', () => {
			escalate.config(originalConfig);
		});
		it('returns updated configuration', ()=> {
			var comparisonBase = escalate.config();
			var func = _.constant('warn');
			var newConfig = escalate.config({logThresholdStrategy: func});
			comparisonBase.logThresholdStrategy = func;
			expect(comparisonBase).to.eql(newConfig);
		});
		it('returns detached configuration', ()=> {
			escalate.config().loggerStrategy = null;
			expect(escalate.config(), 'current config').to.eql(originalConfig);
		});
		it('accepts partial configuration', ()=> {
			escalate.config({loggerStrategy: originalConfig.loggerStrategy});
			escalate.config({panicStrategy: originalConfig.panicStrategy});
			escalate.config({logThresholdStrategy: originalConfig.logThresholdStrategy});
			escalate.config({panicThresholdStrategy: originalConfig.panicThresholdStrategy});
		});
		it('affects pre-existing mailboxes', ()=> {
			var mailBox = escalate.getMailBox();
			var panicSpy = sandbox.spy();
			escalate.config({panicStrategy: _.constant(panicSpy)});
			expect (()=> mailBox.fatal(...PARAMS), 'reporting fatal after overriding panic').not.to.throw();
			expect(panicSpy.calledOnce, 'panicSpy called once').to.be.true;
			expect(panicSpy.calledWithExactly(...PARAMS), 'panicSpy called with expected args').to.be.true;
		});
	});
	describe('mailbox', () => {
		var mailBox, logger, panic;
		function replaceAllButEscalate(field, replacement){
			var config = {};
			config[field] = (ctx) => ctx === 'escalate'? originalConfig[field](ctx) : replacement;
			escalate.config(config);
		}
		beforeEach('init per test', ()=>{
			logger = {};
			panic = sandbox.spy();
			mailBox = escalate.getMailBox('some context');
			replaceAllButEscalate('loggerStrategy', logger);
			replaceAllButEscalate('panicStrategy', panic);
		});

		EXPECTED_LEVELS.forEach((panicLevel, panicLevelIdx) => {
			describe(`with panic threshold ${panicLevel}`, () => {
				beforeEach('reset log level to avoid it being higher than panic level', () => {
					replaceAllButEscalate('logThresholdStrategy', 'debug');
				});
				beforeEach(`panic threshold ${panicLevel}`, () => {
					replaceAllButEscalate('panicThresholdStrategy', panicLevel);
				});
				EXPECTED_LEVELS.slice(0, panicLevelIdx + 1).forEach((logLevel, logLevelIdx) => {
					describe(`and log threshold ${logLevel}`, () => {
						beforeEach(`log threshold ${logLevel}`, () => {
							replaceAllButEscalate('logThresholdStrategy', logLevel);
						});
						EXPECTED_LEVELS.forEach((reportLevel, reportLevelIdx) => {
							function levelTestSuite(reportFn) {
								return () => {
									beforeEach(`spy on logger.${reportLevel} and report`, ()=> {
										logger[reportLevel] = sandbox.spy();
										reportFn();
									});
									if (reportLevelIdx >= panicLevelIdx || reportLevelIdx < logLevelIdx) {
										it(`logger.${reportLevel} is not called`, ()=> {
											expect(logger[reportLevel].called, 'logger called').to.be.false;
										});
									} else {
										it(`logger.${reportLevel} is called`, ()=> {
											expect(logger[reportLevel].args, 'logger called exactly once with the expected arguments').to.eql([PARAMS]);
										});
									}
									if (reportLevelIdx < panicLevelIdx) {
										it(`panic is not called`, ()=> {
											expect(panic.called, 'panic called').to.be.false;
										});
									} else {
										it(`panic is called`, ()=> {
											expect(panic.args, 'panic called exactly once with the expected arguments').to.eql([PARAMS]);
										});
									}
								};
							}
							describe(`.${reportLevel} method`, levelTestSuite(() => mailBox[reportLevel](...PARAMS)));
							describe(`.post('${reportLevel}',...) method`, levelTestSuite(() => mailBox.post(reportLevel, ...PARAMS)));
							describe(`.${reportLevel}Check method`, () => {
								it(`returns ${reportLevelIdx >= logLevelIdx}`, () => {
									expect(mailBox[reportLevel+'Check']()).to.equal(reportLevelIdx >= logLevelIdx);
								});
							});
							describe(`.levelCheck('${reportLevel}', ...) method`, () => {
								it(`returns ${reportLevelIdx >= logLevelIdx}`, () => {
									expect(mailBox.levelCheck(reportLevel)).to.equal(reportLevelIdx >= logLevelIdx);
								});
							});
						});
					});
				});
			});
		});
		describe('timers', () => {

			it('should log info with time duration', ()=>{
				const clock = sandbox.useFakeTimers();
				escalate.config(originalConfig);
				const infoSpy = sandbox.spy();
				escalate.config({
					activateTimers:true,
					loggerStrategy:(context)=>({
						info:infoSpy,
						warn:()=>{},
						error:()=>{},
						log:()=>{}
					})
				})
				const myMailBox = escalate.getMailBox('new context');
				myMailBox.startTimer('a');
				clock.tick(5);
				
				myMailBox.endTimer('a');
				expect(infoSpy.args).to.be.eql([['timer a took 5','timer','a',5]]);
			});

			it('should not log timers when activateTimers config is false', ()=>{
				const clock = sandbox.useFakeTimers();
				escalate.config(originalConfig);
				const infoSpy = sandbox.spy();
				escalate.config({
					activateTimers:false,
					loggerStrategy:(context)=>({
						info:infoSpy,
						warn:()=>{},
						error:()=>{},
						log:()=>{}
					})
				})
				mailBox.startTimer('a');
				clock.tick(5);
				
				mailBox.endTimer('a');
				expect(infoSpy.args).to.be.eql([]);
			});

		});
	});
});