/*!
* newsql
* authors: Ben Lue
* license: GPL 2.0
* Copyright(c) 2015 Gocharm Inc.
*/
var  _ = require('lodash'),
	 async = require('async'),
	 fs = require('fs'),
	 jsonQ = require('./jsonQuery.js'),
	 qo = require('./queryObj.js'),
	 path = require('path'),
	 soar = require('sql-soar'),
	 schemaTool = require('./schemaTool.js');

var  _queryPageSize = 100,
	 _autoConvert = true;	// turn on 'auto-convert' by default.

//soar.setDebug( true );

exports.config= function(option)  {
	if (!option)  {
		var  configFile = path.join(__dirname, '../config.json');
		option = JSON.parse( fs.readFileSync(configFile) );
	}

	_autoConvert = option.autoConvert || _autoConvert;
	soar.config(option);
};


exports.getConnection = function(cb)  {
	soar.getConnection(function(err, conn) {
		if (err)
			cb(err);
		else  {
			if (!conn.inTransaction)  {
				var  startTrans = conn.beginTransaction,
					 commit = conn.commit,
					 rollback = conn.rollback;

				conn.beginTransaction = function(cb)  {
					this.inTrans = true;
					startTrans.call(conn, cb);
				};

				conn.commit = function(cb)  {
					this.inTrans = false;
					commit.call(conn, cb);
				};

				conn.rollback = function(cb)  {
					this.inTrans = false;
					rollback.call(conn, cb);
				};

				conn.inTransaction = function()  {
					return  this.inTrans;
				};
			}
			cb(null, conn);
		}
	});
};


exports.sql = function(tbName)  {
	return  soar.sql(tbName);
};


/**
 * This function is deprecated in favor of newsql.sql()
 */
exports.sqlTemplate = function(tbName)  {
	return  soar.sql(tbName);
};


exports.chainFilters = function(op, filters)  {
	return  {op: op, filters: filters};
};


/*
* Get table schema.
*/
exports.getSchema = function(tbName, cb)  {
	schemaTool.getSchema(tbName, cb);
};


/**
 * Create a table in NoSQL style.
 */
exports.createCollection = function(conn, name, cb)  {
	if (arguments.length === 2)  {
		cb = name,
		name = conn;
		conn = null;
	}

	// create a default schema for this collection/table
	var  schema = {
			title: name,
			columns: {
				id: {type: 'serial'},
				_c_json: {type: 'string', format: 'text'}
			},
			primary: ['id'],
			options: {
				engine: 'InnoDB'
			}
		 };

	exports.createTable( conn, schema, cb );
};


/**
 * Remove a table in NoSQL style.
 */
exports.dropCollection = function(conn, name, cb)  {
	if (arguments.length === 2)  {
		cb = name,
		name = conn;
		conn = null;
	}

	exports.dropTable(conn, name, cb);
};


/**
 * index a non-sql property in a collection (document).
 */
exports.indexProperty = function(docName, propName, propType, cb)  {
	var  index = {};
	index['IDX_' + propName] = {columns: [propName]};

	var  alterSchema = {
		title: docName,
		add: {
			column: {},
			index: index
		}
	};
	alterSchema.add.column[propName] = propType;
	addColumn(alterSchema, propName, cb);
};


/**
 * promote a non-sql property to be a major property (sql proeprty), but does not index it. 
 */
exports.toMajorProperty = function(docName, propName, propType, cb)  {
	var  alterSchema = {
		title: docName,
		add: {
			column: {}
		}
	};
	alterSchema.add.column[propName] = propType;
	addColumn(alterSchema, propName, cb);
};
	
	
function  addColumn(alterSchema, propName, cb)  {
	var  docName = alterSchema.title;
	
	exports.alterTable( alterSchema, function(err) {
		if (err)
			cb(err);
		else  {
			// move every 'propName' property from the JSON column to the SQL column
			var  qExpr = soar.sqlTemplate(docName).column(['id', '_c_json']).value(),
				 updExpr = soar.sqlTemplate(docName).column([propName, '_c_json']).
				 				filter({name: 'id', op: '='}).value(),
				 cmd = {
				 	op: 'list',
				 	expr: qExpr
				 };

			soar.execute(cmd, null, null, function(err, list) {
				if (err)  {
					console.log( err.stack );
					cb(err);
				}
				else  {
					exports.getConnection(function(err, conn)  {
						if (err)
							cb(err);
						else  {
							var  updCmd = {op: 'update', expr: updExpr, conn: conn};

							// we may update multiple items, so let's do a transaction
							conn.beginTransaction(function(err) {
					            if (err)
					                cb(err);
					            else  {
					            	async.each(list, function(data, cb) {
					            		if (data._c_json)
											try  {
												var  jobj = JSON.parse(data._c_json);
												if (jobj.hasOwnProperty(propName))  {
													var  updData = {};
													updData[propName] = jobj[propName];
													delete jobj[propName];
													updData['_c_json'] = JSON.stringify(jobj);

													soar.execute( updCmd, updData, data, function(err) {
														cb( err );
													});
												}
												else
													// nothing to do
													cb( null );
											}
											catch(err)  {
												cb(err);
											}
										else
											cb( null );
									},
									function(err)  {
										if (err)  {
											console.log( err.stack );
											conn.rollback();
										}
										else
											conn.commit();
										conn.release();
										cb( err );
									});
					            }
					        });
						}
					});
				}
			});
		}
	});
};


