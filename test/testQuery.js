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


describe('Test newSQL query', function()  {

    it('SQL only query', function(done) {
    	var  sbi = newsql.sqlTemplate('Person');
    	sbi.column(['Person_id', 'name', 'gender']).
    	filter( {name: 'dob', op: '>'} );

    	var  cmd = {
    		op: 'query',
    		expr: sbi.value(),
    		query: {dob: new Date('1990-01-01')}
    	};

    	newsql.execute(cmd, function(err, result) {
    		assert.equal(result.name, 'Chris', 'Only Chris is this young');
    		done();
    	});
    });

    it('Query on non-SQL columns', function(done) {
    	var  sbi = newsql.sqlTemplate('Person');
    	sbi.column(['name', 'gender', 'weight']).
    	filter( {name: 'dob', op: '>'} );

    	var  cmd = {
    		op: 'query',
    		expr: sbi.value(),
    		query: {dob: new Date('1990-01-01')}
    	};

    	newsql.execute(cmd, function(err, result) {
    		assert.equal(result.name, 'Chris', 'Only Chris is this young');
			assert.equal(result.weight, 180, 'Chris weighted 180 pounds.');
			done();
    	});
    });

    it('Query with non-SQL conditions', function(done) {
    	var  sbi = newsql.sqlTemplate('Person'),
    		 orFilter = sbi.chainFilters('AND', [
					{name: 'dob', op: '>'},
					{name: 'weight', op: '>'}
				]);

    	sbi.column(['name', 'gender', 'weight']).
    	filter( orFilter );

    	var  cmd = {
    		op: 'query',
    		expr: sbi.value(),
    		query: {dob: new Date('1990-01-01'), weight: 150}
    	};

    	newsql.execute(cmd, function(err, result) {
    		assert.equal(result.name, 'Chris', 'Only Chris is this young');
			assert.equal(result.weight, 180, 'Chris weighted 180 pounds.');
			//console.log( JSON.stringify(result, null, 2) );
			done();
    	});
    });

    it('non-sql appears only in where condition', function(done) {
        var  sbi = newsql.sqlTemplate('Person');
        sbi.column(['Person_id', 'name', 'gender']).
        filter( {name: 'weight', op: '='} );

        var  cmd = {
            op: 'query',
            expr: sbi.value(),
            query: {weight: 130}
        };

        newsql.execute(cmd, function(err, result) {
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.name, 'Michelle', 'Michelle is 130 pounds');
            done();
        });
    });
});


