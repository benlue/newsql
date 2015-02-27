newsql
======

SQL or NoSQL? That's a question having been asked by many developers. However, that may also be a question without a definite answer. With SQL, we get ACID (atomicity, consistency, isolation, durability) but the data model can be rather rigid. As to NoSQL, it trades ACID with flexibilities in data model (probably with better scalability as well) and arguably has a cleaner programming interface.

When we look at the real world applications, we may find that the data model we need is actully a mix of both. That is a data model is usually composed of a set of "inertia" properties that are shared by all data instances while there are some "variable" properties which are owned by just some of the data instances. Those variable properties could spread out like a long tail. With that observation, it's easy to see that we'll never find the "right" answer by going either way.

The good news is we may have a third option now. Image you can store data with properties not pre-defined as table columns. You can even query on those "undefined" properties. That will give you the benefits of NoSQL. On the other hand, **newsql** still exhibits the ACID properties and transactions are supported which are not available for NoSQL. Better yet, you can index any "undefined" properties whenever necessary. There are no limitations on how many indexes you can put on a table (or collection) as most NoSQL databases have imposed.

## Install

    npm install newsql
    
## Contents

+ [For NoSQL develpers](#nosqlDev)
+ [For SQL develpers](#sqlDev)
+ [Setup and configure](#newsqlConfig)
  + [The config.json file](#configFile)
  + [Configure programmatically](#configPro)
+ [APIs](#newsqlAPI)
  + [config()](#apiConfig)
  + [find()](#newsqlFind)
  + [insert()](#apiInsert)
  + [update()](#apiUpdate)
  + [del()](#apiDel)
  + [execute()](#apiExecute)
  + [getConnection()](#apiGetConn)
  + [sqlTemplate()](#sqlTemplate)
+ [How to do transactions](#transactions)
+ [Examples](#examples)
+ [The query filter](#queryFilter)

<a name="nosqlDev"></a>
## For NoSQL Developers
If you're a NoSQL developer and tired of maintaining data consistency in applications by yourself, **newsql** could be a perfect solution for you.

The way to program **newsql** is quite similar to program NoSQL. You can create a new collection by calling _newsql.createCollection()_. Below is the sample code:

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

For all CRUD operations, please refer to the [API](#newsqlAPI) section for details.

Underneath **newsql** is a relational database (mySQL), so you can get all the benefits of relational databases. You can even use SQL statements directly if you want. Also, a plethora of DBMS clients or management tools will be at your disposal.

<a name="sqlDev"></a>
## For SQL Developers
If you're SQL developers, guess you will be thrilled to be able to save data not pre-defined in your schema. Far too often we have to adjust a table schema just because we came across a new data instance which has a property we don't know how to fit into the existing schema. Now you can take those surprizing data instances without bothering to modify the schema. With **newsql**, you can still have everything in control but allow some flexibilities in your design. Below we'll touch the issues of managing tables, and CRUD operations will be explained in the [API](#newsqlAPI) section.

You can use **newsql** to crerate a table right inside your program as:

    var  newsql = require('newsql');
    
    newsql.createTable(schema, function(err) {
        if (err)
            // something went wrong
        else
            // a data collection has been created
    });

where _schema_ is a JSON object to describe the table schema. For details about how to define a table schema, you can refer to the [schema notation](https://github.com/benlue/soar/blob/master/doc/SchemaNotation.md).

You can also alter your table schema like the following:

    newsql.alterTable(schema, function(err) {
        if (err)
            // something went wrong
        else
            // table schema modified
    });
    
Again, the _schema_ parameter is a JSON object to describe the table schema. The [schema notation](https://github.com/benlue/soar/blob/master/doc/SchemaNotation.md) article will show you how to create them.

Dropping a table is just as easy:

    newsql.dropTable(schema, function(err) {
        if (err)
            // something went wrong
        else
            // table has been dropped
    });
    
It's also possible to find out the structure of a table. You can use _newsql.describeTable()_ to do a scan, and the result will be returned as a JSON object:

    newsql.describeTable(schema, function(err, schema) {
        if (err)
            // something went wrong
        else
            // table structure will be manifested in the schema object
    });

<a name="newsqlConfig"></a>
## Setup and configure
Before **newsql** do the magical things for you, you have to configure it to talk to the database. Below **newsql** is the mySQL DBMS, so you have to setup a mySQL database and configure **newsql** to work with that database.

Assuming you have setup mySQL and created a database called 'mySample', then you can configure **newsql** to access that database. Like [SOAR](https://github.com/benlue/soar), there are two ways to specify the database configuration: using a config file or doing it programmatically.

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
    	}
    }

where host is the database host and database is the database name. user and password are the database user name and password respectively. **newsql** will automatically turn on the connection pool for better performance.

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
                }
         };

    newsql.config( options );

<a name="newsqlAPI"></a>
## APIs
Below explains APIs of the current release. First, the config and CRUD operations followed by assistence functions:

<a name="apiConfig"></a>
### config()
You can use this function to setup database connections. Actually you have to invoke this function before doing any database access. **newsql** will look for a config.json file in the project root directory. For details about setting up database connections, please refer to [SOAR](https://github.com/benlue/soar#dbSetup).

<a name="newsqlFind"></a>
### find(expr, query, cb)
_expr_ is a SQL expression which can be built by [SQL templates](#newsqlAPI). SQL templates help you to describe which columns (properties) to retrieve and what query conditions to apply. _query_ is the actual value to be applied to the query condition. _cb(err, list)_ is a callback function which takes an error and an array of returned data. Below shows an example:

    var  newsql = require('newsql');
    
    var  expr = newsql.sqlTemplate('myTable').column('name')
                      .filter({name: 'age', op: '>'}).value();
                      
    newsql.find(expr, {age: 18}, function(err, list) {
    	// list will contain people whose age is greater than 18
    });

<a name="apiInsert"></a>
### insert(tbName, data, cb)
_tbName_ is the table to which data will be inserted. _data_ is a plain object containing data to be inserted. _cb(err, entityKey)_ is a callback function which takes an error and an _entityKey_ object. _entityKey_ is the object of table's primary key and the values of the newly inserted data. For NoSQL collections, _entityKey_ should look like {id: docID} where _docID_ is a distingished serial number for the inserted document.

<a name="apiUpdate"></a>
### update(tbName, data, filter, query, cb)
_tbName_ is the table name of updated data. _data_ is a plain object containing update data. _filter_ is a query filter. See [query filters](#queryFilter) for more details. _query_ is the actual value to be applied to the query condition. _cb(err)_ is a callback function which takes an error object (if errors occurred).

<a name="apiDel"></a>
### del(tbName, filter, query, cb)
_tbName_ is the table name of data to be deleted. _filter_ is a query filter. See [query filters](#queryFilter) for more details. _query_ is the actual value to be applied to the query condition. _cb(err)_ is a callback function which takes an error object (if errors occurred).

<a name="apiExecute"></a>
### execute(cmd, cb)
Besides the _find()_, _insert()_, _update()_, and _delete()_ functions, you can simple use _execute()_ to perform any of the CRUD operations. Actually, _find()_, _insert()_, _update()_, and _delete()_ are just wrappers around the _execute()_ function.

_cmd_ is a command object to the _execute()_ function. It has the following properties:

+ **op**: specifies which CRUD operations will be performed. It should be one of the following: 'query', 'list', 'insert', 'update' and 'delete'.
+ **expr**: a SQL expression which can be built using SQL templates. As shown in the sample code of [find()](#newsqlFind). This property is required for the 'query', 'list' and 'update' operations.
+ **data**: the actual data to be inserted or update. This property is only needed for the 'insert' and 'update' operation.
+ **query**: the actual values to be applied to the query condition. This property is required for the 'query', 'list', 'update' and 'delete' operations.
+ **conn**: a database connection object. You usually don't have to specify this property unless you want to do transactions.

<a name="apiGetConn"></a>
### getConnection(cb)
An asynchronous call to get a database connection. The callback function _cb_ could receive _err_ and _conn_ parameters. If the function call fails to obtain a connection, _cb(err)_ will be invoked. Otherwise, _cb(null, conn)_ will be invoked where _conn_ is the connection object.

<a name="sqlTemplate"></a>
### sqlTemplate(tbName)
Given a table name, this function will return a SQL template which can be used to effectively build SQL statements. This [document](https://github.com/benlue/soar#dynamicSQL) explains how to use SQL templates to compose SQL statements.

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
    
<a name="examples"></a>
## Example
Assuming you have a table created with the following statement:

    create table Person
    (
       Person_id            bigint not null auto_increment,
       name                 varchar(64),
       dob                  date,
       gender               tinyint,
       _c_json              text,
       primary key (Person_id)
    )
    engine = InnoDB;

You can insert an entry to the _Person_ table:

	var  newsql = require('newsql');
    var  data = {name: 'David', gender: 1, weight: 160};
    
    newsql.insert('Person', data, function(err, id) {
        console.log('ID of the newly added entry: %d', id);
    });

Wait a minute! We're saving the 'weight' property which is not defined in the schema!

Well, that's where **newsql** does the magic. It will save the 'weight' property even though the 'weight' property is not defined as a table column, and that property can later be retrieved as if it's a "normal" table column. You can actually save as many "undefined" properties as you wish. 

What's more, you can even query on those "undefined" properties. Below is an example:

    var  stemp = newsql.sqlTemplate('Person');
    stemp.column(['name', 'dob', 'gender', 'weight']).
    filter( {name: 'weight', op: '>'} );
    
    var  query = {weight: 200};
    newsql.find( stemp.value(), query, function(err, list) {
    	// list will return an array of those person who weights over 200 pounds
    });

In short, the above sample code will return a list of persons who weight over 200 pounds even though "weight" is not a defined table column. The SQL template serves as a tool to construct SQL statements. You can use a template's _column()_ function to specify the required properties of returned data objects and use _filter()_ to set the query condition. The _query_ object designates the actual value to be applied to the query condition (or the WHERE condition, if you're a SQL quy).

### Test cases
You can find more examples in test cases. To run those test cases, you have to setup a sample DB for those tests to run. The [test](https://github.com/benlue/newsql/tree/master/test) directory contains a schema.sql file to build the database schema and a data.sql file to load sample data. Remeber to put your own database user name and password in the config.json file at the package root.

<a name="queryFilter"></a>
## The query filter
A query filter specifies the query condition. Below is what a query filter looks like:

    {name: 'property_name', op: 'any_comparison_operator'}
    
Supported comparators include: =, !=, >, >=, <, <=, IS NULL, IS NOT NULL.

You can "AND" multiple query terms like the following:

    {op: 'and', filters: [{name: 'prop_A', op: 'op_A}, ...]}
    
"OR" multiple query terms can be done similarily:

    {op: 'or', filters: [{name: 'prop_A', op: 'op_A}, ...]}


## Implementation
The implementation is based on [JSON-FP](https://github.com/benlue/jsonfp) and mySQL. JSON-FP is used to solve object query problems. If necessary, the implementation can be extended to support other RDBMS.
