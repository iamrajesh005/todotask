if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}


const express= require("express");
const app= express()
const mongoose = require('mongoose');
const engine= require("ejs-mate")
const Task= require("./models/task.js");
const User= require("./models/user.js")
const path= require("path");
const methodoverride= require("method-override");
const flash= require("connect-flash");
const passport= require("passport");
const passportLocal= require("passport-local");
const passportLocalMongoose= require("passport-local-mongoose");
const session= require("express-session");
const expresserror= require("./utills/expresserror.js");
const MongoStore = require("connect-mongo").default;

let port=8080;
app.listen(port, ()=>{
    console.log(`app is listening to the port ${port}`)
})



const dbUrl= process.env.ATLASDB_URL; 
mongoose.connect(dbUrl)
    .then(() => console.log("DB Connected"))
    .catch(err => console.log(err));

const store= MongoStore.create({
    mongoUrl: dbUrl,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter: 24*3600 //for lazy update
})

store.on("error", (err)=>{
    console.log("ERROR IN MONGODB", err);
})

const sessionOptions= {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie:{
        expires: Date.now()+ 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
        httpOnly:true
    }
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new passportLocal(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




app.engine("ejs", engine);
app.set("view engine", "ejs");
app.use(methodoverride("_method"));




app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, "public")));



app.use((req, res, next)=>{
    res.locals.currUser= req.user; 
    res.locals.success = req.flash("success");   //must be above of all get routes
    res.locals.error = req.flash("error");
    next();
})

app.get("/", (req, res)=>{
    res.send("hii i am the root")
})

app.get("/todo",async (req, res)=>{
     if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
    let date= new Date();
    let options={weekday: "long", year: "numeric", month: "long", day: "numeric"}
    let day= date.toLocaleDateString("en-US", {weekday: "long"})
    let month= date.toLocaleDateString("en-US", { month: "long", day: "numeric"})
    let year= date.toLocaleDateString("en-US", { year: "numeric"})
    let getTasks= await Task.find({user: req.user._id}).populate("user")
    let notcomTask= await Task.find({user: req.user._id, isDone: false})
    let comTask= await Task.find({user: req.user._id, isDone: true})
   console.log(comTask)
   res.render("home", {day,month,year,getTasks,notcomTask,comTask})
})

app.get("/todo/profile", (req, res)=>{
    if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
   res.render("profile");
})

app.get("/todo/chart", async (req, res)=>{
    if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");

    }
     let notcomTask= await Task.find({user: req.user._id, isDone: false})
    let comTask= await Task.find({user: req.user._id, isDone: true})
   res.render("chart", {notcomTask, comTask});
})

app.get("/todo/search", async (req, res)=>{
   if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
    let taskList= [];
    let {taskname}= req.query;
    taskList= await Task.find({
        taskname: {$regex: taskname, $options: "i"},
        user: req.user._id
    })
    console.log(taskList)
    res.render("search",{taskList})
})

app.post("/todo", async (req, res)=>{
    if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
    let list= new Task(req.body);
    list.user= req.user._id;
    let task= await list.save().then((res)=>{
        console.log(res);
    })
   
    console.log(task)
    req.flash("success","task added successfully")
    res.redirect("/todo")
})

app.get("/todo/signup", async (req, res)=>{

    res.render("signup");
})

app.post("/todo/signup", async (req, res)=>{
    try{
        let { password, ...info}= req.body;
    let newUser= new User(info);
    let registeredUser= await User.register(newUser, password);
    console.log(registeredUser)
   
    req.login(registeredUser, (err)=>{
        if(err)
            return next(err);
            console.log("register");
            req.flash("success", "welcome to complete your tasks")
            res.redirect("/todo")
    
})
    
    } catch(err){
        let errMsg= err.message;
     req.flash("error", errMsg);
     return res.redirect("/todo/signup");
    }
    
})

app.get("/todo/login", (req, res)=>{
    res.render("login")
})
app.post("/todo/login",passport.authenticate("local", {failureRedirect: "/todo/login", failureFlash: true}) , (req, res)=>{
    req.flash("success", "welcome again");
    console.log(req.user)
    console.log("hello")
    res.redirect("/todo")
})

app.post("/todo/logout", (req, res)=>{
    if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
    req.logout((err)=>{
        if(err) return next(err);
        console.log("logged out");
        res.redirect("/todo/login")
    })
})

app.get("/todo/:id/update",async (req, res)=>{
    if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
    let {id}=req.params;
    let task=await Task.findById(id)
    res.render("updateform.ejs",{task})
})

app.patch("/todo/:id/toggle", async (req, res)=>{
    if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
    let {id}= req.params;
    let isDone= req.body.isDone==="on";
    await Task.findByIdAndUpdate(id, {isDone: isDone})
    res.redirect("/todo");
})
app.delete("/todo/:id", async (req, res)=>{
    if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
    let {id}= req.params;
    let deleteTask=await Task.findByIdAndDelete(id );
    console.log(deleteTask);
    res.redirect("/todo");
})

app.patch("/todo/:id", async (req, res)=>{
    if(!req.user){
        req.flash("error", "first login or register yourself")
        return res.redirect("/todo/login");
    }
    let {id}= req.params;
    let updatetask= await Task.findByIdAndUpdate(id, { ...req.body }, { runValidators: true, new: true });
    console.log(updatetask);
    res.redirect(`/todo`)
})



app.all("*path", (req, res, next) => {
    next(new expresserror("page not found", 404));
});

app.use((err, req, res, next)=>{
    let { statuscode=500, message="something error happened" } = err;
    res.status(statuscode).render("error.ejs", {err});
})