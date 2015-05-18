/*!
* newsql
* authors: Ben Lue
* license: GPL 2.0
* Copyright(c) 2015 Gocharm Inc.
*/
var  assert = require('assert'),
	 newsql = require('../lib/newsql.js');

before(function() {
    newsql.config();
});


describe('Test join', function()  {

    it('Join with field names fully specified', function(done) {
    	var  stemp = newsql.sql('Person AS psn')
                    	   .join({table: 'Company AS cpy', onWhat: 'psn.workFor = cpy.Company_id'})
                    	   .column(['psn.Person_id', 'psn.name', 'psn.hobby', 'cpy.name as company', 'cpy.size'])
                    	   .filter({name: 'weight', op: '>'});

    	newsql.find(stemp, {weight: 150}, function(err, result) {
    		//console.log(JSON.stringify(result, null, 2));
    		assert.equal(result.length, 4, '4 matches');
    		assert.equal(result[0].company, 'COIMOTION', 'Person #1 work for COIMOTION');
    		//assert.equal(result[2].company, 'Tesla', 'Person #3 work for Tesla');
    		done();
    	});
    });

    it('Join with field names NOT fully specified', function(done) {
    	// note: any column without table name annotated will be attributed to the main table
    	var  stemp = newsql.sql('Person AS psn')
                    	   .join({table: 'Company AS cpy', onWhat: 'psn.workFor = cpy.Company_id'})
                    	   .column(['Person_id', 'psn.name', 'hobby', 'cpy.name as company', 'cpy.tel', 'cpy.size AS companySize'])
                    	   .filter({name: 'weight', op: '>'});

    	newsql.find(stemp, {weight: 150}, function(err, result) {
    		//console.log(JSON.stringify(result, null, 2));
    		assert.equal(result.length, 4, '4 matches');
    		assert.equal(result[0].company, 'COIMOTION', 'Person #1 work for COIMOTION');
    		assert.equal(result[0].tel, '408-970-1248', 'Work phone number of person #1 is 408-970-1248');
    		assert.equal(result[0].companySize, '4800', 'Person #1 work for company whose size is 4800');
    		//assert.equal(result[2].company, 'Tesla', 'Person #3 work for Tesla');
    		done();
    	});
    });

    it('Query on joined tables', function(done) {
    	var  stemp = newsql.sqlTemplate('Person AS psn')
                    	   .join({table: 'Company AS cpy', onWhat: 'psn.workFor = cpy.Company_id'})
                    	   .column(['Person_id', 'psn.name', 'hobby', 'cpy.name as company', 'cpy.stock'])
                    	   .filter({name: 'cpy.stock', op: '>'});

    	newsql.find(stemp, {'cpy.stock': 100}, function(err, result) {
    		//console.log(JSON.stringify(result, null, 2));
    		assert.equal(result.length, 5, '5 matches');
    		assert.equal(result[1].company, 'Apple Inc.', 'Person #2 work for Apple Inc.');
    		assert.equal(result[1].stock, 120, 'Apple stock was $120');
    		done();
    	});
    });

    it('Query on aliased non-sql columns of joined tables', function(done) {
    	var  stemp = newsql.sql('Person AS psn')
                    	   .join({table: 'Company AS cpy', onWhat: 'psn.workFor = cpy.Company_id'})
                    	   .column(['Person_id', 'psn.name', 'hobby', 'cpy.name as company', 'cpy.stock AS stock'])
                    	   .filter({name: 'cpy.stock', op: '>'});

    	newsql.find(stemp, {'cpy.stock': 100}, function(err, result) {
    		//console.log(JSON.stringify(result, null, 2));
    		assert.equal(result.length, 5, '5 matches');
    		assert.equal(result[1].company, 'Apple Inc.', 'Person #2 work for Apple Inc.');
    		assert.equal(result[1].stock, 120, 'Apple stock was $120');
    		done();
    	});
    });

    it('Mixed joined query', function(done) {
    	var  filter = newsql.chainFilters('AND', [
    		 			{name: 'cpy.stock', op: '>'},
    		 			{name: 'gender', op: '='},
    		 			{name: 'hobby', op: '='}
    		 		  ]),
             expr = newsql.sqlTemplate('Person AS psn')
                    	  .join({table: 'Company AS cpy', onWhat: 'psn.workFor = cpy.Company_id'})
                    	  .column(['Person_id', 'psn.name', 'hobby AS hb', 'cpy.name as company', 'cpy.stock'])
                    	  .filter( filter );

    	var  query = {'cpy.stock': 100, gender: 1, hobby: 'reading'};

    	newsql.find(expr, query, function(err, result) {
    		//console.log(JSON.stringify(result, null, 2));
    		assert.equal(result.length, 1, '1 match');
    		assert.equal(result[0].name, 'Roger', 'match the person Roger');
    		assert.equal(result[0].stock, 880, 'company stock is $880');
    		done();
    	});
    });
});