/**
 * Remove an index from a collection (document).
 */
exports.removeIndex = function(docName, propName, cb)  {
	var  qExpr = soar.sqlTemplate(docName).column(['id', propName, '_c_json']).value(),
		 updExpr = soar.sqlTemplate(docName).column('_c_json').
		 				filter({name: 'id', op: '='}).value(),
		 cmd = {
		 	op: 'list',
		 	expr: qExpr
		 };

	soar.execute(cmd, function(err, list) {
		if (err)  {
			console.log( err.stack );
			cb(err);
		}
		else  {
			exports.getConnection(function(err, conn)  {
				if (err)
					cb(err);
				else  {
					var  updCmd = {op: 'update', expr: updExpr, conn: conn};

					// we may update multiple items, use transaction
					conn.beginTransaction(function(err) {
			            if (err)
			                cb(err);
			            else  {
			            	async.each(list, function(data, cb) {
			            		if (data[propName] !== null)
				            		try  {
				            			var  jobj = data._c_json ? JSON.parse( data._c_json ) : {};
				            			jobj[propName] = data[propName];

				            			var  updData = {_c_json: JSON.stringify(jobj)};
										soar.execute( updCmd, updData, data, function(err) {
											cb( err );
										});
				            		}
				            		catch(err) {
				            			cb(err);
				            		}
				            	else
				            		// do nothing
				            		cb(null);
			            	},
			            	function(err)  {
								if (err)  {
									console.log( err.stack );
									conn.rollback();
									conn.release();
									cb(err);
								}
								else  {
									conn.commit();
									conn.release();

									// drop the column and index
									var  alterSchema = {
										title: docName,
										drop: {
											column: [propName],
											index: ['IDX_' + propName]
										}
									};

									exports.alterTable( alterSchema, function(err) {
										cb(err);
									});
								}
							});
			            }
			        });
				}
			});
		}
	});
};


/**
 * Create a new table.
 */
exports.createTable = function(conn, schema, cb)  {
	if (arguments.length === 2)  {
		cb = schema,
		schema = conn;
		conn = null;
	}
	
	soar.createTable(conn, schema, cb);
};


exports.alterTable = function(conn, schema, cb)  {
	if (arguments.length === 2)  {
		cb = schema,
		schema = conn;
		conn = null;
	}

	if (conn)
		soar.alterTable(conn, schema, cb);
	else  {
		soar.alterTable(schema, function(err) {
			if (!err)
				schemaTool.invalidateCache( schema.title );
			cb(err);
		});
	}
};


exports.dropTable = function(conn, tbName, cb)  {
	if (arguments.length === 2)  {
		cb = tbName,
		tbName = conn;
		conn = null;
	}

	if (conn)
		soar.deleteTable(conn, tbName, cb);
	else
		soar.deleteTable(tbName, function(err) {
			if (!err)
				schemaTool.invalidateCache( tbName );
			cb(err);
		});
};


exports.describeTable = function(conn, tbName, cb)  {
	if (arguments.length === 2)  {
		cb = tbName,
		tbName = conn;
		conn = null;
	}
	
	soar.describeTable(conn, tbName, cb);
};


exports.renameTable = function(conn, oldName, newName, cb)  {
	if (arguments.length === 3)  {
		cb = newName;
		newName = oldName;
		oldName = conn;
		conn = null;
	}
	
	soar.renameTable(conn, oldName, newName, cb);
};


/**
 * A handy function to find just one entry.
 */
exports.findOne = function(expr, query, cb) {
	var  cmd = {op: 'query'},
		 realQuery = {},
		 filter = qo.parseQO(query, realQuery);
	query = realQuery;
		 
	if (typeof expr === 'string')
		cmd.expr = soar.sql(expr).filter(filter).value();
	else  {
		expr = expr.value();
		if (!expr.filters)  {
			var  nexpr = _.clone(expr);
			nexpr.filters = filter;
			expr = nexpr;
		}
		
		cmd.expr = expr;
	}

	//console.log('query command is\n%s', JSON.stringify(cmd, null, 4));
	//console.log('query query is\n%s', JSON.stringify(query, null, 4));
	exports.execute( cmd, null, query, cb );
};


