function datatype(val: number | string){
    if(typeof val === "string"){
        return val.toLowerCase()
    }
    return val + 3
}


function provide_ID( id: string | null) {
    if(!id){
        console.log("Please provide ID");
        return
    }
    id.toLowerCase()
}

// ---> 1

function Print_All(str: string | string[] | null) {

    if(str){
        if(typeof str === "object") {
            for(const s of str){
                console.log(s);
            }
        } else if(typeof str === "string"){
            console.log(str);
        }
    }
}

// Next Level -------{ in } operator narrowing

interface User{
    name: string,
    email: string
}

interface Admin{
    name: string,
    email: string,
    isAdmin: boolean
}

function isAdmin(account: User | Admin){
    if("isAdmin" in account){
        return account.isAdmin
    }
}

