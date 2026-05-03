const adminAuth = (req, res, next) => {

   console.log("SESSION CHECK:", req.session)
   
  if (req.session && req.session.isAdmin === true) {
    return next()
  }

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
  }


  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  return res.redirect('/admin/login')
}


module.exports=adminAuth