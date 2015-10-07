/**
 * Created by amira on 6/8/15.
 */
import _ from 'lodash';
import {listen, Report} from '../testDrivers/index';


function matchField(reported, matcher){
	if (matcher){
		return matcher === reported || JSON.stringify(matcher) === JSON.stringify(reported) || (matcher instanceof RegExp && matcher.test('' + reported));
	} else return !reported;
}

function matchParamsByArray(reportedParams, matcherArr) {
	return _.all(matcherArr, matcher => _.some(reportedParams, param => matchField(param, matcher)));
}

function matchArrayOfParamsByArrayOfMatchers(reportedParamsArr, matcherArr){
	if (!matcherArr){
		matcherArr = [];
	} else if(!_.isArray(matcherArr)){
		matcherArr = [matcherArr];
	}
	return _.some(reportedParamsArr, reportedParams => matchParamsByArray(reportedParams, matcherArr));
}

export default function (chai) {
	/**
	 * matches a report that is generated by the function under test
	 */
	chai.Assertion.addMethod("report", function reportImpl({context, level, params}) {
		var reports = listen(this._obj);
		var paramsCandidates = _.pluck(reports.filter((r) => (!context || matchField(r.context, context)) && (!level || matchField(r.level, level))), 'params');
		this.assert(paramsCandidates.length && matchArrayOfParamsByArrayOfMatchers(paramsCandidates, params),
			`Expected #{this} to report, but it didn't.\n ${JSON.stringify(reports)}`,
			`Expected #{this} not to report, but it did.\n ${JSON.stringify(reports)}`
		);
	});
}