describe('Test newSQL listing', function()  {

    it('SQL only listing', function(done) {
    	var  sbi = newsql.sqlTemplate('Person');
    	sbi.column(['Person_id', 'name', 'gender']).
    	filter( {name: 'dob', op: '>'} );

    	var  query = {dob: new Date('1990-01-01')};
        newsql.find(sbi.value(), query, function(err, result) {
    	//newsql.execute(cmd, function(err, result) {
    		//console.log( JSON.stringify(result, null, 2) );
    		assert.equal( result.length, 2, 'match 2 persons');
    		assert.equal( result[0].name, 'Chris', 'first match is Chris');
    		assert.equal( result[1].name, 'Donald', 'second match is Donald');
    		done();
    	});
    });

    it('Query on non-SQL columns', function(done) {
    	var  sbi = newsql.sqlTemplate('Person');
    	sbi.column(['name', 'gender', 'weight']).
    	filter( {name: 'dob', op: '>'} );

    	var  cmd = {
    		op: 'list',
    		expr: sbi.value(),
    		query: {dob: new Date('1990-01-01')}
    	};

    	newsql.execute(cmd, function(err, result) {
    		//console.log( JSON.stringify(result, null, 2) );
    		assert.equal( result.length, 2, 'match 2 persons');
    		assert.equal( result[0].name, 'Chris', 'first match is Chris');
    		assert.equal( result[1].name, 'Donald', 'second match is Donald');
			assert.equal(result[0].weight, 180, 'Chris weighted 180 pounds.');
			done();
    	});
    });

    it('Query with ANDed non-SQL conditions', function(done) {
    	var  sbi = newsql.sqlTemplate('Person'),
    		 orFilter = sbi.chainFilters('AND', [
					{name: 'dob', op: '<'},
					{name: 'weight', op: '>'}
				]);

    	sbi.column(['name', 'gender', 'weight']).
    	filter( orFilter );

    	var  cmd = {
    		op: 'list',
    		expr: sbi.value(),
    		query: {dob: new Date('1990-01-01'), weight: 150}
    	};

    	newsql.execute(cmd, function(err, result) {
    		//console.log( JSON.stringify(result, null, 2) );
    		assert.equal( result.length, 2, 'match 2 persons');
    		assert.equal( result[0].name, 'Stacy', 'first match is Stacy');
    		assert.equal( result[1].name, 'Mark', 'second match is Mark');
			done();
    	});
    });

    it('Query with ORed non-SQL conditions', function(done) {
    	var  sbi = newsql.sqlTemplate('Person'),
    		 orFilter = sbi.chainFilters('OR', [
					{name: 'dob', op: '>'},
					{name: 'weight', op: '>'}
				]);

    	sbi.column(['name', 'gender', 'weight']).
    	filter( orFilter );

    	var  cmd = {
    		op: 'list',
    		expr: sbi.value(),
    		query: {dob: new Date('1990-01-01'), weight: 150}
    	};

    	newsql.execute(cmd, function(err, result) {
    		//console.log( JSON.stringify(result, null, 2) );
    		assert.equal( result.length, 4, 'match 4 persons');
    		assert.equal( result[0].name, 'Stacy', 'first match is Stacy');
    		assert.equal( result[1].name, 'Mark', 'second match is Mark');
    		assert.equal( result[2].name, 'Chris', '3rd match is Chris');
    		assert.equal( result[3].name, 'Donald', '4th match is Donald');
			done();
    	});
    });

    it('Query with AND.OR non-SQL conditions', function(done) {
    	var  sbi = newsql.sqlTemplate('Person'),
    		 orFilter = sbi.chainFilters('OR', [
    		 		{name: 'gender', op: '='},
					{name: 'weight', op: '>'}
    		 	]);
    		 andFilter = sbi.chainFilters('AND', [
					{name: 'dob', op: '<'},
					orFilter
				]);

    	sbi.column(['name', 'gender', 'weight']).
    	filter( andFilter );

    	var  cmd = {
    		op: 'list',
    		expr: sbi.value(),
    		query: {dob: new Date('1990-01-01'), weight: 200, gender: 1}
    	};

    	newsql.execute(cmd, function(err, result) {
    		//console.log( JSON.stringify(result, null, 2) );
    		assert.equal( result.length, 6, 'match 6 persons');
    		assert.equal( result[0].name, 'Mike', 'first match is Mike');
    		assert.equal( result[1].name, 'Stacy', 'second match is Stacy');
			done();
    	});
    });

    it('Query with OR.AND non-SQL conditions', function(done) {
    	var  sbi = newsql.sqlTemplate('Person'),
    		 andFilter = sbi.chainFilters('AND', [
    		 		{name: 'gender', op: '='},
					{name: 'weight', op: '>'}
    		 	]);
    		 orFilter = sbi.chainFilters('or', [
					{name: 'dob', op: '>'},
					andFilter
				]);

    	sbi.column(['name', 'gender', 'weight']).
    	filter( orFilter );

    	var  cmd = {
    		op: 'list',
    		expr: sbi.value(),
    		query: {dob: new Date('1990-01-01'), weight: 150, gender: 1}
    	};

    	newsql.execute(cmd, function(err, result) {
    		//console.log( JSON.stringify(result, null, 2) );
    		assert.equal( result.length, 3, 'match 3 persons');
    		/*
    		assert.equal( result[0].name, 'Stacy', 'first match is Stacy');
    		assert.equal( result[1].name, 'Mark', 'second match is Mark');
    		*/
			done();
    	});
    });

    it('Listing without columns specified', function(done) {
        var  stemp = newsql.sqlTemplate('Person'),
             cmd = {
                op: 'list',
                expr: stemp.value()
             };

        newsql.execute(cmd, function(err, list) {
            //console.log( JSON.stringify(list, null, 2) );
            assert.equal(list.length, 11, 'total of 11 persons');
            assert.equal(list[10].hobby, 'reading', 'Person #10 has reading hobby');
            done();
        });
    });

    it('Listing with noSQL query and without columns specified', function(done) {
        var  stemp = newsql.sqlTemplate('Person').filter({name: 'weight', op: '>'}),
             cmd = {
                op: 'list',
                expr: stemp.value(),
                query: {weight: 150}
             };

        newsql.execute(cmd, function(err, list) {
            //console.log( JSON.stringify(list, null, 2) );
            assert.equal(list.length, 3, 'total of 3 matches');
            assert.equal(list[2].weight, 180, 'Person #3 weighted 180 pounds.');
            done();
        });
    });
});