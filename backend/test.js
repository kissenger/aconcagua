

gordon = { 'firstName': 'Gordon', 'lastName': 'Taylor'};
henry = { 'firstName': 'Henry', 'lastName': 'Kissenger'};

class Person {
	constructor(name) {
		this.firstName = name.firstName;
		this.lastName = name.lastName;
	}

	changeName(newName) {
		this.firstName = newName.firstName,
		this.lastName = newName.lastName
	}
}

person = new Person(gordon);
console.log(person.firstName + ' ' + person.lastName);
person.changeName(henry);
console.log(person.firstName + ' ' + person.lastName);




function matchNew(id) {

  /* do some stuff */

  // update database
  MongoPath.Match
    .replaceOne( {'_id': m._id}, thisMatch, {writeConcern: { j: true}})
    .then( (msg) => {
      console.log(msg);
      return true;
    });

}
