newsql
======

SQL or NoSQL? That's a question having been asked by many developers. With SQL, we get the ACID (atomicity, consistency, isolation, durability) benefits but the data model can be rather rigid. As to NoSQL, its data model is very flexible at the cost of losing the ACID characteristics.

When we look at the real world applications, we may find that data models are usually a mix of both. That is a data model is usually composed of a set of "inertia" properties which are shared by all data instances and there are "variable" properties which are owned by just some of the data instances. Those variable properties could spread out like a long tail. With that observation, it's easy to see that we'll never find the "right" answer by going either way.

The good news is you may have a solution. **newsql** allows you to store data with properties not defined as table columns. You can even query on those "undefined" properties. That will give you the benefits of NoSQL. On the other hand, **newsql** still exhibits the ACID characteristics and transactions are supported which are not available for NoSQL. Better yet, you can index any "undefined" properties whenever necessary. There are no limitations on how many indexes you can put on a table (or collection) as most NoSQL databases have difficulties in offering them.

## What's New
Detailed info of each release is described in [release notes](https://github.com/benlue/newsql/blob/master/ReleaseNotes.md). Below are some highlights:

+ Full support of [query objects](https://github.com/benlue/sql-soar/blob/master/doc/QueryObject.md) (0.1.1).

+ Some APIs have been revised to make them even easier to use. As a result, v 0.1.0 will not be compatible with earlier releases.

+ **newsql** can now correctly access your existing mySQL tables. If you try to update your existing tables with **newsql**, **newsql** will automatically convert your table to be newsql enbaled. You can turn this feature off (0.0.5).

+ The signature of the _execute()_ function was changed to make it easier to resue SQL templates. The old format still works, but is deprecated (0.0.5).

+ **newsql** can do something most (if not all) NoSQL databases can not do: indexing properties of documents whenever you need to. **newsql** provides a _indexProperty()_ function to index a property when a performance boost is needed (0.0.4).

## Install

**newsql** uses mySQL as the underlying database engine. Throughout this document, we'll assume you have installed the mySQL database. With mySQL up and running, you can add the **newsql** features:

    npm install newsql
    
## Contents

+ [For NoSQL develpers](#nosqlDev)
+ [For SQL develpers](#sqlDev)
+ [Setup and configure](#newsqlConfig)
  + [The config.json file](#configFile)
  + [Configure programmatically](#configPro)
+ [SQL expressions](#sqlExpr)
+ [APIs](#newsqlAPI)
  + [SQL expressions APIs](#sqlExprAPI)
    + [newsql.sql()](#soarSBI)
    + [expr.join()](#sbiJoin)
    + [expr.column()](#sbiColumn)
    + [expr.filter()](#sbiFilter)
    + [newsql.chainFilters()](#sbiChainFilter)
    + [expr.extra()](#sbiExtra)
  + [Data manipulation APIs](#dtManiAPI)
    + [findOne()](#findOne)
    + [find()](#newsqlFind)
    + [insert()](#apiInsert)
    + [update()](#apiUpdate)
    + [del()](#apiDel)
    + [execute()](#apiExecute)
  + [Schema management APIs](#schMgnAPI)
    + [createTable()](#createTable)
    + [alterTable()](#alterTable)
    + [dropTable()](#dropTable)
    + [describeTable()](#describeTable)
    + [createCollection()](#createCol)
    + [dropCollection()](#dropCol)
    + [indexProperty()](#apiIndexProp)
    + [removeIndex()](#apiRmIndex)
+ [How to do transactions](#transactions)
+ [How to do table join](#newsqlJoin)
+ [The query filter](#queryFilter)

<a name="nosqlDev"></a>
## For NoSQL Developers
If you're a NoSQL developer and weary of maintaining data consistency in applications by yourself, **newsql** could be a perfect solution for you.

The way to program **newsql** is quite similar to program NoSQL (such as MongoDB). You can create a new collection by calling _newsql.createCollection()_. Below is the sample code:

    var  newsql = require('newsql');
    
    newsql.createCollection('colName', function(err) {
        if (err)
            // something went wrong
        else
            // a data collection has been created
    });
    
where 'colName' is the name of your data collection. 

To remove a collection is just as simple:

    newsql.dropCollection('colName', function(err) {
        if (err)
            // something went wrong
        else
            // the 'colName' collection has been removed
    });
    
To insert a document to a collection, you can

    newsql.insert('colName', document, function(err, docKey) {
    });

where 'document' is a JSON object containing data to be inserted.

For all query operations (find, insert, update, and delete), please refer to the [APIs](#newsqlAPI) section for details.

Underneath **newsql** is a relational database (mySQL), so you'll have all the benefits of relational databases. On the other hand, **newsql** adds a layer on top of mySQL so you can use if as if it's a NoSQL database. You can even use SQL statements directly if you want. Also, a plethora of DBMS clients or management tools are available to help you manage or inspect your databases.

<a name="sqlDev"></a>
## For SQL Developers
If you're SQL developers, you could use **newsql** as a wrapper around databases so you don't have to hand-code SQL statements. What's more, it allows you to store and retrieve properties which have not been defined as table columns. Later on, if those "undefined" properties are popular enough, you can "raise" those properties to be table columns. **newsql** can automatically perform the necessary data migration for you.

You can use **newsql** to access your existing tables. Assuming you have a table named 'Person', you can find all persons with age equal to 25 by:

    newsql.find('Person', {age: 25}, function(err, list) {
        // list is an array containing people of age 25
    });
    
Or you want to find out all persons with age greater than 25. Then you can:

    newsql.find('Person', {age: {op: '>', value: 25}}, function(err, list) {
    	// list is an array containing people older than 25
    });

Inserting entries to a table is just as simple:

    var  data = {
                   name: 'Andy',
                   age: 32
                };
                
    newsql.insert('Person', data, function(err, pk) {
        // pk is an object with primary keys and values of the
        // newly inserted entry.
    });
    
Up to this point, **newsql** is like a handy tool to save you from hand-coding sql statements, but it's not what **newsql** is about. The power of **newsql** is to accommodate data properties not defined as columns.

Assuming our examplary 'Person' table is defined as below:

    CREATE TABLE Person (
        id  bigint not null auto_increment,
        name  varchar(32),
        age   smallint,
        primary key (id)
    ) engine = InnoDB;

You're happy with its schema until someday you find out there is one out of a few thousands data instances that has a property named 'salary'. To save person's salary you may consider to add a new column named 'salary':

    ALTER TABLE ADD salary int;
    
Ok. That seems to solve the problem, but as your application grow more and more pupular you find out a few persons have a 'hobby' property. What would you do this time? Add another table column? You may but you also realize keep adding table columns is not a good solution and one day your table will be full of columns which are rarely used and you may even forget what they are about.

This is the time when **newsql** will be helpful. **newsql** allows you to save properties which are not defined as table columns. Assuming you keep the 'Person' table schema intact, you can do the following:

    newsql.update('Person', {hobby: 'jogging'}, {id: 1}, function(err) {
    });
    
to add a "jogging" hobby for person #1. You can even query on this "undefined" hobby proeprty:

    newsql.find('Person', {hobby: 'jogging'}, function(err, psnList) {
        // psnList contains persons whose hobby is 'jogging'
    });

If it turns out the "hobby" property becomes popular and are queried frequently, you can also index it for better performance:

    var  colSpec = {
             type: 'string',
             maxLength: 64
         };
         
    newsql.indexProperty('Person', 'hobby', colSpec, function(err) {
    });
    
The above example actually defines a new column 'hobby' to the 'Person' table. What is more, **newsql** will move data to this new column and index them.

<a name="newsqlConfig"></a>
## Setup and configure
Before **newsql** do the magical things for you, you have to configure it to talk to the database. Beneath **newsql** is the mySQL DBMS, so you have to setup a mySQL database and configure **newsql** to work with that database.

There are two ways to specify the database configuration: using a config file or doing it programmatically.

<a name="configFile""></a>
### The config.json file
In the newsql package root directory, there is a **config.json** file to specify database connection parameters. It looks like the following:

    {
    	"dbConfig": {
    		"host"     : "127.0.0.1",
    		"database" : "mySample",
    		"user"     : "your_acc_name",
    		"password" : "your_passwd",
    		"supportBigNumbers" : true,
    		"connectionLimit"   : 32
    	},
        "autoConvert": true
    }

where host is the database host and database is the database name. user and password are the database user name and password respectively. **newsql** will automatically turn on the connection pool for better performance.

_autoConvert_ is a flag to instruct **newsql** if it should automatically convert a plain SQL table to be newsql enabled. If you don't want **newsql** to do that, you can set _autoConvert_ to false. However, by setting _autoConvert_ to false you'll not be able to save undefined properties to your existing tables (you can still save undefined properties to tables created by **newsql**). _autoConvert_ is default true.

<a name="configPro""></a>
### Configure programmatically
You can configure the database connection settings right inside your node program. Here is how:

    var  newsql = require('newsql');
    var  options = {
            dbConfig: {
                "host"     : "127.0.0.1",
                "database" : "mySample",
                "user"     : "your_acc_name",
                "password" : "your_passwd",
                "supportBigNumbers" : true,
                "connectionLimit"   : 32
            },
            "autoConvert": true
         };

    newsql.config( options );

<a name="sqlExpr"></a>
## SQL Expressions

You can use SQL expressions to instruct **newsql** how to talk with databases. With SQL expressions, you can compose and reuse SQL queries in a clean and managable way. In essence, SQL expressions are nothing more than SQL statements encoded as a JSON object. An example should help to understand what is a SQL expression:

    var  expr = newsql.sql('Person')
                      .column(['id', 'addr AS address', 'age'])
                      .filter( {name: 'age', op: '>='} )
                      .extra( 'ORDER BY id' );
    
The above sample code just constructed a SQL expression. You can use it to do a database query:

    var  cmd = {
    	    op: 'list',
    	    expr: expr
         },
         query = {age: 18};
    
    newsql.execute(cmd, query, function(err, list) {
    	// 'list' is the query result
    });

That's equivalent to:

    SELECT id, addr AS address, age
    FROM Person
    WHERE age >= 18;
    
"Well, that's nice but what's the befenit?" you may ask. The magic is you can use the same SQL expression in update:

    var  cmd = {
            op: 'update',
            expr: expr
         };
         
    newsql.execute(cmd, {canDrive: true}, {age: 18}, callback);

Actually, the same SQL expressions can be used in all CRUD operations. **newsql** is smart enough to retrieve the needed information from a SQL expression and compose the SQL statement you want.

Assuming you're satisfied, below is how to construct a SQL expression: _newsql.sql(tableName)_ takes a table name as its input and returns a **SQL Expression** object. With that object, you can add columns, set query conditions and specify addtional options. Most SQL expression functions will return the expression object itself, so you can chain funcion calls such that SQL expressions can be composed succintly.

<a name="newsqlAPI"></a>
## APIs
Below explains the **newsql** APIs.


<a name="sqlExprAPI"></a>
### SQL expression APIs

<a name="soarSBI"></a>
#### newsql.sql(tableName)

This function returns a SQL expression. _tableName_ is the name of a table.

Example:

    var  expr = newsql.sql('myTable');

<a name="sbiJoin"></a>
#### expr.join(joinExpr)
With the SQL expression obtained from the _soar.sql()_ funciton call, you  can use its _join()_ function to specify table joins.

Example:

    var  expr = newsql.sql('myTable AS myT')
                      .join({
                          table: 'Location AS loc', 
                          onWhat: 'myT.locID=loc.locID'
                       });
    
If you want to make multiple joins, just call _join()_ as many times as you need. The parameter to the _join()_ function call is a plain JSON object with the following properties:

+ table: name of the joined table.
+ type: if you want to make a left join, you can set this property to 'LEFT'.
+ onWhat: the join clause. If the _use_ property described below is specified, this property will be ignored.
+ use: the common column name to join two tables.

<a name="sbiColumn"></a>
#### expr.column(column)
This function can be used to add table columns to a SQL expression. To add a single column, the parameter is the name of the column. If you want to add multiple columns, the parameter should be an array of column names.

Example:

    var  expr = newsql.sql('Person')
                      .column(['name', 'age', 'weight']);

<a name="sbiFilter"></a>
#### expr.filter(filter)
This function is used to set query conditions (filter) of a SQL expression. The parameter to the function call is a plain JSON object with the following properties:

+ name: name of the filter. It's also used as the key to retrieve the query value from a query object. This property is required.
+ field: the real column name in a table. If this property is missing, the _name_ property will be used instead.
+ op: what comparator to be used. It can be '>', '=' or 'IS NULL', etc.
+ noArg: when a query operation does not require argument (e.g. IS NULL), this property should be set to true.

Note that this function should be called just once for a SQL expression. When called multiple times, the new setting will replace the old one.

Example:

    var  expr = newsql.sql('Person')
                      .filter({name: 'age', op: '>='});

<a name="sbiChainFilter"></a>
#### newsql.chainFilters(op, filters)
If you want to make a compound filter (ANDed or ORed filters), this is the function you need. _op_ should be 'AND' or 'OR', and _filters_ is an array of filters.

Example:

    var  orFilters = newsql.chainFilters('OR', [
            {name: 'region', op: '='},
            {name: 'age', op: '>'}
         ]);
         
    var  expr = newsql.sql('myTable')
                      .filter( orFilters );

The resulting filter (orFilters) is a compound filter ORing two filters (region and age).

<a name="sbiExtra"></a>
#### expr.extra(extra)
This function can add extra options to a SQL statement. _extra_ is a string with possible values like 'GROUP BY col_name' or 'ORDER BY col_name'.

Example:

    var  expr = newsql.sql('myTable')
                      .extra('ORDER BY region');


<a name="dtManiAPI"></a>
### Data manipulation APIs

<a name="newsqlFind"></a>
#### find(expr, query, cb)
**_expr_** can be the table name (collection name) or a SQL expression which can be built by [newsql.sql()](#soarSBI). **_query_** is the actual value to be applied to the query condition. **_cb(err, list)_** is a callback function which receives an error (if any) and an array of returned data.

Example:

    var  expr = newsql.sql('myTable')
                      .column('name')
                      .filter({name: 'age', op: '>'});
                      
    newsql.find(expr, {age: 18}, function(err, list) {
    	// list will contain people whose age is greater than 18
    });

In the above example, we use a SQL expression to compose a query  which is almost the same as the following SQL statement:

    SELECT name FROM myTable WHERE age > 18;
    
The above example can be programmed in a more concise way:

	var  query = {age: {op: '>', value: 18}};
	
    newsql.find('myTable', query, function(err, list) {
    	// list will contain people whose age is greater than 18
    });

This time, every table columns will be returned instead of just the 'name' column. Also, we use a query object to specify the query condition. To fully explore the features of query objects, please refer to this [short article](https://github.com/benlue/sql-soar/blob/master/doc/QueryObject.md).

<a name="findOne"></a>
#### findOne(expr, query, cb)
If you exepct your query should return just one data instance, you can use _findOne()_ instead of _find()_ . **_expr_** can be the table name (collection name) or a SQL expression which can be built by [newsql.sql()](#soarSBI). **_query_** is the actual value to be applied to the query condition. **_cb(err, list)_** is a callback function which receives an error (if any) and an array of returned data.

Example:

    var  expr = newsql.sql('myTable')
                      .column('name');
                      
    newsql.findOne(expr, {age: 18}, function(err, data) {
    	// data is an object of people whose age is equal to 18
    });

In the above example, we use a SQL expression to compose a query  which is almost the same as the following SQL statement:

    SELECT name FROM myTable WHERE age = 18;

<a name="apiInsert"></a>
#### insert(expr, data, cb)
The _insert()_ function can insert an entity to a table or add a document to a collection (depending on you view it as a SQL or NoSQL operation). **_expr_** can be the table name (collection name) which a new entry will be inserted into or a SQL expression which can be built by [newsql.sql()](#soarSBI). **_data_** is a plain JSON object containing data to be inserted. _cb(err, entityKey)_ is a callback function which recevies an error (if any) and an **_entityKey_** object. **_entityKey_** is the object of table's primary keys and their values from the newly inserted entity. For NoSQL collections, **_entityKey_** should look like {id: docID} where **_docID_** is a serial number for the inserted document.

Example:

    var  data = {
                 name: 'David',
                 dob: '1988-12-05',
                 skill: ['node.js', 'Java']
                 };
                 
    newsql.insert('Person', data, function(err, pk) {
        if (err)
            console.log( err.stack );
        else {
            // a person added, see what's the primary key value
            // of this newly added entry:
            console.log( JSON.stringify(pk, null, 4) );
        }
    });

<a name="apiUpdate"></a>
#### update(expr, data, query, cb)
The _update()_ function can update a table entity or a doument in a colletion. **_expr_** can be the table name (collection name) whose data will be updatd or a SQL expression which can be built by [newsql.sql()](#soarSBI). **_data_** is a plain object containing update data. **_query_** is the actual value to be applied to the query condition. **_cb(err)_** is a callback function which receives an error object (if errors occurred).

Example:

    var  data = {status: 'health check'},
         query = {weight: {op: '>', value: 300}};
         
    newsql.update('Person', data, query, function(err) {
        if (err)
            console.log( err.stack );
        else
            // update successfully
    });

The above example is similar to the following SQL statement:

    UPDATE Person SET status='health check'
    WHERE weight > 300;
    
<a name="apiDel"></a>
#### del(tbName, query, cb)
The _del()_ function can delete table entities or documents. **_expr_** can be the table name (collection name) whose data will be deleted or a SQL expression which can be built by [newsql.sql()](#soarSBI). **_query_** is the actual value to be applied to the query condition. _cb(err)_ is a callback function which receives an error object (if errors occurred).

Example:

    var  query = {status: 'closed'};
         
    newsql.del('PurchaseOrder', query, function(err) {
        if (err)
            console.log( err.stack );
        else
            // delete successfully
    });

The above example is equivalent to the following SQL statement:

    DELETE FROM PurchaseOrder
    WHERE status = 'closed';
    
<a name="apiExecute"></a>
#### execute(cmd, data, query cb)
Besides the _find()_, _insert()_, _update()_, and _del()_ functions, you can also use _execute()_ to perform any of the above CRUD operations. Actually, _find()_, _insert()_, _update()_, and _delete()_ are just wrappers which call the _execute()_ function.

The **_data_** parameter is a JSON object which contains data to be inserted or updated to a table (or documents). The **_query_** parameter is a JSON object which specifies actual query values. **_cmd_** is a command object to the _execute()_ function. It has the following properties:

+ **op**: specifies which CRUD operations will be performed. It should be one of the following: 'query', 'list', 'insert', 'update' and 'delete'.
+ **expr**: a SQL expression which can be built by the _newsql.sql()_ function.
+ **conn**: a database connection object. You usually don't have to specify this property unless you want to do transactions.

If the **_data_** parameter is not needed (for example, query, list and delete), the function can be simplified to _execute(cmd, query, cb)_.

_cb_ is the callback function which receives an error (if any) and sometimes a result object (when it's a query, list or insert operation).


<a name="schMgnAPI"></a>
### Schema management APIs

<a name="createTable"></a>
#### createTable(schema, cb)
You can use **newsql** to crerate a table right inside your program as:

    newsql.createTable(schema, function(err) {
        if (err)
            // something went wrong
        else
            // a data collection has been created
    });

where _schema_ is a JSON object to describe the table schema. For details about how to define a table schema, you can refer to the [schema notation](https://github.com/benlue/sql-soar/blob/master/doc/SchemaNotation.md).

<a name="alterTable"></a>
#### alterTable(schema, cb)
You can also alter your table schema like the following:

    newsql.alterTable(schema, function(err) {
        if (err)
            // something went wrong
        else
            // table schema modified
    });
    
Again, the _schema_ parameter is a JSON object to describe the table schema. The [schema notation](https://github.com/benlue/sql-soar/blob/master/doc/SchemaNotation.md) article will show you how to create them.

<a name="dropTable"></a>
### dropTable(tableName, cb)
Dropping a table is just as easy:

    newsql.dropTable(tableName, function(err) {
        if (err)
            // something went wrong
        else
            // table has been dropped
    });
  
<a name="describeTable"></a>
### describeTable(tableName, cb)
It's also possible to find out the structure of a table. You can use _newsql.describeTable()_ to do a scan, and the result will be returned as a JSON object:

    newsql.describeTable(schema, function(err, schema) {
        if (err)
            // something went wrong
        else
            // table structure will be manifested in the schema object
    });

<a name="createCol"></a>
### createCollection(colName, cb)
This function can be use to create a new colletion (the NoSQL equivalent to SQL table). The difference between this function and the _createTable()_ function is that _createCollection()_ does not require you to specify table schema.

<a name="dropCol"></a>
### dropCollection(colName, cb)
This function is to remove a collection. This function is actually the same as _dropTable()_, but is provided to make it easy for NoSQL developers.

<a name="apiIndexProp"></a>
#### indexProperty(colName, propName, propType, cb)
This is a great tool for NoSQL developers. When working with NoSQL databases, sometimes you'd want to index a document property to improve query performance when your data grow big. Unfortunately, that's something NoSQL databases would fall short.

With **newsql**, you can index (almost) any property you like by calling the _indexProperty()_ method on the property which you would like to index. The function takes four parameters. **_colName_** is the name of the collection and **_propName_** is the name of the property to be indexed. **_propTyoe_** is a JSON object specifying the data type of a property so it can be properly indexed. The **_propTyoe_** parameter has three properties of its own:

+ **type**: data type of a property. Possible values are 'boolean', 'integer', 'number', and 'string'. This is required.
+ **format**: provides additional information about the data type of a property. If the data type is 'integer', format can be 'int8', 'int16', or 'int64' and those will be mapped to 'tinyint', 'smallint' and 'bigint' respectively. If the data type is 'number', format can be 'double', 'float' or 'decimal(n,s)'. For 'string' data type, format can be 'text'.
+ **maxLength**: if data type is 'string', this property can be used to specify the maximum length of a string property. For example, {type: 'string', maxLength: 32} means it's a string property with length no longer than 32. That's actually what we call varchar(32) in SQL.

Let's have some sample code below:
    
    newsql.indexProperty('PersonDoc', 'weight', 
                         {type: 'integer'}, function(err) {
        if (err)
            console.log( err.stack );
        else
            // we've truned the weight property into indexed
    });
   
<a name="apiRmIndex"></a>
#### removeIndex(colName, propName, cb)
Contrary to _indexProperty()_, this function remove an index (the property data will NOT be lost). This function should be rarely used.
 
<a name="transactions"></a>
## How to do transactions
Doing transaction is faily simple. All you need to do is to obtain a database connection and pass it to _newsql.execute()_. Below is the sample code:

    var  expr = newsql.sqlTemplate('Perons').value();
    
    newsql.getConnection( function(err, conn) {
        // remember to specify database connection in 'option'
        var  option = {
            op: 'insert',
            expr: expr,
            data: {name: 'Scott Cooper'},
            conn: conn
        };
            
        conn.beginTransaction(function(err) {
            newsql.execute(option, function(err, data) {
                if (err)
                    conn.rollback();
                else
                    conn.commit();
            });
        };
    });
    
<a name="newsqlJoin"></a>
## How to do table join
Just like relational databases, **newsql** supports table join. Even if you use **newsql** in NoSQL style, you can join collections if you store docyment keys of one collection in another.

The following sample code shows how to do table join with **newsql**:

    var  expr = newsql.sql('Person AS psn')
                      .join( {table: 'Company AS cpy', 
                              onWhat: 'psn.workFor=cpy.Company_id'})
                      .column(['name', 'salary', 'cpy.name AS companyName']).
                      .filter({name: 'cpy.size', op: '>'});
         
The above SQL template is the same as:

    SELECT name, salary, cpy.name AS companyName
    FROM Person AS psn
    JOIN Company AS cpy on psn.workFor=cpy.Company_id
    WHERE cpy.size > ?;
    
So it's almost the same as SQL table join as you might have already observed. However, there is one big difference to pay attention to: when doing SQL join, column names do not have to be prefixed with table name if there are no ambiguities. In **newsql**, you always have to prefix a column name with its table name if the column is not of the base table. That's because **newsql** allows you to read/write properties not defined as table columns. As a result, when a column name is not prefixed with its table name, **newsql** will treat it as the "undefined" properties of the base table instead of trying to interpret the column as belonging to the joined table(s).

In short, when doing join in **newsql** always prefix columns of non-base tables with their table name.

## Test cases
You can find more examples in test cases. To run those test cases, you have to setup a sample DB for those tests to run. The [test](https://github.com/benlue/newsql/tree/master/test) directory contains a schema.sql file to build the database schema and a data.sql file to load sample data. Remeber to put your own database user name and password in the config.json file at the package root.


## Implementation
The implementation is based on [JSON-FP](https://github.com/benlue/jsonfp) and mySQL. JSON-FP is used to solve object query problems. If necessary, the implementation can be extended to support other RDBMS.
