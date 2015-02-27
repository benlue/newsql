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
	 path = require('path'),
	 soar = require('soarjs'),
	 schemaTool = require('./schemaTool.js');

var  _queryLimit;

//soar.setDebug( true );

exports.config= function(option)  {
	if (!option)  {
		var  configFile = path.join(__dirname, '../config.json');
		option = JSON.parse( fs.readFileSync(configFile) );
	}

	_queryLimit = option.queryLimit || 100;
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


exports.sqlTemplate = function(tbName)  {
	return  soar.sqlTemplate(tbName);
};


/*
* This function is deprecated in favor of sqlTemplate()
*/
exports.sqlBuildInfo = function(tbName)  {
	return  soar.sqlTemplate(tbName);
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

	exports.alterTable( alterSchema, function(err) {
		if (err)
			cb(err);
		else  {
			// move every 'propName' property from the JSON column to the SQL column
			var  qExpr = soar.sqlTemplate(docName).column(['id', '_c_json']).value(),
				 updExpr = soar.sqlTemplate(docName).column([propName, '_c_json']).
				 				filter({name: 'id', op: '='}).value();
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
							// we may update multiple items, use transaction
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

													var  updCmd = {op: 'update', expr: updExpr, data: updData, query: data, conn: conn};
													soar.execute( updCmd, function(err) {
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
		 				filter({name: 'id', op: '='}).value();
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

				            			var  updData = {_c_json: JSON.stringify(jobj)},
				            				 updCmd = {op: 'update', expr: updExpr, data: updData, query: data, conn: conn};
										soar.execute( updCmd, function(err) {
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
									cb(err);
								}
								else  {
									conn.commit();

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

	if (conn)
		soar.getSchemaManager().createTable(conn, schema, cb);
	else  {
		soar.getConnection(function(err, conn)  {
			if (err)
				cb(err);
			else
				soar.getSchemaManager().createTable(conn, schema, cb);
		});
	}
};


exports.alterTable = function(conn, schema, cb)  {
	if (arguments.length === 2)  {
		cb = schema,
		schema = conn;
		conn = null;
	}

	if (conn)
		soar.getSchemaManager().alterTable(conn, schema, cb);
	else  {
		soar.getConnection(function(err, conn)  {
			if (err)
				cb(err);
			else
				soar.getSchemaManager().alterTable(conn, schema, cb);
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
		soar.getSchemaManager().deleteTable(conn, tbName, cb);
	else  {
		soar.getConnection(function(err, conn)  {
			if (err)
				cb(err);
			else
				soar.getSchemaManager().deleteTable(conn, tbName, cb);
		});
	}
};


exports.describeTable = function(conn, tbName, cb)  {
	if (arguments.length === 2)  {
		cb = tbName,
		tbName = conn;
		conn = null;
	}

	if (conn)
		soar.getSchemaManager().describeTable(conn, tbName, cb);
	else  {
		soar.getConnection(function(err, conn)  {
			if (err)
				cb(err);
			else
				soar.getSchemaManager().describeTable(conn, tbName, cb);
		});
	}
};


/**
 * A handy function to do query.
 */
exports.find = function(expr, query, cb) {
	var  cmd;
	if (arguments.length === 2)  {
		cmd = expr;
		cb = query;
	}
	else
		cmd = {
			op: 'list',
			expr: expr, 
			query: query
		};

	exports.execute( cmd, cb );
};


/**
 * A handy function to do insert.
 */
exports.insert = function(tbName, data, cb)  {
	var  cmd;
	if (arguments.length === 2)  {
		cmd = tbName;
		cb = data;
	}
	else
		cmd = {
			op: 'insert',
			entity: tbName,
			data: data
		};

	doInsert( cmd, cb );
};


/**
 * A handy function to do insert.
 * The preferred signature is update(expr, query, cb)
 */
exports.update = function(tbName, data, filter, query, cb)  {
	var  cmd;
	if (arguments.length === 2)  {
		cmd = tbName;
		cb = data;
	}
	else
		cmd = {
			op: 'update',
			entity: tbName,
			data: data,
			filter: filter,
			query: query
		};

	doUpdate( cmd, cb );
};


/**
 * A handy function to do insert.
 */
exports.del = function(tbName, filter, query, cb)  {
	var  cmd;
	if (arguments.length === 2)  {
		cmd = tbName;
		cb = filter;
	}
	else
		cmd = {
			op: 'delete',
			entity: tbName,
			filter: filter,
			query: query
		};

	doDelete( cmd, cb );
};


/**
 * A all-in-one (query, insert, update, delete) query execution function.
 */
exports.execute = function(option, cb)  {
	switch (option.op)  {
		case 'query':
			doQuery(option, function(err, value) {
				if (err)
					cb(err);
				else  {
					if (value && value.length)
						cb( null, value[0] );
					else
						cb( null, value );
				}
			});
			break;

		case 'list':
			doQuery(option, cb);
			break;

		case 'update':
			doUpdate(option, cb);
			break;

		case 'insert':
			doInsert(option, cb);
			break;

		case 'delete':
			doDelete(option, cb);
			break;
	}
};


/*
* create an update template and split the input data into sql and not-sql columns.
*/
function  updateTemplate(tbName, schema, inData)  {
	var  insertObj = {},
		 jsonObj = {},
		 schemaCol = schema.columns;

	// needs to decide what goes to sql columns and what goes to the json column
	for (var key in inData)  {
		if (schemaCol.indexOf(key) === -1)
			jsonObj[key] = inData[key];
		else
			insertObj[key] = inData[key];
	}

	var  insertCol = Object.keys( insertObj );
	if (Object.keys(jsonObj).length)  {
		// prepare the json column
		insertCol.push('_c_json');
		insertObj._c_json = JSON.stringify(jsonObj);
	}

	var  updateSBI = soar.sqlTemplate(tbName);
	updateSBI.column( insertCol );

	return  {sbi: updateSBI, data: insertObj};
};


function  doInsert(option, cb)  {
	schemaTool.getSchema(option.entity, function(err, schema) {
		if (err)
			cb(err);
		else  {
			var  info = updateTemplate(option.entity, schema, option.data),
				 sqlOption = {op: 'insert', expr: info.sbi.value(), data: info.data, conn: option.conn};
			soar.execute( sqlOption, cb );
		}
	});
};


function  doUpdate(option, cb)  {
	schemaTool.getSchema(option.entity, function(err, schema) {
		if (err)
			cb(err);
		else  {
			var  sbi = soar.sqlTemplate(option.entity);
			sbi.column( schema.primary ).
			filter( option.filter );

			var  sqlOption = {
				op: 'list', 
				expr: sbi.value(),
				query: option.query,
				conn: option.conn
			};

			doQuery(sqlOption, function(err, rows) {
				//console.log('rows is\n%s', JSON.stringify(rows, null, 2));
				if (err)
					cb(err);
				else  if (rows.length > 0)  {
					var  updFilter = schemaTool.primaryKeyFilter(schema),
						 pk = schema.primary,
						 info = updateTemplate(option.entity, schema, option.data),
		            	 updateTemp = info.sbi;
		            updateTemp.filter( updFilter );

					if (option.conn)  {
						var  conn = option.conn,
							 updOption = {expr: updateTemp.value(), data: info.data, conn: conn};

						if (conn.inTransaction())
							groupUpdate(null, updOption, pk, rows, cb);
						else
							conn.beginTransaction(function(err) {
					            if (err)
					                cb(err);
					            else
					            	groupUpdate(conn, updOption, pk, rows, cb);
					        });
					}
					else
						exports.getConnection(function(err, conn)  {
							if (err)
								cb(err);
							else  {
			            		var  updOption = {expr: updateTemp.value(), data: info.data, conn: conn};
								
								// we may update multiple items, use transaction
								conn.beginTransaction(function(err) {
						            if (err)
						                cb(err);
						            else
						            	groupUpdate(conn, updOption, pk, rows, cb);
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


function  groupUpdate(conn, updOption, pk, rows, cb)  {
	//console.log('updatable data:\n%s', JSON.stringify(rows, null, 2));
	async.each(rows, function(data, cb) {
		var  cmd = {op: 'update', expr: updOption.expr, data: updOption.data, conn: updOption.conn},
			 query = {};

		for (var i in pk)
			query[pk[i]] = data[pk[i]];
		cmd.query = query;

		soar.execute( cmd, cb );
	},
	function(err)  {
		if (err)  {
			console.log( err.stack );
			if (conn)
				conn.rollback();
		}
		else if (conn)
			conn.commit();
		cb( err );
	});
};


function  doDelete(option, cb)  {
	schemaTool.getSchema(option.entity, function(err, schema) {
		if (err)
			cb(err);
		else  {
			var  sbi = soar.sqlTemplate(option.entity);
			sbi.column( schema.primary ).
			filter( option.filter );

			var  sqlOption = {
				op: 'list', 
				expr: sbi.value(),
				query: option.query,
				conn: option.conn
			};

			doQuery(sqlOption, function(err, rows) {
				//console.log('rows is\n%s', JSON.stringify(rows, null, 2));
				if (err)
					cb(err);
				else  if (rows.length > 0)  {
					var  deleteSBI = soar.sqlTemplate(option.entity),
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
	async.each(rows, function(data, cb) {
		var  cmd = {op: 'delete', expr: delOption.expr, conn: delOption.conn},
			 query = {};

		for (var i in pk)
			query[pk[i]] = data[pk[i]];
		cmd.query = query;

		soar.execute( cmd, cb );
	},
	function(err)  {
		if (err)  {
			console.log( err.stack );
			if (conn)
				conn.rollback();
		}
		else  if (conn)
			conn.commit();
		cb( err );
	});
};


function  doQuery(option, cb)  {
	var  expr = option.expr,
		 tables = toTableArrays(expr.table),
		 mainTable = tables[0].alias || tables[0].name;
	//console.log('table names are:\n%s', JSON.stringify(tables, null, 4));

	getQueryTableSchema(tables, function(err, tableSchema) {
		if (err)
			cb(err);
		else  {
			//console.log('table schema:\n%s', JSON.stringify(tableSchema, null, 4));
			// now we can move on to analyze the query
			// first, we need to collect filter columns...
			var  noColumnSpecified = !expr.columns,
				 whereCol = [];
			if (expr.filters)
				collectFilterColumns(mainTable, expr.filters, whereCol);

			var  colInfo = scanColumns(tableSchema, mainTable, expr.columns, whereCol),
				 isSqlCol = colInfo.nc.length === 0,
				 isSqlFilter = matchSQLFilter(tableSchema, whereCol);
			//console.log('colInfo is:\n%s', JSON.stringify(colInfo, null, 4));

			if (isSqlCol && isSqlFilter)  {
				// all query column are 'inertia', go ahead to do SQL query
				//console.log('doing standard SQL query');
				soar.execute( option, function(err, result) {
					if (noColumnSpecified)  {
						// user does not specify what columns to be returned.
						// return all columns and json_columns are extracted/added
						mergeJsonColumns(result);
					}
					cb(err, result);
				});
			}
			else  {
				// there are variable columns, we have to reconstruct the query terms to make them SQL only
				var  schema = tableSchema[mainTable],
					 sqlOption = cloneObj(option),
					 sqlExpr = cloneObj(expr);
				sqlExpr.columns = colInfo.cc;

				sqlOption.op = 'list';
				sqlOption.expr = sqlExpr;
				sqlOption.range = sqlOption.range || soar.range(1, _queryLimit);

				if (!isSqlFilter)
					sqlExpr.filters = buildSqlFilter(expr.filters, schema.columns);
				//console.log('The adjusted SQL expression is\n%s', JSON.stringify(sqlExpr, null, 2));

				// now we're ready to perform SQL query
				soar.execute( sqlOption, function(err, result) {
					if (err)
						cb(err);
					else  {
						//console.log('result of adjusted SQL:\n%s', JSON.stringify(result, null, 2));
						if (noColumnSpecified)  {
							// user does not specify what columns to be returned.
							// return all columns and json_columns are extracted/added
							mergeJsonColumns(result);
						}
						else  if (!isSqlCol)  {
							// add back those non-sql properties
							var  list = [];
							result.forEach(function(data) {
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

								list.push( data );
							});

							result = list;
						}
						//console.log('result before final filtering\n%s', JSON.stringify(result, null, 2));

						if (!isSqlFilter)  {
							// ok, let's run a JSON-FP program to get the final result
							var  rdQuery = {},
								 reducedF = reduceFilter(mainTable, expr.filters, schema.columns, colInfo.nc, option.query, rdQuery);
							//console.log('filter is\n%s', JSON.stringify(reducedF, null, 2));
							//console.log('query value is\n%s', JSON.stringify(rdQuery, null, 2));
							result = jsonQ.filter( result, reducedF, rdQuery );
						}

						if (colInfo.more.length)  {
							// remove auto-added columns
							var  rmc = colInfo.more;
							result.forEach(function(data) {
								for (var i in rmc)
									delete  data[rmc[i]];
							});
						}

						cb(null, result);
					}
				});
			}
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
	var  key = '_c_json';
	list.forEach(function(data) {
		try  {
			var  jobj = JSON.parse(data[key]);
			for (var k in jobj)
				data[k] = jobj[k];
		}
		catch (e)  {
			console.log( e.stack );
		}
		delete  data[key];
	});
};


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
		 jsonC = {};

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
				else  {
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
			else  if (!ncSet[whereC])  {
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
		var  colName = filter.name,
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
		cf = cloneObj( filter );

	return  cf;
};


function  reduceFilter(mainTable, filter, columns, nscols, query, rdQuery)  {
	if (filter.op === 'and')  {
		var  clones = [];
		filter.filters.forEach(function(f) {
			var  cf = reduceFilter(mainTable, f, columns, nscols, query, rdQuery);
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
		var  clones = [],
			 cf = {op: 'or', filters: clones};

		filter.filters.forEach(function(f) {
			var  cf = convertOrFilter(mainTable, f, columns, nscols, query, rdQuery);
			if (cf)
				clones.push( cf );
		});
		return  cf;
	}

	return  convertFilter(mainTable, filter, columns, nscols, query, rdQuery);
};


function  convertOrFilter(mainTable, filter, columns, nscols, query, rdQuery)  {
	if (filter.op === 'or' || filter.op === 'and')  {
		var  clones = [],
			 cf = {op: filter.op, filters: clones};

		filter.filters.forEach(function(f) {
			var  cf = convertOrFilter(mainTable, f, columns, nscols, query, rdQuery);
			if (cf)
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
		rdQuery[colName] = value;
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