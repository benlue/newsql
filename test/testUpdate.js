/*!
* newsql
* authors: Ben Lue
* license: GPL 2.0
* Copyright(c) 2015 Gocharm Inc.
*/
var  assert = require('assert'),
	 newsql = require('../lib/newsql.js'),
	 soar;

before(function() {
    newsql.config();
    soar = newsql.getSOAR();
    //soar.setDebug( true );
});

describe('Test newSQL update', function()  {
	it('Insert', function(done) {
		var  data = {name: 'David', dob: '1988-12-05', gender: 1, skill: ['node.js', 'Java'], weight: 80};

		newsql.insert('Person', data, function(err, id) {
			//console.log('new entity id is %d', id);
			done();
		});
	});

	it('Delete', function(done) {
		var  filter = {name: 'weight', op: '<'},
			 query = {weight: 100};

		newsql.del('Person', filter, query, function(err, result) {
			//assert(!err, 'cannot delete successfully');
			//console.log(JSON.stringify(result, null, 2));
			done();
		});
	});

	it('Update', function(done) {
		var  orFilter = {op: 'and', filters: [
					{name: 'gender', op: '='},
					{name: 'weight', op: '>='}
				]},
			 data = {dob: '1992-04-01'},
			 query = {weight: 180, gender: 1};

		newsql.update('Person', data, orFilter, query, function(err) {
			var  sbi = soar.sqlBuildInfo('Person');
	    	sbi.column(['dob']).
	    	filter( {name: 'Person_id', op: '='} );

	    	var  qcmd = {
	    		op: 'query',
	    		expr: sbi.value(),
	    		query: {Person_id: 7}
	    	};

	    	newsql.execute(qcmd, function(err, result) {
	    		assert.equal(result.dob.toString().indexOf('Wed Apr 01'), 0, 'dob not correct');

	    		data = {dob: '1992-04-21'};
	    		newsql.update('Person', data, orFilter, query, function(err) {
	    			done();
	    		});
	    	});
		});
	});
});