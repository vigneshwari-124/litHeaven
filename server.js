require('dotenv').config()
const express=require('express')
const session=require('express-session')
const app=express()
const path=require('path')
const connectDB = require('./config/db.js')
const userRouter=require('./routes/user/userRouter.js')
const adminRouter = require('./routes/admin/adminRouter')
const passport=require('./config/passport.js')
// const MongoStore = require("connect-mongo")
const paymentRoutes = require("./routes/paymentRoutes");


connectDB()

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        maxAge:1000*60*60*24,
        httpOnly: true,
        secure: false
    },
    rolling: true
}))

// app.use(session({
//   secret: "mysecret",
//   resave: false,
//   saveUninitialized: false,
//   store: MongoStore.create({
//     mongoUrl: process.env.MONGO_URL
//   }),
//   cookie: {
//     maxAge: 1000 * 60 * 60 * 24,
//      httpOnly: true,
//     secure: false
//   }
// }))



app.use(passport.initialize());
app.use(passport.session());

app.use('/payment', paymentRoutes)
app.use('/admin', adminRouter)
app.use('/',userRouter)

app.use((req, res) => {
  res.status(404).render('errors/404')
})

app.listen(process.env.PORT)