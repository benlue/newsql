newsql
======

SQL or NoSQL? That's a question which has been asked by many developers. However, that's also a question without a definite answer. The good thing is we may have a third option now. Image you can store data with properties not defined as table columns. You can even query data on those "undefined" properties.

## How it's done
With SQL, we get ACID (atomicity, consistency, isolation, durability) but the data model can be rather rigid. As to NoSQL, it trades ACID with flexibilities in data model (probably with better scalability as well) and arguably has a cleaner programming interface.

When we look at the real world applications, we may find that the data model we need is actully a mix of both. That is a data model is usually composed of a set of "inertia" properties that are shared by all data instances while there are some "variable" properties which are owned by just some of the data instances. Those variable properties could spread out like a long tail. Because of that we'll never find the "right" answer by going either way.

So here is the idea. We can use SQL to store the "inertia" properties and allocate a "JSON" column to store those "variable" properties. By doing so, we can eat the consistency fruits borne by SQL and have a very flexible schema, too. The only question is if we can provide a tool to query those "JSON" properties like NoSQL does? It turns out... to be feasible.

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

Wait a minute! Where does the 'weight' property come from? It's not defined in the schema!

Well, that's where **newsql** does the magic. It will save the 'weight' property even though the 'weight' property is defined as a table column, and that property can later be retrieved as if it's a "normal" table column. You can actually save as many "undefined" properties as you wish. 

What's more, you can even query on those "undefined" properties. Below is an example:

    var  sbi = newsql.sqlBuildInfo('Person');
    sbi.column(['name', 'dob', 'gender', 'weight']).
    filter( {name: 'weight', op: '>'} );
    
    var  query = {weight: 200};
    newsql.find( sbi.value(), query, function(err, list) {
    	// list will return an array of those person who weights over 200 pounds
    });

In short, the above sample code will return a list of persons who weight over 200 pounds even though "weight" is not a defined table column. The _sbi_ object serves as a tool to construct SQL statements. You can use _sbi.column()_ to specify the required properties of returned data objects and use _sbi.filter()_ to set the query condition. The _query_ object designates the actual value to be applied to the query condition (or the WHERE condition, if you're SQL quy).

So, that' pretty amazing. You can save, retrieve and even query on properties which are not defined as table columns.

### Test cases
You can find more examples in test cases. To run those test cases, you have to setup a sample DB for those tests to run. The [test](https://github.com/benlue/newsql/tree/master/test) directory contains a schema.sql file to build the database schema and a data.sql file to load sample data.

## API
The current release supports the following APIs:

### newsql.config()
You can use this function to setup database connections. Actually you have to invoke this function before doing any database access. **newsql** will look for a config.json file in the project root directory. For details about setting up database connections, please refer to [SOAR](https://github.com/benlue/soar#dbSetup).

### newsql.sqlBuildInfo(tbName)
Given a table name, this function will return a SBI (SQL Build Info) object will can be used to effectively build SQL statements. This [document](https://github.com/benlue/soar#dynamicSQL) explains how to use SBI to compose SQL statements.

### newsql.find(expr, query, cb)
_expr_ is a SQL expression which can be obtained by calling _sbi.value()_. _expr_ contains such information as what data properties (columns) should be returned and what are the query conditions. _query_ is the actual value to be applied to the query condition. _cb(err, list)_ is a callback function which takes an error and an array of returned data.

### newsql.insert(tbName, data, cb)
_tbName_ is the table where data will be inserted. _data_ is a plain object containing data to be inserted. _cb(err, id)_ is a callback function which takes an error and an id. _id_ is the primary key value of the newly inserted data if the primary key is a auto-incremented integer column.

### newsql.update(tbName, data, filter, query, cb)
_tbName_ is the table name of updated data. _data_ is a plain object containing data to be inserted. _filter_ is a query filter. See [this](#queryFilter) for more details. _query_ is the actual value to be applied to the query condition. _cb(err, list)_ is a callback function which takes an error object (if errors occurred).

### newsql.del(tbName, filter, query, cb)
_tbName_ is the table name of data to be deleted. _filter_ is a query filter. See [this](#queryFilter) for more details. _query_ is the actual value to be applied to the query condition. _cb(err, list)_ is a callback function which takes an error object (if errors occurred).

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
The implementation is based on [JSON-FP](https://github.com/benlue/jsonfp) and mySQL. JSON-FP is used to solve object query problems. The implementation can be extended to support other RDBMS without too many difficulties.

### Friendly Reminder
The implementation is still in very early stage. You do not want to put it in your production application. However, if you find bugs, you can create an issue on [github](https://github.com/benlue/newsql/issues).