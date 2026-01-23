const User=require('../models/User')
const checkBlocked=async(req,res,next)=>{
    try {

        if (req.originalUrl.startsWith('/admin')) {
      return next()
    }
    if (!req.session.userId) {
      return next();
    }

    const user = await User.findById(req.session.userId).select('isBlocked');

    if (!user || user.isBlocked) {
      req.session.destroy(() => {
        return res.redirect('/blocked')
      })
      return
    }
    next();
  } catch (err) {
    console.error("checkBlocked error:", err);
    next(err);
  }
}

module.exports=checkBlocked