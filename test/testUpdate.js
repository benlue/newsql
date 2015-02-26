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
			var  sbi = newsql.sqlTemplate('Person');
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

describe('Test newSQL update', function()  {
	it('Insert & update with transactions', function(done) {
		var  data = {name: 'David', dob: '1988-12-05', gender: 1, skill: ['node.js', 'Java'], weight: 80},
			 cmd = {op: 'insert', entity: 'Person', data: data};

		newsql.getConnection(function(err, conn) {
			assert(!err, 'Failed to get connection');

			cmd.conn = conn;
			conn.beginTransaction(function(err) {
				assert(!err, 'Failed to begin transaction');

				newsql.insert(cmd, function(err, pk) {
					assert(!err, 'Failed to insert');
					//console.log('new entity id is %s', JSON.stringify(pk, null, 4));

					var  filter = {name: 'Person_id', op: '='},
						 delCmd = {op: 'delete', entity: 'Person', filter: filter, query: pk, conn: conn};

					newsql.del(delCmd, function(err) {
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
			 cmd = {op: 'update', entity: 'Person', data: data, filter: andFilter, query: query};

		newsql.getConnection(function(err, conn) {
			assert(!err, 'Failed to get connection');

			cmd.conn = conn;
			conn.beginTransaction(function(err) {
				assert(!err, 'Failed to begin transaction');

				newsql.update(cmd, function(err) {
					var  sqlExpr = newsql.sqlTemplate('Person').column(['dob']).
			    	filter( {name: 'Person_id', op: '='} ).value();

			    	var  qcmd = {
			    		op: 'query',
			    		expr: sqlExpr,
			    		query: {Person_id: 7},
			    		conn: conn
			    	};

			    	newsql.execute(qcmd, function(err, result) {
			    		assert.equal(result.dob.toString().indexOf('Wed Apr 01'), 0, 'dob not correct');

			    		cmd.data = {dob: '1992-04-21'};
			    		newsql.update(cmd, function(err) {
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