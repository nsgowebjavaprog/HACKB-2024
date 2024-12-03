/*
class User {
    email: string
    name: string
    readonly city: string = "Mumbai"

    constructor(email: string, name: string) {
        this.email = email;
        this.name = name
      }
  }

  // creating object

  const loni = new User("nsloni@200.com","nsloni")
  // loni.city = "Bangalore"
  */

  // private and public

  
class User {

    // setter
    private _courseCount = 1 

    // public email: string
    // private name: string
    readonly city: string = "Mumbai"

    constructor(public email: string,public name: string) {
        // this.email = email;
        // this.name = name
      }

      private deleteToken(){
        console.log("Token Deleted")
      }

      //getter
      get getAppleEmail(): string{
        return 'apple${this.email}'
      }

      get courseCount(): number{
        return this._courseCount
      }

      set courseCount(courseNum){
        if(courseNum <= 1){
            throw new Error("course count should be more than 1")
        }
        this._courseCount = courseNum
      }
  }

// protected

class SubUser extends User{
    isFamily: boolean =true
    changeCourseCount() {
        this._courseCount = 4
      }
}

  // creating object
  const loni = new User("nsloni@200.com","nsloni")
  // loni.city = "Bangalore"

//loni.deleteToken()