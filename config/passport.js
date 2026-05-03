const passport=require('passport')
const GoogleStrategy=require("passport-google-oauth20").Strategy
const User =require('../models/User')

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:process.env.GOOGLE_CALLBACK_URL
    },
    async(accessToken,refreshToken,profile,done)=>{
       try{

        let user=await User.findOne({
            $or:[
                {googleId:profile.id},
                {email:profile.emails[0].value}
            ]
        })

        if (user && user.isBlocked) {
          return done(null, false, {
          message: "BLOCKED"
         });
        }

        if (user && user.authProvider === "local") {
          return done(null, false, {
            message: "Email already registered. Please log in."
          });
        }

         if (user && user.authProvider === "google") {
          return done(null, user);
        }


        const newUser=new User({
            name:profile.displayName,
            email:profile.emails[0].value,
            googleId:profile.id,
            authProvider:"google",
            isVerified:true
        })

        await newUser.save()
        done(null,newUser)

       }catch(err){
        done(err,null)
       }
    }
))


passport.serializeUser((user,done)=>{
    done(null,user.id)
})


passport.deserializeUser(async(id,done)=>{
    const user=await User.findById(id)
    done(null,user)
})


module.exports=passport