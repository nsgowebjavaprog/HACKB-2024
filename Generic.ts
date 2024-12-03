/*

const score: Array<number> = []
const names: Array<string> = []

function identity_one(val: boolean | number): boolean | number{
    return val
}

function identity_two(val: any): any{
    return val
}

function identity_three<Type>(val: Type): Type{
    return val
}

// identity_three('3')

function identity_four<T>(val: T): T {
    return val
}
identity_four('a')
identity_four(9)
identity_four(true)


/*
interface Loni{
    brand: string,
    type: number
}
identity_four<Loni>({})


// Array with Generic Solution


function get_search_products<T>(products: T[]): T{
    return products[8]
}

// Generic Classes

interface DataBase {
    connection: string,
    username: string,
    password: string 
}

function Another_Function<T, U extends DataBase>(Val_One: T, Val_Two: U):object {
    return {
        Val_One,
        Val_Two
    }
}
Another_Function(2,"error")
*/

interface Quiz{
    name: string,
    type: string
}
interface Course{
    name: string,
    author: string,
    subject: string
}

class Sellable<T>{
    public cart: T[] = []

    add_to_cart(product: T){
        this.cart.push(product)
    }
}