/**
 * A handy function to do listing.
 */
exports.find = function(expr, query, cb) {
	var  cmd = {op: 'list'},
		 realQuery = {},
		 filter = qo.parseQO(query, realQuery);
	query = realQuery;
		 
	if (typeof expr === 'string')
		cmd.expr = soar.sql(expr).filter(filter).value();
	else  {
		expr = expr.value();
		if (!expr.filters)  {
			var  nexpr = _.clone(expr);
			nexpr.filters = filter;
			expr = nexpr;
		}
		
		cmd.expr = expr;
	}

	//console.log('query command is\n%s', JSON.stringify(cmd, null, 4));
	//console.log('query query is\n%s', JSON.stringify(query, null, 4));
	exports.execute( cmd, null, query, cb );
};


/**
 * A handy function to do insert.
 */
exports.insert = function(tbName, data, cb)  {
	if (arguments.length != 3)
		throw  new Error("Wrong parameters");
		
	var  cmd = {op: 'insert'};
	if (typeof tbName === 'string')
		cmd.expr = soar.sql(tbName).value();
	else
		cmd.expr = tbName.value();

	doInsert( cmd, data, cb );
};


/**
 * A handy function to do insert.
 * The preferred signature is update(expr, query, cb)
 */
exports.update = function(tbName, data, query, cb)  {
	var  cmd = {op: 'update'},
		 realQuery = {},
		 filter = qo.parseQO(query, realQuery);
	query = realQuery;
	
	if (typeof tbName === 'string')  {
		var  expr = soar.sql(tbName)
						.filter( filter );

		cmd.expr = expr.value();
	}
	else  {
		if (arguments.length != 4)
			throw  new Error("Wrong parameters");
			
		cmd.expr = tbName.value();
	}
	//console.log('update command is\n%s', JSON.stringify(cmd, null, 4));
	//console.log('update query is\n%s', JSON.stringify(query, null, 4));
	doUpdate( cmd, data, query, cb );
};


/**
 * A handy function to do insert.
 */
exports.del = function(tbName, query, cb)  {
	var  cmd = {op: 'delete'},
		 realQuery = {},
		 filter = qo.parseQO(query, realQuery);
	query = realQuery;
	
	if (typeof tbName === 'string')  {
		var  expr = soar.sql(tbName)
						.filter( filter );

		cmd.expr = expr.value();
	}
	else  {
		if (arguments.length != 3)
			throw  new Error("Wrong parameters");
		cmd.expr = tbName.value();
	}

	doDelete( cmd, query, cb );
};


/**
 * A all-in-one (query, insert, update, delete) query execution function.
 */
exports.execute = function(option, data, query, cb)  {
	switch (arguments.length) {
		case  2:
			cb = data;
			data = null;
			query = null;
			break;

		case  3:
			cb = query;
			query = data;
			data = null;
			break;
	}

	switch (option.op)  {
		case 'query':
			//console.log('query cmd is\n%s', JSON.stringify(option, null, 4));
			//console.log('query query is\n%s', JSON.stringify(query, null, 4));
			doQuery(option, query, function(err, value) {
				if (err)
					cb(err);
				else  {
					//console.log('query result is\n%s', JSON.stringify(value, null, 4));
					if (value && value.length)
						cb( null, value[0] );
					else
						cb( null, value );
				}
			});
			break;

		case 'list':
			doQuery(option, query, cb);
			break;

		case 'update':
			doUpdate(option, data, query, cb);
			break;

		case 'insert':
			doInsert(option, data, cb);
			break;

		case 'delete':
			doDelete(option, query, cb);
			break;
	}
};


/*
* create an update template and split the input data into sql and not-sql columns.
*/
function  updateTemplate(tbName, schema, columns, inData)  {
	var  insertObj = {},
		 jsonObj = {},
		 schemaCol = schema.columns,
		 isNewSQL = schemaCol.indexOf('_c_json') >= 0;

	// if columns are specified in the SQL expression, remove input data which are
	// not  specified in columns
	if (columns)  {
		var  ndata = {},
			 keys = Object.getOwnPropertyNames(inData);
		for (var i in keys)  {
			var  key = keys[i];
			if (columns.indexOf(key) >= 0)
				ndata[key] = inData[key];
		}
		inData = ndata;
	}
	
	// needs to decide what goes to sql columns and what goes to the json column
	var  keys = Object.getOwnPropertyNames(inData);
	for (var i in keys)  {
		var  key = keys[i];
		if (schemaCol.indexOf(key) >= 0)
			insertObj[key] = inData[key];
		else  if (isNewSQL)
			jsonObj[key] = inData[key];
	}

	var  insertCol = Object.keys( insertObj );
	if (Object.keys(jsonObj).length)  {
		// prepare the json column
		insertCol.push('_c_json');
		//insertObj._c_json = JSON.stringify(jsonObj);
	}

	var  updateSBI = soar.sqlTemplate(tbName);
	updateSBI.column( insertCol );

	return  {sbi: updateSBI, data: insertObj, _c_json: jsonObj};
};


