function User(name, age){

    this.name = name;
    this.age = age;
    this.displayInfo = function(){

        return (`Имя: ${this.name}  Возраст: ${this.age}`);
    }
}

User.prototype.sayHi = function() {
    return (`Привет, меня зовут ${this.name}`);
};


module.exports = User;