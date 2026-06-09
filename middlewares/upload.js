const multer=require('multer')

const fs = require('fs')
const path = require('path')

const uploadDir = path.join(__dirname, '../public/uploads')

if(!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination:(req,file,cb)=>{
      cb(null, uploadDir)
  },
  filename:(req,file,cb)=>{
      cb(null, Date.now() + '-' + file.originalname)
  }
})
const upload=multer({
    storage,
    limits:{
       fileSize: 5*1024*1024
    },
    fileFilter:(req,file,cb)=>{
        if(file.mimetype.startsWith('image/')){
            cb(null,true)
        }else{
            cb(new Error('Only images allowed'),false)
        }
    }
})

module.exports=upload