function  doInsert(option, data, cb)  {
	var  expr = option.expr,
		 tableName = expr.table.name;

	schemaTool.getSchema(tableName, function(err, schema) {
		if (err)
			cb(err);
		else  {
			var  info = updateTemplate(tableName, schema, expr.columns, data),
				 sqlOption = {op: 'insert', expr: info.sbi.value(), conn: option.conn};
			info.data._c_json = JSON.stringify(info._c_json);

			if (schema.columns.indexOf('_c_json') >= 0 || !_autoConvert)
				soar.execute( sqlOption, info.data, null, cb );
			else  {
				var  alterSchema = {
					title: tableName,
					add: {
						column: {
							_c_json: {type: 'string', format: 'text'}
						}
					}
				};

				exports.alterTable( alterSchema, function(err) {
					if (err)
						cb( err );
					else
						soar.execute( sqlOption, info.data, null, cb );
				});
			}
		}
	});
};


function  doUpdate(option, inData, inQuery, cb)  {
	var  expr = option.expr,
		 tableName = expr.table.name;

	// we have to check if this is a plain SQL table
	// and if we need to add the '_c_json' column
	schemaTool.getSchema(tableName, function(err, schema) {
		if (err)
			cb(err);
		else  {
			if (schema.columns.indexOf('_c_json') >= 0 || !_autoConvert)
				updating(option, inData, inQuery, schema, cb)
			else  {
				var  alterSchema = {
					title: tableName,
					add: {
						column: {
							_c_json: {type: 'string', format: 'text'}
						}
					}
				};

				exports.alterTable( alterSchema, function(err) {
					if (err)
						cb( err );
					else
						updating(option, inData, inQuery, schema, cb)
				});
			}
		}
	});
};


function  updating(option, inData, inQuery, schema, cb)  {
	var  expr = option.expr,
		 tableName = expr.table.name;
	//console.log('update expresson is\n%s', JSON.stringify(expr, null, 4));
	//console.log('update query is\n%s', JSON.stringify(inQuery, null, 4));

	var  sbi = soar.sql(tableName).filter( expr.filters );

	var  queryCmd = {
		op: 'list', 
		expr: sbi.value(),
		raw: true,
		conn: option.conn
	};

	doQuery(queryCmd, inQuery, function(err, rows) {
		//console.log('rows is\n%s', JSON.stringify(rows, null, 2));
		if (err)
			cb(err);
		else  if (rows.length > 0)  {
			var  updFilter = schemaTool.primaryKeyFilter(schema),
				 pk = schema.primary,
				 info = updateTemplate(tableName, schema, expr.columns, inData),
            	 updateTemp = info.sbi;
            updateTemp.filter( updFilter );

			if (option.conn)  {
				var  conn = option.conn,
					 updCmd = {expr: updateTemp.value(), conn: conn};

				if (conn.inTransaction())
					groupUpdate(null, updCmd, info, pk, rows, cb);
				else
					conn.beginTransaction(function(err) {
			            if (err)
			                cb(err);
			            else
			            	groupUpdate(conn, updCmd, info, pk, rows, cb);
			        });
			}
			else
				exports.getConnection(function(err, conn)  {
					if (err)
						cb(err);
					else  {
	            		var  updCmd = {expr: updateTemp.value(), conn: conn};
						
						// we may update multiple items, use transaction
						conn.beginTransaction(function(err) {
				            if (err)
				                cb(err);
				            else
				            	groupUpdate(conn, updCmd, info, pk, rows, cb);
				        });
					}
				});
		}
		else
			// nothing to do
			cb(null);
	});
};


