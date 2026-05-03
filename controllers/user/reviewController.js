const Review = require('../../models/Review')


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addReview = async(req,res)=>{

try{

const {productId,rating,reviewText,title} = req.body
const userId = req.session.userId

if(!rating || !reviewText){
return res.json({success:false,message:"Please Select rating & write a Review"})
}

const review = new Review({
product:productId,
user:userId,
rating,
reviewText,
title
})

await review.save()

res.json({success:true,message:"Review submitted successfully!"})

}catch(err){
if(err.code === 11000){
return res.json({
success:false,
message:"You already reviewed this product"
})
}

console.log(err)
res.json({success:false})
}

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports={
    addReview
}