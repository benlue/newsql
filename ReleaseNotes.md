## 0.1.2

+ If table columns are specified in the SQL exprssion to the _insert()_ or _update()_ function call, the input data will be filtered using the table columns specified before being written to the database.

## 0.1.1

+ Full support of query objects.

## 0.1.0

+ The _find()_ function will always return all the qualified entries. In the eariler releases, you may get only partial results if your query is mostly on NoSQL columns.

+ Some of the APIs have been revised to make it even easier to use. 

## 0.0.8

+ Fixed a bug which could possibly lose not pre-defined clumn (property) values if not all of the un-predefined properties are updated.

## 0.0.7

+ Fixed a bug which failed to release db connections and caused **newsql** to stall.

## 0.0.6

+ Fixed a bug when doing deeply compounded query (AND/OR filters).

## 0.0.5

+ Existing SQL tables can be automatically converted to become **newsql** compatible. This can be turned off by _config({autoConvert: false})_.

+ taking advantages of the latest SOAR release (1.1.6) for performance improvement.

+ changing the signature of the _execute()_ function so it's easier to reuse SQL templates. The old format still works, but is deprecated.

## 0.0.4

+ Made table join work.

## 0.0.3

+ Create or update tables (collections) programmatically.

## 0.0.2

+ The first implementation released.