function  groupUpdate(conn, cmd, info, pk, rows, cb)  {
	cmd.op = 'update';

	async.eachSeries(rows, function(data, cb) {
		var  query = {};
		for (var i in pk)
			query[pk[i]] = data[pk[i]];

		var  updData = info.data;
		if (info._c_json)  {
			// if there is the _c_json column, we'll need to make a copy of the update data
			// so we won't pollute info.data which are shared by multiple data update
			updData = {};
			for (var k in info.data)
				updData[k] = info.data[k];
				
			//console.log('original JSON is ' + data._c_json);
			//console.log('update JSON is ' + JSON.stringify(info._c_json));	
			
			var  origJson = data._c_json  ?  JSON.parse(data._c_json) : {};

			for (var k in info._c_json)  {
				if (info._c_json[k])
					origJson[k] = info._c_json[k];
				else
					delete  origJson[k];
			}
			updData._c_json = JSON.stringify(origJson);
		}

		soar.execute( cmd, updData, query, cb );
	},
	function(err)  {
		if (conn)  {
			if (err)
				conn.rollback();
			else
				conn.commit();
			conn.release();
		}

		if (err)
			console.log( err.stack );
		
		cb( err );
	});
};


function  doDelete(option, inQuery, cb)  {
	var  expr = option.expr,
		 tableName = expr.table.name;

	schemaTool.getSchema(tableName, function(err, schema) {
		if (err)
			cb(err);
		else  {
			var  sbi = soar.sqlTemplate(tableName);
			sbi.column( schema.primary ).filter( expr.filters );

			var  sqlOption = {
				op: 'list', 
				expr: sbi.value(),
				conn: option.conn
			};

			doQuery(sqlOption, inQuery, function(err, rows) {
				//console.log('rows is\n%s', JSON.stringify(rows, null, 2));
				if (err)
					cb(err);
				else  if (rows.length > 0)  {
					var  deleteSBI = soar.sqlTemplate(tableName),
						 filter = schemaTool.primaryKeyFilter(schema),
						 pk = schema.primary;
					deleteSBI.filter( filter );

					if (option.conn)  {
						var  conn = option.conn,
							 delOption = {expr: deleteSBI.value(), conn: conn};

						if (conn.inTransaction())
							// try not to nest transactions
					        groupDelete(null, delOption, pk, rows, cb);
						else
							// we may delete multiple items, use transaction
							conn.beginTransaction(function(err) {
					            if (err)
					                cb(err);
					            else
					            	groupDelete(conn, delOption, pk, rows, cb);
					        });
					}
					else
						exports.getConnection(function(err, conn)  {
							if (err)
								cb(err);
							else  {
								var  delOption = {expr: deleteSBI.value(), conn: conn};

								// we may delete multiple items, use transaction
								conn.beginTransaction(function(err) {
						            if (err)
						                cb(err);
						            else
						            	groupDelete(conn, delOption, pk, rows, cb);
						        });
							}
						});
				}
				else
					// nothing to do
					cb(null);
			});
		}
	});
};


function  groupDelete(conn, delOption, pk, rows, cb)  {
	var  cmd = {op: 'delete', expr: delOption.expr, conn: delOption.conn};

	async.each(rows, function(data, cb) {
		var  query = {};
		for (var i in pk)
			query[pk[i]] = data[pk[i]];

		soar.execute( cmd, query, cb );
	},
	function(err)  {
		if (conn)  {
			if (err)
				conn.rollback();
			else
				conn.commit();
			conn.release();
		}

		if (err)
			console.log( err.stack );
		
		cb( err );
	});
};


