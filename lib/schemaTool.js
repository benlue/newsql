/*!
* newsql
* authors: Ben Lue
* license: GPL 2.0
* Copyright(c) 2015 Gocharm Inc.
*/
var  soar = require('sql-soar');

var  dftDB = '_db',
	 _pool = {};

exports.getSchema = function(tbName, cb)  {
	var  dbName = dftDB,
		 idx = tbName.indexOf('.');
	if (idx > 0)  {
		dbName = tbName.substring(0, idx);
		tbName = tbName.substring(idx+1);
	}

	var  schPool = _pool[dbName];
	if (!schPool)
		_pool[dbName] = schPool = {};

	var  schema = schPool[tbName];
	if (schema)
		cb(null, schema);
	else  {
		if (idx > 0)  {
			soar.getConnection(dbName, function(err, conn)  {
				if (err)
					cb(err);
				else  {
					soar.describeTable(conn, tbName, function(err, schema) {
						if (err)
							cb(err);
						else  if (schema)  {
							schema.columns = Object.keys(schema.columns);
							schPool[tbName] = schema;
							cb(null, schema);
						}
						else
							cb( new Error('Cannot find schema of ' + tbName) );
					});
				}
			});
		}
		else  {
			soar.getConnection(function(err, conn)  {
				if (err)
					cb(err);
				else  {
					soar.describeTable(conn, tbName, function(err, schema) {
						if (err)
							cb(err);
						else  if (schema)  {
							schema.columns = Object.keys(schema.columns);
							schPool[tbName] = schema;
							cb(null, schema);
						}
						else
							cb( new Error('Cannot find schema of ' + tbName) );
					});
				}
			});
		}
	}
};


exports.invalidateCache = function(tbName)  {
	var  dbName = dftDB,
		 idx = tbName.indexOf('.');
	if (idx > 0)  {
		dbName = tbName.substring(0, idx);
		tbName = tbName.substring(idx+1);
	}

	var  schPool = _pool[dbName];
	if (schPool)
		delete  schPool[tbName];

	for (var key in schPool)
		if (schPool[key].title === tbName)  {
			delete  schPool[key];
			break;
		}
};


exports.primaryKeyFilter = function(schema)  {
	var  pk = schema.primary,
		 filter = [];

	for (var i in pk)
		filter.push({name: pk[i], op: '='});

	return  filter.length === 1  ?  filter[0] : {op: 'or', filters: filter};
};