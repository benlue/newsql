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


describe('Test schema management', function()  {

    it('Create and delete collection', function(done) {
    	newsql.createCollection('Document', function(err) {
    		assert(!err, 'Creation failed');

            newsql.describeTable('Document', function(err, schema) {
                assert(!err, 'Failed to find table schema');

                //console.log( JSON.stringify(schema, null, 4) );
                assert.equal( schema.title, 'Document', 'Collection name is Document');
                assert( schema.columns.id, 'id is a default column');
                assert( schema.columns._c_json, '_c_json is a default column');

                newsql.dropCollection('Document', function(err) {
                    assert(!err, 'Drop failed');
                    done();
                });
            });
    	});
    });

    it('Alter table -- add', function(done) {
        var  alterSchema = {
            title: 'Person',
            add: {
                column: {
                    age: {type: 'integer'}
                }
            }
        };

        newsql.alterTable( alterSchema, function(err) {
            assert(!err, 'Failed to alter table');

            newsql.describeTable('Person', function(err, schema) {
                assert(!err, 'Failed to find table schema');
                assert( schema.columns.age, 'age is the newly added column');
                done();
            });
        });
    });

    it('Alter table -- delete', function(done) {
        var  alterSchema = {
            title: 'Person',
            drop: {
                column: ['age']
            }
        };

        newsql.alterTable( alterSchema, function(err) {
            assert(!err, 'Failed to alter table');

            newsql.describeTable('Person', function(err, schema) {
                assert(!err, 'Failed to find table schema');
                assert(!schema.columns.age, 'age is no longer a column');
                done();
            });
        });
    });
});

describe('Indexing document', function()  {

    it('Index a document property', function(done) {
        newsql.indexProperty('PersonDoc', 'weight', {type: 'integer'}, function(err) {
            assert(!err, 'Failed to index property');
            done();
        });
    });

    it('Remove an index', function(done) {
        newsql.removeIndex('PersonDoc', 'weight', function(err) {
            assert(!err, 'Failed to remove property index');
            done();
        });
    });
});