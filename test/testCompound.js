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


describe('Test compunded query conditions', function()  {

    it('AND-OR', function(done) {
    	var  orFilter = newsql.chainFilters('OR', [
	    		 			{name: 'salary', op: '>'},
	    		 			{name: 'weight', op: '<'}
    		 			]),
    		 andFilter = newsql.chainFilters('AND', [
    		 				orFilter,
    		 				{name: 'gender', op: '&'}
    		 			]),
             expr = newsql.sql('Person')
                          .column(['Person_id', 'name', 'gender'])
    	                  .filter( andFilter );
    			   
    	var  cmd = {
    		op: 'list',
    		expr: expr.value()
    	},
        query = {salary: 100000, weight: 200, gender: 1};

    	newsql.execute(cmd, query, function(err, list) {
    		//console.log(JSON.stringify(list, null, 4));
    		assert.equal(list.length, 5, '5 matches');
    		done();
    	});
    });
 
    it('AND-OR case #2', function(done) {
    	var  stemp = newsql.sqlTemplate('Person')
    					   .column(['Person_id', 'name', 'gender']),
    		 orFilter = newsql.chainFilters('OR', [
	    		 			{name: 'salary', op: '>'},
	    		 			{name: 'gender', op: '&'}
    		 			]),
    		 andFilter = newsql.chainFilters('AND', [
    		 				orFilter,
    		 				{name: 'weight', op: '<'}
    		 			]);
    	stemp.filter( andFilter );
    			   
    	var  cmd = {
    		op: 'list',
    		expr: stemp.value()
    	},
        query = {salary: 100000, weight: 200, gender: 1}

    	newsql.execute(cmd, query, function(err, list) {
    		//console.log(JSON.stringify(list, null, 4));
    		assert.equal(list.length, 4, '4 matches');
    		done();
    	});
    });

    it('OR-AND', function(done) {
    	var  stemp = newsql.sqlTemplate('Person')
    					   .column(['Person_id', 'name', 'gender']),
    		 orFilter = stemp.chainFilters('AND', [
	    		 			{name: 'salary', op: '>'},
	    		 			{name: 'weight', op: '<'}
    		 			]),
    		 andFilter = stemp.chainFilters('OR', [
    		 				orFilter,
    		 				{name: 'gender', op: '&'}
    		 			]);
    	stemp.filter( andFilter );
    			   
    	var  cmd = {
    		op: 'list',
    		expr: stemp.value()
    	},
        query = {salary: 100000, weight: 200, gender: 1};

    	newsql.execute(cmd, query, function(err, list) {
    		//console.log(JSON.stringify(list, null, 4));
    		assert.equal(list.length, 8, '8 matches');
    		done();
    	});
    });

    it('OR-AND case #2', function(done) {
    	var  stemp = newsql.sqlTemplate('Person')
    					   .column(['Person_id', 'name', 'gender']),
    		 orFilter = stemp.chainFilters('AND', [
	    		 			{name: 'gender', op: '&'},
	    		 			{name: 'weight', op: '<'}
    		 			]),
    		 andFilter = stemp.chainFilters('OR', [
    		 				orFilter,
    		 				{name: 'salary', op: '>'}
    		 			]);
    	stemp.filter( andFilter );
    			   
    	var  cmd = {
    		op: 'list',
    		expr: stemp.value()
    	},
        query = {salary: 100000, weight: 200, gender: 1}

    	newsql.execute(cmd, query, function(err, list) {
    		//console.log(JSON.stringify(list, null, 4));
    		assert.equal(list.length, 7, '7 matches');
    		done();
    	});
    });

});