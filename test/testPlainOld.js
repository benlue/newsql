/*!
* newsql
* authors: Ben Lue
* license: GPL 2.0
* Copyright(c) 2015 Gocharm Inc.
*/
var  assert = require('assert'),
	 newsql = require('../lib/newsql.js');

before(function() {
	var  option = {
		dbConfig: {
			"host"     : "127.0.0.1",
			"database" : "nstest",
			"user"     : "my_acc",
			"password" : "my_passwd",
			"supportBigNumbers" : true,
			"connectionLimit"   : 32
		},
		queryLimit: 100,
		autoConvert: false
	};

    newsql.config(option);
});


describe('Test if newsql works with plain old SQL tables', function()  {

	it('Insert', function(done) {
		var  data = {name: 'David', dob: '1988-12-05', gender: 1, skill: ['node.js', 'Java'], weight: 80};

		newsql.insert('PersonSQL', data, function(err, pk) {
			//console.log('new entity id is %d', id);
			assert(pk.Person_id, 'should return the primary key');
			done();
		});
	});

	it('Delete', function(done) {
		var  filter = {name: 'Person_id', op: '>'},
			 query = {Person_id: 11};

		newsql.del('PersonSQL', filter, query, function(err, result) {
			//assert(!err, 'cannot delete successfully');
			//console.log(JSON.stringify(result, null, 2));
			done();
		});
	});

	it('SQL only query', function(done) {
    	var  stemp = newsql.sqlTemplate('PersonSQL');
    	stemp.column(['Person_id', 'name', 'gender']).
    	filter( {name: 'dob', op: '>'} );

    	var  cmd = {
    		op: 'query',
    		expr: stemp.value(),
    		query: {dob: new Date('1990-01-01')}
    	};

    	newsql.execute(cmd, function(err, result) {
    		assert.equal(result.name, 'Chris', 'Only Chris is this young');
    		done();
    	});
    });

    it('Update', function(done) {
		var  filter = {name: 'Person_id', op: '='},
			 data = {dob: '1992-04-01'},
			 query = {Person_id: 7};

		newsql.update('PersonSQL', data, filter, query, function(err) {
			var  stemp = newsql.sqlTemplate('PersonSQL');
	    	stemp.column(['dob']).
	    	filter( {name: 'Person_id', op: '='} );

	    	var  qcmd = {
		    		op: 'query',
		    		expr: stemp.value()
	    		 },
	    		 query = {Person_id: 7};

	    	newsql.execute(qcmd, query, function(err, result) {
	    		assert.equal(result.dob.toString().indexOf('Wed Apr 01'), 0, 'dob not correct');

	    		data = {dob: '1992-04-21'};
	    		newsql.update('PersonSQL', data, filter, query, function(err) {
	    			done();
	    		});
	    	});
		});
	});
});