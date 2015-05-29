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
		var  query = {weight: {op: '<', value: 100}};

		newsql.del('Person', query, function(err, result) {
			//assert(!err, 'cannot delete successfully');
			//console.log(JSON.stringify(result, null, 2));
			done();
		});
	});

	it('Update', function(done) {
		var  data = {dob: '1992-04-01'},
			 query = {
				 weight: {op: '>=', value: 180},
				 gender: 1
			 };

		newsql.update('Person', data, query, function(err) {
			var  expr = newsql.sql('Person')
	    					  .column(['dob'])
							  .filter({name: 'Person_id', op: '='});

	    	var  qcmd = {
		    		op: 'query',
		    		expr: expr.value()
	    		 },
	    		 query = {Person_id: 7};

	    	newsql.execute(qcmd, query, function(err, result) {
				//console.log(JSON.stringify(result, null, 4));
	    		assert.equal(result.dob.toString().indexOf('Wed Apr 01'), 0, 'dob not correct');

	    		data = {dob: '1992-04-21'};
	    		newsql.update('Person', data, query, function(err) {
	    			done();
	    		});
	    	});
		});
	});

	it('update part of the non-SQL columns', function(done) {
		var  data = {hobby: 'hiking'},
			 query = {Person_id: 9};

		newsql.update('Person', data, query, function(err) {
			newsql.find('Person', query, function(err, result) {
	    		assert.equal(result[0].weight, 130, 'weight is not changed');
	    		assert.equal(result[0].hobby, 'hiking', 'hobby becomes hiking');

	    		data.hobby = 'music';
	    		newsql.update('Person', data, query, function(err) {
	    			done();
	    		});
	    	});
		});
	});
	
	it('Update with restriected columns', function(done) {
		var  expr = newsql.sql('Person')
						  .column(['gender'])
						  .filter({name: 'Person_id', op: '='}),
			 data = {name: 'Maria', gender: 0, hobby: 'jogging'},
			 query = {Person_id: 1},
			 cmd = {
				 op: 'update',
				 expr: expr.value()
			 };

		newsql.execute(cmd, data, query, function(err) {
			var  expr = newsql.sql('Person')
	    					  .column(['dob'])
							  .filter({name: 'Person_id', op: '='});

	    	newsql.findOne('Person', query, function(err, result) {
				//console.log(JSON.stringify(result, null, 4));
	    		assert.equal(result.name, 'Mike', 'name should not changed');
				assert.equal(result.gender, 0, 'gender should be changed!');
				assert(!result.hobby, 'hobby should not be saved');

	    		data = {gender: 1};
	    		newsql.execute(cmd, data, query, function(err) {
	    			done();
	    		});
	    	});
		});
	});

});


describe('Update with transactons', function()  {
	
	it('Insert & delete with transactions', function(done) {
		var  data = {name: 'David', dob: '1988-12-05', gender: 1, skill: ['node.js', 'Java'], weight: 80},
			 cmd = {op: 'insert', expr: newsql.sqlTemplate('Person').value()};

		newsql.getConnection(function(err, conn) {
			assert(!err, 'Failed to get connection');

			cmd.conn = conn;
			conn.beginTransaction(function(err) {
				assert(!err, 'Failed to begin transaction');

				newsql.execute(cmd, data, null, function(err, pk) {
					assert(!err, 'Failed to insert');
					//console.log('new entity id is %s', JSON.stringify(pk, null, 4));

					var  stemp = newsql.sqlTemplate('Person');
					stemp.filter({name: 'Person_id', op: '='});

					var  delCmd = {op: 'delete', expr: stemp.value(), conn: conn};

					newsql.execute(delCmd, pk, function(err) {
						assert(!err, 'cannot delete successfully');
						conn.commit(function(err) {
							conn.release();
							assert(!err, 'Failed to commit');
							done();
						});
					});
				});
			});
		});
	});

	it('Update with transaction', function(done) {
		var  data = {dob: '1992-04-01'},
			 filter = newsql.chainFilters('and',
			 	[
					 {name: 'weight', op: '>='},
					 {name: 'gender', op: '='},
					 {name: 'Person_id', op: '='}
				]
			 ),
			 query = {weight: 180, gender: 1},
			 expr = newsql.sql('Person').filter(filter);
			 
		var  cmd = {op: 'update', expr: expr.value()};

		newsql.getConnection(function(err, conn) {
			assert(!err, 'Failed to get connection');

			cmd.conn = conn;
			conn.beginTransaction(function(err) {
				assert(!err, 'Failed to begin transaction');

				newsql.execute(cmd, data, query, function(err) {
					var  sqlExpr = newsql.sql('Person')
										 .column(['dob'])
										 .filter({name: 'Person_id', op: '='});

			    	var  qcmd = {
				    		op: 'query',
				    		expr: sqlExpr.value(),
				    		conn: conn
			    		 },
			    		 query = {Person_id: 7};

			    	newsql.execute(qcmd, query, function(err, result) {
			    		assert.equal(result.dob.toString().indexOf('Apr 01'), 4, 'dob not correct');

			    		newsql.execute(cmd, {dob: '1992-04-21'}, query, function(err) {
			    			assert(!err, 'cannot update successfully');
							conn.commit(function(err) {
								conn.release();
								assert(!err, 'Failed to commit');
								done();
							});
			    		});
			    	});
				});
			});
		});
	});
	
	it.skip('temp', function(done) {
		var  filter = newsql.chainFilters('and',
			 	[
					 {name: 'weight', op: '>='},
					 {name: 'gender', op: '='}
				]
			 ),
			 query = {weight: 180, gender: 1},
			 expr = newsql.sql('Person').filter(filter);
			 
		var  cmd = {op: 'list', expr: expr.value()};

    	newsql.execute(cmd, query, function(err, result) {
			console.log(JSON.stringify(result, null, 4));
    		//assert.equal(result.dob.toString().indexOf('Apr 21'), 4, 'dob not correct');
			done();
    	});
	});
});