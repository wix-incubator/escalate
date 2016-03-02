/**
 * Created by amira on 6/8/15.
 */
import {expect} from "chai";
import * as escalate from '../../src/index';
import {listen, Report} from '../testDrivers/index';


var PARAMS = ['TEST PARAMS', 1, {}];
var CONTEXT = {};
function getOneTimeReporterForLevel(reportLevel) {
	return () => escalate.getMailBox(CONTEXT)[reportLevel](...PARAMS);
}
function testMatcherConlfusionMatrix(matcher, positive, negative) {
	it(`matches existing reports (true positive)`, () => {
		expect(() => {
			expect(positive).to.report(matcher);
		}).to.not.throw();
	});
	it(`matches missing reports (true negative)`, () => {
		expect(() => {
			expect(negative).not.to.report(matcher);
		}).to.not.throw();
	});
	it(`does not match existing reports as missing (false negative)`, () => {
		expect(() => {
			expect(positive).not.to.report(matcher);
		}).to.throw();
	});
	it(`does not match missing reports as existing (false positive)`, () => {
		expect(() => {
			expect(negative).to.report(matcher);
		}).to.throw();
	})
}
describe('escalate testkit', () => {
	escalate.levels.forEach((reportLevel, reportIdx) => {
		var reportMatcher = new Report(reportLevel, CONTEXT, PARAMS);
		var reporterForLevel = getOneTimeReporterForLevel(reportLevel);
		var reporterForAnotherLevel = getOneTimeReporterForLevel(escalate.levels[(reportIdx + 1) % escalate.levels.length]);
		describe(`exact chai matcher for '${reportLevel}' level`, () => {
			testMatcherConlfusionMatrix(
				reportMatcher, 
				reporterForLevel, 
				reporterForAnotherLevel);
		});
		it(`recorder tool can match ${reportLevel} reports`, () => {
			var recording = listen(reporterForLevel);
			expect(recording).to.eql([{level : reportLevel, context : CONTEXT, params : PARAMS}]);
			expect(recording).to.eql([reportMatcher]);
		});
		it(`mailbox.post(${reportLevel}, ...) reports`, () => {
			expect(() => escalate.getMailBox(CONTEXT).post(reportLevel, ...PARAMS)).to.report(reportMatcher);
		});
	});
	describe('chai matcher for regex', () => {
		testMatcherConlfusionMatrix(
			{level: /warn|error|fatal/},
			getOneTimeReporterForLevel('error'),
			getOneTimeReporterForLevel('info'));
	});

});