/*
* option.raw: keep return data in the original form. do not merge the JSON column with SQL columns.
*/
function  doQuery(option, inQuery, cb)  {
	var  expr = option.expr,
		 tables = toTableArrays(expr.table),
		 mainTable = tables[0].alias || tables[0].name;
	//console.log('table names are:\n%s', JSON.stringify(tables, null, 4));

	getQueryTableSchema(tables, function(err, tableSchema) {
		if (err)
			return cb(err);

		//console.log('table schema:\n%s', JSON.stringify(tableSchema, null, 4));
		// now we can move on to analyze the query
		// first, we need to collect filter columns...
		var  noColumnSpecified = !(expr.columns || option.raw),
			 whereCol = [];
		if (expr.filters)
			collectFilterColumns(mainTable, expr.filters, whereCol);

		var  colInfo = scanColumns(tableSchema, mainTable, expr.columns, whereCol),
			 isSqlCol = colInfo.nc.length === 0,
			 isSqlFilter = matchSQLFilter(tableSchema, whereCol);
		//console.log('colInfo is:\n%s', JSON.stringify(colInfo, null, 4));
		//console.log('whereCol is:\n%s', JSON.stringify(whereCol, null, 4));

		if (isSqlCol && isSqlFilter)  {
			// all query column are 'inertia', go ahead to do SQL query
			//console.log('doing standard SQL query');
			//option.debug = true;
			soar.execute( option, inQuery, function(err, result) {
				if (noColumnSpecified && result)  {
					// user does not specify what columns to be returned.
					// return all columns and json_columns are extracted/added
					if (tableSchema[mainTable].columns.indexOf('_c_json') >= 0)
						mergeJsonColumns(option.op === 'query'  ?  [result] : result);
				}
				//console.log('query result is:\n%s', JSON.stringify(result, null, 4));
				cb(err, result);
			});
		}
		else  {
			// there are variable columns, we have to reconstruct the query terms to make them SQL only
			var  schema = tableSchema[mainTable],
				 sqlExpr = cloneObj(expr),
				 sqlCmd = {op: 'list', expr: sqlExpr};
				 
			sqlExpr.columns = colInfo.cc;
			//sqlCmd.range = sqlCmd.range || soar.range(1, _queryLimit);

			if (!isSqlFilter)
				sqlExpr.filters = buildSqlFilter(expr.filters, schema.columns);
			//console.log('The adjusted SQL expression is\n%s', JSON.stringify(sqlCmd, null, 2));

			// now we're ready to perform SQL query
			var  listQuery = sqlExpr.filters  ?  inQuery : null;
			
			var  pgIdx = 1,
				 hasMore = true,
				 listSum = [];
			async.whilst(
				function()  {return  hasMore;},
				function(cb)  {
					sqlCmd.range = soar.range(pgIdx++, _queryPageSize);
					//sqlCmd.debug = true;
					soar.execute( sqlCmd, listQuery, function(err, result, count) {
						if (err)  {
							console.log( err.stack );
							return cb(err);
						}
						
						hasMore = result.length === _queryPageSize;
		
						//console.log('result of adjusted SQL:\n%s', JSON.stringify(result, null, 2));
						if (!isSqlCol)
							// add back specified non-sql properties
							mergeSelectedJsonColumns(colInfo, result);
						else
							// user does not specify what columns to be returned.
							// return all columns and json_columns are extracted/added
							mergeJsonColumns(result);
						//console.log('result before final filtering\n%s', JSON.stringify(result, null, 2));
		
						if (!isSqlFilter)  {
							// ok, let's run a JSON-FP program to get the final result
							var  rdQuery = {},
								 reducedF = reduceFilter(mainTable, expr.filters, schema.columns, colInfo.nc, inQuery, rdQuery);
							//console.log('filter is\n%s', JSON.stringify(reducedF, null, 2));
							//console.log('query value is\n%s', JSON.stringify(rdQuery, null, 2));
							result = jsonQ.filter( result, reducedF, rdQuery );
						}
						//console.log('result after final filtering\n%s', JSON.stringify(result, null, 2));
		
						if (colInfo.more.length)  {
							// remove auto-added columns
							var  rmc = colInfo.more;
							result.forEach(function(data) {
								for (var i in rmc)
									delete  data[rmc[i]];
							});
						}
		
						// not using listSum = listSum.concat(result) for potential performance gains
						for (var i in result)
							listSum.push( result[i] );
							
						//console.log('current size: %d, accumulated size: %d, total size: %d, hasMore: %s', result.length, listSum.length, count, hasMore);
						cb();
					});
				},
				function(err)  {
					cb(err, listSum);
				}
			);
		}
	});
};


/**
 * load all related table schema (including joined table) before we can analyze the query
 */
function  toTableArrays(sbiTable)  {
	var  tbName = sbiTable.name,
		 tables = [];
	addTable( tbName, tables );

	if (sbiTable.join)  {
		var  joinTables = sbiTable.join;
		for (var i in joinTables)
			addTable( joinTables[i].table, tables );
	}

	return  tables;
};


/*
* Retrieve all table schemas specified in a query.
*/
function  getQueryTableSchema(tables, cb) {
	var  tableSchema = {};

	async.each(tables, function(t, callback) {
		var  tbName = t.name;
		schemaTool.getSchema(tbName, function(err, schema) {
			if (!err)  {
				tableSchema[tbName] = schema;
				if (t.alias)
					tableSchema[t.alias] = schema;
			}
			callback(err);
		});
	},
	function(err) {
		cb(err, tableSchema);
	});
};


/**
* check if whereCol contains any non-sql columns.
*/
function  matchSQLFilter(tableSchema, whereCol)  {
	for (var i in whereCol)  {
		var  col = whereCol[i],
			 schema = tableSchema[col.tbName];

		if (!schema)
			throw  new Error('A filter column refers to an unknown table [' + col.tbName + ']');

		if (schema.columns.indexOf(col.col) < 0)
			return  false;
	}
	return  true;
};


