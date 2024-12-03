const express = require("express");
const pasth = require("path");
const bcrypt = require("bcrypt");
const collection = require("./config");

const app = express();

app.use(express.json());

app.use(express.urlencoded({extended: false}));

//EJS
app.set('view engine', 'ejs');

app.use(express.static("public"));

app.get("/", (req, res)=>{
    res.render("login");
});

app.get("/signup", (req, res) =>{
    res.render("signup");
});

//Reg--
app.post("/signup", async (req, res) => {
    const data = {
        name: req.body.username,
        password: req.body.password
    }
    //user already exit
    const existingUser = await collection.findOne({name: data.name});
    if(existingUser){
    res.send("User Already exists.");

    }else {

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    
    data.password = hashedPassword;

    const userdata = await collection.insertMany(data);
    console.log(userdata);

    }
});

//login

app.post("/login", async(req, res) => {
    try{
        const check = await collection.findOne({name: req.body.username});
        if(!check){
            res.send("uesr name cannot found");
        }
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if(isPasswordMatch){
            res.render("home")
        }else{
            req.send("WRONG PAssWORd");
        }
    }catch{
        res.send("WRONG DETAILS");
    }
});

const port = 5000;
app.listen(port, () =>{
    console.log(`Server running on Port: ${port}`);
})