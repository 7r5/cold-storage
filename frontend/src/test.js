/**
 * Destruct an object
 */
const destrObj = {
  firstName: 'Joe',
  lastName: 'Doe',
};

const { firstName, lastName } = destrObj;
const { firstName: name, lastName: last } = destrObj;
console.log(name); // John
console.log(last); // Doe