function  mergeJsonColumns(list)  {
	list.forEach(function(data) {
		if (data._c_json)  {
			try  {
				var  jobj = JSON.parse(data._c_json);
				for (var k in jobj)
					data[k] = jobj[k];
			}
			catch (e)  {
				console.log( e.stack );
			}
			delete  data._c_json;
		}
	});
};


function  mergeSelectedJsonColumns(colInfo, list)  {
	list.forEach(function(data) {
		var  jsonObjs = {};

		for (var i in colInfo.nc)  {
			var  c = colInfo.nc[i],
				 jobj = jsonObjs[c.tbName];

			if (!jobj)  {
				var  jsonStr = data[c.tbName+'_json'];
				if (jsonStr && typeof jsonStr === 'string')
					try  {
						jobj = JSON.parse( jsonStr );
						jsonObjs[c.tbName] = jobj;
					}
					catch (e)  {
						console.log( e.stack );
					}
			}

			if (jobj)  {
				var  cName = c.alias || c.col;
				data[cName] = jobj[c.col];
			}
		}

		// remove the json column
		// can't do it the following way. null _json can't be deleted
		//for (var key in jsonObjs)
		//	delete  data[key + '_json'];
		for (var i in colInfo.nc)
			delete  data[colInfo.nc[i].tbName + '_json'];
	});
}


function  addTable(tbName, tables)  {
	if (tbName.indexOf(' ') > 0)  {
		var  ts = tbName.split(' ') ;
		if (ts.length === 3)
			tables.push( {name: ts[0], alias: ts[2]} );
		else
			table.push( {name: ts[0]} );
	}
	else
		tables.push( {name: tbName} );
};


function  scanColumns(tableSchema, mainTable, columns, whereCol)  {
	var  mainSchema = tableSchema[mainTable],
		 cc = [],		// standard sql columns
		 ncSet = {},
		 jsonC = {},
		 isNewSQL = mainSchema.columns.indexOf('_c_json') >= 0;

	if (columns)
		for (var i in columns)  {
			var  colName = columns[i],
				 alias = null,
				 idx = colName.indexOf(' ');

			if (idx > 0)  {
				var  cs = colName.split(' ');
				// drop the 'AS'
				colName = cs[0];
				alias = cs[2];
			}

			idx = colName.indexOf('.');
			var  tbName = mainTable,
				 cName = colName,
				 schema = mainSchema;

			if (idx > 0)  {
				tbName = colName.substring(0, idx);
				cName = colName.substring(idx+1);
				schema = tableSchema[tbName];
			}
			//console.log('table: %s, column: %s, alias: %s', tbName, cName, alias);

			if (schema)  {
				if (schema.columns.indexOf(cName) >= 0)
					cc.push( columns[i] );
				else  if (isNewSQL) {
					// this column belong to the 'json' properties
					ncSet[colName] = {tbName: tbName, col: cName, alias: alias};
					jsonC[tbName] = tbName + '._c_json AS ' + tbName + '_json';
				}
			}
			else
				throw  new Error('Cannot find the [' + tbName + '] table');
		}
	else
		cc = mainSchema.columns.slice(0);

	// check where conditions, too
	var  invColumns = mainSchema.columns,
		 extC = [];

	if (columns)  {
		// if query columns are not specified, every column (sql/noSQL) of the main table
		// will be automatically included. So we don't have to examine agin.
		for (var i in whereCol)  {
			var  wc = whereCol[i],
				 schema = tableSchema[wc.tbName],
				 whereC = whereCol[i].orig;

			if (schema.columns.indexOf(wc.col) >= 0)  {
				if (cc.indexOf(whereC) === -1)  {
					cc.push( whereC );
					extC.push( whereC );
				}
			}
			else  if (isNewSQL && !ncSet[whereC])  {
				ncSet[whereC] = wc;
				extC.push( whereC );
			
				if (!jsonC[wc.tbName])
					jsonC[wc.tbName] = wc.tbName + '._c_json AS ' + wc.tbName + '_json';
			}
		}
	}
	
	var  nc = [];
	for (var key in ncSet)
		nc.push( ncSet[key] );

	for (var i in jsonC)
		cc.push( jsonC[i] );

	// 'more': redundant columns to be removed
	// 'nc': columns for where only
	return  {cc: cc, nc: nc, more: extC};
};


/**
 * Check if a filter contains json-columns
 */
function  collectFilterColumns(dftTable, filter, col)  {
	var  isLogical = false;
	if (filter.op === 'AND' || filter.op === 'and' || filter.op === 'OR' || filter.op === 'or')  {
		filter.op = filter.op.toLowerCase();
		isLogical = true;
	}

	if (isLogical)  {
		filter.filters.forEach(function(f) {
			collectFilterColumns(dftTable, f, col);
		});
	}
	else  {
		var  colName = filter.field || filter.name,
			 fc = {tbName: dftTable, col: colName, orig: colName},
			 idx = colName.indexOf('.');

		if (idx > 0)  {
			fc.tbName = colName.substring(0, idx);
			fc.col = colName.substring(idx+1);
		}

		if (_.findIndex(col, fc) < 0)
			col.push(fc);
	}
};


