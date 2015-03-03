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

describe('Test newSQL update', function()  {
	it('Insert', function(done) {
		var  data = {name: 'David', dob: '1988-12-05', gender: 1, skill: ['node.js', 'Java'], weight: 80};

		newsql.insert('Person', data, function(err, pk) {
			//console.log('new entity id is %d', id);
			assert(pk.Person_id, 'should return the primary key');
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
			var  stemp = newsql.sqlTemplate('Person');
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
	    		newsql.update('Person', data, orFilter, query, function(err) {
	    			done();
	    		});
	    	});
		});
	});
});

describe('Test newSQL update', function()  {
	it('Insert & update with transactions', function(done) {
		var  data = {name: 'David', dob: '1988-12-05', gender: 1, skill: ['node.js', 'Java'], weight: 80},
			 cmd = {op: 'insert', expr: newsql.sqlTemplate('Person').value()};

		newsql.getConnection(function(err, conn) {
			assert(!err, 'Failed to get connection');

			cmd.conn = conn;
			conn.beginTransaction(function(err) {
				assert(!err, 'Failed to begin transaction');

				newsql.insert(cmd, data, function(err, pk) {
					assert(!err, 'Failed to insert');
					//console.log('new entity id is %s', JSON.stringify(pk, null, 4));

					var  stemp = newsql.sqlTemplate('Person');
					stemp.filter({name: 'Person_id', op: '='});

					var  delCmd = {op: 'delete', expr: stemp.value(), conn: conn};

					newsql.del(delCmd, pk, function(err) {
						assert(!err, 'cannot delete successfully');
						conn.commit(function(err) {
							assert(!err, 'Failed to commit');
							done();
						});
					});
				});
			});
		});
	});

	it('Update with transaction', function(done) {
		var  andFilter = {op: 'and', filters: [
					{name: 'gender', op: '='},
					{name: 'weight', op: '>='}
				]},
			 data = {dob: '1992-04-01'},
			 query = {weight: 180, gender: 1},
			 stemp = newsql.sqlTemplate('Person');

		stemp.filter( andFilter );
		var  cmd = {op: 'update', expr: stemp.value()};

		newsql.getConnection(function(err, conn) {
			assert(!err, 'Failed to get connection');

			cmd.conn = conn;
			conn.beginTransaction(function(err) {
				assert(!err, 'Failed to begin transaction');

				newsql.update(cmd, data, query, function(err) {
					var  sqlExpr = newsql.sqlTemplate('Person').column(['dob']).
			    	filter( {name: 'Person_id', op: '='} ).value();

			    	var  qcmd = {
				    		op: 'query',
				    		expr: sqlExpr,
				    		conn: conn
			    		 },
			    		 query = {Person_id: 7};

			    	newsql.execute(qcmd, query, function(err, result) {
			    		assert.equal(result.dob.toString().indexOf('Wed Apr 01'), 0, 'dob not correct');

			    		newsql.update(cmd, {dob: '1992-04-21'}, query, function(err) {
			    			assert(!err, 'cannot update successfully');
							conn.commit(function(err) {
								assert(!err, 'Failed to commit');
								done();
							});
			    		});
			    	});
				});
			});
		});
	});
});