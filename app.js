const express = require('express');
const path= require('path');
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')
const upload  = require('./config/multerconfig')


const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());



app.get("/",(req,res)=>{
    res.render("index");
});

app.get("/profile/upload",isLoggedIn,(req,res)=>{
    res.render("profileupload");
})

app.post("/upload",isLoggedIn,upload.single("image"),async function(req,res){
    let user = await userModel.findOne({email:req.user.email});
    user.profilepic=req.file.filename;
    await user.save();
   res.redirect("/profile");
    
})

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
            res.status(200).redirect("/profile")
        }
        else{
            res.status(500).send("Invalid password")
        }
    })
});

app.get("/logout",function(req,res){
    res.cookie("token","")
    res.redirect("/login")
})

app.get("/profile",isLoggedIn,async (req,res)=>{
    //populate the user with the created posts
    let user = await userModel.findOne({email:req.user.email}).populate("post");
    
    res.render("profile",{user})
})

app.post("/post",isLoggedIn,async (req,res)=>{
    let user = await userModel.findOne({email:req.user.email})
    let post = await postModel.create({
        user:user._id,
        content:req.body.content
    })
    user.post.push(post._id)
    await user.save()
    res.redirect("/profile")
})

app.get("/like/:id",isLoggedIn,async (req,res)=>{
    // we are populating in order to load the field withh data rather than just the id
    let post = await postModel.findById(req.params.id).populate("user")
    
    if(post.likes.indexOf(req.user.userid)=== -1){
        post.likes.push(req.user.userid)
        
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
   
    await post.save()
    res.redirect("/profile");
})

app.get("/edit/:id",isLoggedIn,async (req,res)=>{
    // we are populating in order to load the field withh data rather than just the id
    let post = await postModel.findOne({_id:req.params.id}).populate("user")
    
    res.render("edit",{post})
    
})

app.post("/update/:id",isLoggedIn,async function(req,res){
    let post = await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content})
    res.redirect("/profile")
})

function isLoggedIn(req,res,next){
    if(req.cookies.token === "") res.redirect("/login");
    else{
        let data = jwt.verify(req.cookies.token,"Secret")
        req.user = data;
        console.log(req.user)
        next();
    }
    
}

app.listen(3000,(req,res)=>{
    console.log('Server is running on port 3000');
});

