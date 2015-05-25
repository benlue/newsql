/*!
* newsql
* authors: Ben Lue
* license: GPL 2.0
* Copyright(c) 2015 Gocharm Inc.
*/
exports.parseQO = function parseQO(input, query, op)  {
	if (Object.keys(input).length === 0)
		return  null;

	var  filters = [];
	op = op || 'and';
	
	for (var key in input)  {
		if (key === 'or' || key === 'and')  {
			var  f = parseQO(input[key], query, key);
			if (f)
				filters.push(f);
		}
		else  if (typeof input[key] === 'object')  {
			var  f,
				 kv = input[key];
			if (kv.op && kv.hasOwnProperty('value'))  {
				f = {name: key, op: kv.op};
				query[key] = kv.value;
			}
			else  {
				f = {name: key, op: '='};
				query[key] = kv;
				//query[key] = JSON.stringify(kv);
			}
			filters.push(f);
		}
		else  {
			var  f = {name: key, op: '='};
			filters.push( f );
			
			query[key] = input[key];
		}
	}
	
	if (filters.length > 1)
		return  {op: op, filters: filters};

	return  filters[0];
};