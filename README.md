# newsql
SQL or NoSQL? That's a question which has been asked by many developers. However, that's also a question without a definite answer. Instead of launching such a quest, why not just make an effort to combine the merits of the two?

With SQL, we get ACID (atomicity, consistency, isolation, durability) but the data model can be rather rigid. As to NoSQL, it trades ACID with flexibilities in data model (maybe scalability as well) and arguably has a cleaner programming interface. If we look at the real world applications, we may find that the data model we need is actully a mix of both. That is a data model is usually composed of a set of "inertia" properties that are shared by all data instances while there are some "variable" properties which are owned by just some of the data instances. Those variable properties could spread out like a long tail. Because of that we'll never find the "right" answer by going either way.

So here is the idea. We can use SQL to store the "inertia" properties and allocate a "JSON" column in a SQL table to store those "variable" properties. By doing so, we can eat the consistency fruits borne by SQL and have flexibilitis in schema, too. The only question is if we can provide a tool to query those "JSON" properties like NoSQL does?

It turns out the problem can be easily solved by [JSON-FP](https://github.com/benlue/jsonfp). Using the functional programming capabilities brought in by JSON-FP, queries on JSON properties can be done easily and effectively.

## Implementation
The implementation will be based on [JSON-FP](https://github.com/benlue/jsonfp) and mySQL. Expect to see a prototype in a few days.