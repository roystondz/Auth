const express = require('express');
const path= require('path');
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.get("/",(req,res)=>{
    res.render("index");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.post("/register",async (req,res)=>{
    const {name,email,password,age,username}=req.body
    let existingUser = await userModel.findOne({email});
    if(existingUser) return res.status(500).send("User already resgitered");

    bcrypt.genSalt(10,function(err,salt){
        bcrypt.hash(password,salt,async function(err,hash){
            let newUser = await userModel.create({
                name,
                email,
                age,
                username,
                password:hash
            });

            let token = jwt.sign({email:email,userid:newUser._id},"Secret")
            res.cookie("token",token)
            res.send("Registered")
        });
    });
});


app.post("/login",async (req,res)=>{
    const {email,password}=req.body
    let existingUser = await userModel.findOne({email});
    if(!existingUser) return res.status(500).send("Something went wrong");

    bcrypt.compare(password,existingUser.password,function(err,result){
        if(result){
            let token = jwt.sign({email:email,userid:existingUser._id},"Secret")
            res.cookie("token",token)
            res.status(200).send("Logged In")
        }
        else{
            res.status(500).send("Invalid password")
        }
    })
});

app.get("/logout",function(req,res){
    res.cookie("token","")
    res.redirect("/")
})

function isLoggedIn(req,res,next){
    if(req.cookies.token === "") res.send("You must be logged in");
    else{
        let data = jwt.verify(req.cookies.token,"Secret")
        req.user = data;
        next();
    }
    
}

app.listen(3000,(req,res)=>{
    console.log('Server is running on port 3000');
});