/**
 * Build a new SQL filter with 'inertia' columns
 */
function  buildSqlFilter(filter, columns)  {
	if (filter.op === 'and')  {
		var  clones = [];
		filter.filters.forEach(function(f) {
			var  cf = buildSqlFilter(f, columns);
			if (cf)
				clones.push( cf );
		});
		
		var  len = clones.length;
		if (len < 1)
			return null;
		else
			return  len > 1  ?  {op: 'and', filters: clones} : clones[0];
	}
	else  if (filter.op === 'or')  {
		var  clones = [];
		filter.filters.forEach(function(f) {
			var  cf = buildSqlFilter(f, columns);
			if (cf)
				clones.push( cf );
		});

		return  clones.length === filter.filters.length  ?  {op: 'or', filters: clones} : null;
	}

	var  cf = null,
		 colName = filter.name;
	if (columns.indexOf(colName) >= 0)
		cf = filter; //cloneObj( filter );


	return  cf;
};


function  reduceFilter(mainTable, filter, columns, nscols, query, rdQuery)  {
	if (filter.op === 'and')  {
		var  clones = [];
		filter.filters.forEach(function(f) {
			var  cf;
			if (f.op === 'and ' || f.op === 'or')
				cf = convertAndOrFilter(mainTable, f, columns, nscols, query, rdQuery);
			else
				cf = noSqlFilter(mainTable, f, columns, nscols, query, rdQuery);
				
			if (cf)
				clones.push( cf );
		});
		
		var  len = clones.length;
		if (len < 1)
			return null;
		else
			return  len > 1  ?  {op: 'and', filters: clones} : clones[0];
	}
	
	return  convertAndOrFilter(mainTable, filter, columns, nscols, query, rdQuery);
};


function  convertAndOrFilter(mainTable, filter, columns, nscols, query, rdQuery)  {
	if (filter.op === 'or' || filter.op === 'and')  {
		var  clones = [],
			 cf = {op: filter.op, filters: clones};

		filter.filters.forEach(function(f) {
			var  cf = convertAndOrFilter(mainTable, f, columns, nscols, query, rdQuery);
			clones.push( cf );
		});
		return  cf;
	}

	return  convertFilter(mainTable, filter, columns, nscols, query, rdQuery);
};


function  convertFilter(mainTable, filter, columns, nscols, query, rdQuery)  {
	var  cf = null,
		 colName = filter.field || filter.name,
		 value = query[filter.name];

	if (columns.indexOf(colName) === -1)  {
		// if this is a joined query, we'll have to find out the 'correct' column name
		var  idx = colName.indexOf('.'),
			 tbName = mainTable,
			 cName = colName;

		if (idx > 0)  {
			tbName = colName.substring(0, idx);
			cName = colName.substring(idx+1);
		}

		var  nsc = _.find(nscols, {tbName: tbName, col: cName}),
			 fname = (nsc && nsc.alias)  ?  nsc.alias : cName;
		//console.log('non-SQL column\n%s', JSON.stringify(nsc, null, 4));

		cf = {name: fname, op: filter.op};
		rdQuery[fname] = value;
	}
	else {
		cf = cloneObj( filter );
		rdQuery[filter.name] = value;
	}

	return  cf;
};


/**
 * check if the filter referring to noSql column. if so, keep it. otherwise, the filter will be removed.
 */
function  noSqlFilter(mainTable, filter, columns, nscols, query, rdQuery)  {
	var  cf = null,
		 colName = filter.field || filter.name,
		 value = query[filter.name],
		 idx = colName.indexOf('.'),
		 tbName = mainTable,
		 cName = colName;
		 
	if (idx > 0)  {
		tbName = colName.substring(0, idx);
		cName = colName.substring(idx+1);
	}
	
	if (columns.indexOf(cName) === -1)  {
		var  nsc = _.find(nscols, {tbName: tbName, col: cName}),
			 fname = (nsc && nsc.alias)  ?  nsc.alias : cName;
		//console.log('non-SQL column\n%s', JSON.stringify(nsc, null, 4));

		cf = {name: fname, op: filter.op};
		rdQuery[fname] = value;
	}

	return  cf;
};


function  cloneObj(org)  {
	var  clone = {};
	Object.keys(org).forEach(function(k) {
		clone[k] = org[k];
	});
	return  clone;
};