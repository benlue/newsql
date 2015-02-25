/*!
* newsql
* authors: Ben Lue
* license: GPL 2.0
* Copyright(c) 2015 Gocharm Inc.
*/
var  jsonfp = require('jsonfp');

var  _trueExpr = {or: true},
	 _falseExpr = {and: false},
	 opMap = {
		"=": "==",
		"!=": "!=",
		">": ">",
		">=": ">=",
		"<": "<",
		"<=": "<="
	 };


exports.filter = function(list, filter, qvalue)  {
	//console.log('input is\n%s', JSON.stringify(list, null, 2));
	//console.log('filter is\n%s', JSON.stringify(filter, null, 2));
	//console.log('query value is\n%s', JSON.stringify(qvalue, null, 2));
	var  jexpr = buildJSONFP(filter, qvalue);
	//console.log('JSON-FP expression is\n%s', JSON.stringify(jexpr, null, 2));
	if (jexpr)
		return  jsonfp.apply( list, {filter: jexpr} );

	// nothing we should do
	return  list;
};


exports.toJsonExpr = buildJSONFP;

function  buildJSONFP(filter, qvalue)  {
	var  jexpr = null,
		 logicOp;

	if (filter.op === 'AND' || filter.op === 'and')
		filter.op = logicOp = 'and';
	else  if (filter.op === 'OR' || filter.op === 'or')
		filter.op = logicOp = 'or';

	if (logicOp)  {
		var  objExpr = {},
			 andField = [];

		filter.filters.forEach(function(f) {
			var  expr = buildJSONFP( f, qvalue );
			if (expr)  {
				var  key = f.name || f.op;
				objExpr[key] = expr;
				andField.push( key );
			}
		});

		if (andField.length > 0)  {
			var  logicExpr = {},
				 chainExpr = [objExpr, logicExpr];
			logicExpr[logicOp] = andField;

			jexpr = {chain: chainExpr};
		}
	}
	else  if (qvalue.hasOwnProperty(filter.name))  {
		var  whereCond = {};

		// TODO: like
		if (filter.op === 'IS NULL')
			whereCond['=='] = null;
		else  if (filter.op === 'IS NOT NULL')
			whereCond['!='] = null;
		else {
			var  jop = opMap[filter.op];
			whereCond[jop] = qvalue[filter.name];
		}
		
		jexpr = {
			chain: [
				{getter: filter.name},
				whereCond
		]};
	}

	return  jexpr;
};