var  assert = require('assert'),
	 jsonQ = require('../jsonQuery.js');

describe('SQL query to JSON-FP query', function()  {

    it('Simple query', function() {
    	var  filter = {name: 'id', op: '='},
    		 qvalue = {id: 8},
    		 jexpr = jsonQ.toJsonExpr(filter, qvalue);

    	//console.log( JSON.stringify(jexpr, null, 4) );
    	assert.equal( jexpr.chain.length, 2, 'chained 2 exprs');
    	assert.equal( jexpr.chain[0].getter, 'id', 'get id');
    	assert.equal( jexpr.chain[1]['=='], 8, 'set to 8');
    });

    it('ANDed query', function()  {
    	var  filter = {
    		op: 'AND',
    		filters: [
    			{name: 'id', op: '='},
    			{name: 'age', op: '>'},
    			{name: 'owner', op: 'IS NOT NULL', noArg: true}
    		]
    	},
    	qvalue = {id: 8, owner: true},
    	jexpr = jsonQ.toJsonExpr(filter, qvalue);
    	//console.log( JSON.stringify(jexpr, null, 4) );

    	var  chain = jexpr.chain;
    	assert(chain[0].id, 'query the id property');
    	assert(chain[0].owner, 'query the owner property');
    	assert(chain[1]['and'], 'logical and');
    });

    it('ORed query', function()  {
    	var  filter = {
    		op: 'OR',
    		filters: [
    			{name: 'id', op: '='},
    			{name: 'age', op: '>'},
    			{name: 'owner', op: 'IS NOT NULL', noArg: true}
    		]
    	},
    	qvalue = {id: 8, owner: true},
    	jexpr = jsonQ.toJsonExpr(filter, qvalue);
    	//console.log( JSON.stringify(jexpr, null, 4) );

    	var  chain = jexpr.chain;
    	assert(chain[0].id, 'query the id property');
    	assert(chain[0].owner, 'query the owner property');
    	assert(chain[1]['or'], 'logical or');
    });

    it('compound query', function()  {
    	var  filter = {
    		op: 'AND',
    		filters: [
    			{name: 'id', op: '='},
    			{
    				op: 'OR',
    				filters: [
    					{name: 'age', op: '>'},
    					{name: 'owner', op: 'IS NOT NULL', noArg: true}
    				]
    			}
    		]
    	},
    	qvalue = {id: 8, age: 18, owner: true},
    	jexpr = jsonQ.toJsonExpr(filter, qvalue);
    	//console.log( JSON.stringify(jexpr, null, 4) );

    	var  chain = jexpr.chain,
    		 subChain = chain[0]['or']['chain'];
    	assert(chain[0].id, 'query the id property');
    	assert(chain[0]['or'], 'logical or');
    	assert(subChain[0]['age'], 'or age');
    	assert(subChain[0]['owner'], 'or owner');
    	assert(chain[1]['and'], 'logical and');
    });
});