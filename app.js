
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const ejs = require("ejs");
const mongoose = require("mongoose");
const date = require(__dirname + "/date.js");
const cors = require("cors");
const nodemailer = require("nodemailer");
const multiparty = require("multiparty");
const passport = require("passport");
var session = require('express-session')

const passportLocalMongoose = require("passport-local-mongoose");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors({ origin: "*" }));

app.set("view engine","ejs");

app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));

app.use(session({
  secret : process.env.SECRET,
  resave : false,
  saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/blogDB");

const userSchema = new mongoose.Schema({
  email:String,
  password:String
})

const dataSchema = new mongoose.Schema({
  title: String,
  content: String,
  name :String,
  itname : String,
  liname : String,
  items : [{name : String}]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const Item = mongoose.model("Data",dataSchema);

const List = mongoose.model("Data",dataSchema);


const Post = mongoose.model("Data", dataSchema);


app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.post("/login",function(req,res){
  const user = new User({
username:req.body.username,
password: req.body.password
  });
  req.login(user,function(err){
    if(err){
      console.log(err);
      res.redirect("/login");
    }
    else {
      passport.authenticate("local")(req,res,function(){
        res.redirect("/");
      });
    }
  });
});

app.get("/logout",function(req,res){
  req.logout(function(err) {
   if (err) { return next(err); }
   res.redirect('/');
 });
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
    res.redirect("/");
      })
    }
  });
});

app.get("/",function(req,res){
  if(req.isAuthenticated()){
    Post.find({}, function(err, posts){
      res.render("home",{
        posts :posts
      });
    })

  }else {
    res.redirect("/login");
  }

});

app.get("/compose",function(req,res){
  if(req.isAuthenticated()){
    res.render("compose");
  }else {
    res.redirect("/login");
  }
});

app.post("/compose",function(req,res){
  const post = new Post({
    title: req.body.title,
    content: req.body.content
  });
  post.save();
  res.redirect("/");
});

app.get("/posts/:postId",function(req,res){
  const requestedPostId = req.params.postId;
  Post.findOne({_id : requestedPostId },function(err,post){
    if(err){
      console.log("Error Found");
    }
    else {
      res.render("post",{
        title : post.title,
        content : post.content
      });
    }
  });
});

app.post("/delete",function(req,res){
  const requestedPostId = req.body.delete;
  Post.findByIdAndRemove({_id:requestedPostId},function(err,){
    if(!err){
      console.log("Successfully Deleted");
      res.redirect("/");
    }

  });

});

app.get("/contact",function(req,res){
  if(req.isAuthenticated()){
    res.render("contact");
  }else {
    res.redirect("/login");
  }
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});
transporter.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});
app.post("/send", (req, res) => {
  let form = new multiparty.Form();
  let data = {};
  form.parse(req, function (err, fields) {
    Object.keys(fields).forEach(function (property) {
      data[property] = fields[property].toString();
    });
    console.log(data);
    const mail = {
      sender: `${data.name} <${data.email}>`,
      to: "saurabhraj239@gmail.com", // receiver email,
      subject: data.subject,
      text: `${data.name} <${data.email}> \n${data.msg}`,
    };
    transporter.sendMail(mail, (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).send("Something went wrong.");
      } else {
console.log("Successfully Sent");
res.sendFile(__dirname + "/Success.html");
}
    });

  });
});


const Welcome = new Item ({
  name : "Welcome,Start adding below."
});

const defaultItems = [Welcome];


app.get("/todolist",function(req,res){

  if(req.isAuthenticated()){
    const day = date.getDate();

    Item.find({},function(errors,foundItems){

    if(foundItems.length=== 0){

      Item.insertMany(defaultItems,function(errors){
        if(errors){
          console.log(errors);
        }
        else {
          console.log("Successfully added.");
        }
      });
      res.redirect("/");
    }
    else {
      res.render("list", {listTitle: "Today",date : day, newListItems: foundItems});
    }
    });
  }else {
    res.redirect("/login");
  }
});

app.post("/todolist", function(req, res){
const listName = req.body.list;
  const itemName = req.body.newItem;
  const item = new Item({
    name : itemName
  });
  if(listName === "Today"){
    item.save();
    res.redirect("/todolist");
  }
else{
List.findOne({liname : listName},function(errors,foundList){
  foundList.items.push(item);
  foundList.save();
  res.redirect("/"+listName);
});
}
});

app.post("/delete0",function(req,res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  if(listName==="Today"){
    Item.findByIdAndRemove(checkedItemId, function(e){
      if(!e){
        console.log("Successfully Deleted.");
        res.redirect("/todolist");
      }
    });
  }
  else {
List.findOneAndUpdate({liname : listName},{$pull : {items : {_id : checkedItemId}}},function(errors,foundList){
res.redirect("/"+listName)
});
  }

});


app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);
});
