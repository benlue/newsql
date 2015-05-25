/*!
* newsql
* authors: Ben Lue
* license: GPL 2.0
* Copyright(c) 2015 Gocharm Inc.
*/
var  assert = require('assert'),
	 qo = require('../lib/queryObj.js');

before(function() {
});


describe('Test query object', function()  {

    it('Simple', function() {
		var  input = {zip: '12345'},
			 query = {},
			 f = qo.parseQO(input, query);
		//console.log('query is\n%s', JSON.stringify(query, null, 4));
		//console.log('filter is\n%s', JSON.stringify(f, null, 4));
		assert.equal(query.zip, '12345', 'query is wrong.');
		assert.equal(f.name, 'zip', 'column name is zip');
		assert.equal(f.op, '=', 'operator is =');
	});
	
	it('and', function() {
		var  input = {zip: '12345', rooms: {op: '>', value: 3}},
			 query = {},
			 f = qo.parseQO(input, query);
		//console.log('query is\n%s', JSON.stringify(query, null, 4));
		//console.log('filter is\n%s', JSON.stringify(f, null, 4));

		assert.equal(query.zip, '12345', 'query is wrong.');
		assert.equal(query.rooms, 3, 'query rooms is 3.');
		assert.equal(f.op, 'and', 'AND contidions');
		assert.equal(f.filters.length, 2, '2 filters');
	});
	
	it('or', function() {
		var  filters = {zip: '12345', rooms: {op: '>', value: 3}},
			 input = {or: filters},
			 query = {},
			 f = qo.parseQO(input, query);
		//console.log('query is\n%s', JSON.stringify(query, null, 4));
		//console.log('filter is\n%s', JSON.stringify(f, null, 4));

		assert.equal(query.zip, '12345', 'query is wrong.');
		assert.equal(query.rooms, 3, 'query rooms is 3.');
		assert.equal(f.op, 'or', 'or contidions');
		assert.equal(f.filters.length, 2, '2 filters');
	});
	
	it('compound case #1', function() {
		var  filters = {zip: '12345', rooms: {op: '>', value: 3}},
			 input = {style: 'house', or: filters},
			 query = {},
			 f = qo.parseQO(input, query);
		//console.log('query is\n%s', JSON.stringify(query, null, 4));
		//console.log('filter is\n%s', JSON.stringify(f, null, 4));

		assert.equal(query.zip, '12345', 'query is wrong.');
		assert.equal(query.style, 'house', 'query style is house.');
		assert.equal(query.rooms, 3, 'query rooms is 3.');
		assert.equal(f.op, 'and', 'and contidions');
		assert.equal(f.filters.length, 2, '2 filters');
		assert.equal(f.filters[1].op, 'or', 'sub-query is ORed');
	});
	
	it('compound case #2', function() {
		var  filters = {zip: '12345', rooms: {op: '>', value: 3}},
			 input = {
				 or: {
					 style: 'house',
					 and: filters
				 } 
			 },
			 query = {},
			 f = qo.parseQO(input, query);
		//console.log('query is\n%s', JSON.stringify(query, null, 4));
		//console.log('filter is\n%s', JSON.stringify(f, null, 4));

		assert.equal(query.zip, '12345', 'query is wrong.');
		assert.equal(query.style, 'house', 'query style is house.');
		assert.equal(query.rooms, 3, 'query rooms is 3.');
		assert.equal(f.op, 'or', 'or contidions');
		assert.equal(f.filters.length, 2, '2 filters');
		assert.equal(f.filters[1].op, 'and', 'sub-query is ANDed');
	});
	
	it('compound case #3', function() {
		var  filters = {zip: '12345', rooms: {op: '>', value: 3}},
			 input = {
				 and: {
					 style: 'house',
					 or: filters
				 } 
			 },
			 query = {},
			 f = qo.parseQO(input, query);
		//console.log('query is\n%s', JSON.stringify(query, null, 4));
		//console.log('filter is\n%s', JSON.stringify(f, null, 4));

		assert.equal(query.zip, '12345', 'query is wrong.');
		assert.equal(query.style, 'house', 'query style is house.');
		assert.equal(query.rooms, 3, 'query rooms is 3.');
		assert.equal(f.op, 'and', 'and contidions');
		assert.equal(f.filters.length, 2, '2 filters');
		assert.equal(f.filters[1].op, 'or', 'sub-query is ORed');
	});
	
	it('compound case #4', function() {
		var  input = {
				 or: {
					 style: 'house',
					 price: {op: '>', value: 400000},
					 and: {
						 zip: '12345',
						 rooms: {op: '>', value: 3}
					 }
				 } 
			 },
			 query = {},
			 f = qo.parseQO(input, query);
		//console.log('query is\n%s', JSON.stringify(query, null, 4));
		//console.log('filter is\n%s', JSON.stringify(f, null, 4));

		assert.equal(query.zip, '12345', 'query is wrong.');
		assert.equal(query.style, 'house', 'query style is house.');
		assert.equal(query.rooms, 3, 'query rooms is 3.');
		assert.equal(f.op, 'or', 'or contidions');
		assert.equal(f.filters.length, 3, '3 filters');
		assert.equal(f.filters[2].op, 'and', 'sub-query is ANDed');
	});
	
});