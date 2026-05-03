const Coupon=require('../../models/Coupon')

const couponPage=(req,res)=>{
    res.render('admin/coupon')
}


function getStatus(coupon){
    const today=new Date();
    today.setHours(0,0,0,0)

     const start = new Date(coupon.startDate);
    start.setHours(0,0,0,0);

    const end = new Date(coupon.endDate);
    end.setHours(0,0,0,0);

    if(today > end){
        return "expired";
    }

    if(today <start){
        return "upcoming";
    }

    return coupon.status;

}

const getCoupons= async(req,res)=>{
    try{

        let {page=1 , limit=7, search='', status}=req.query
        
        page=parseInt(page)
        limit=parseInt(limit)

        const query={}

        if(search){
            query.code={$regex:search,$options:"i"}
        }

        if(status && status !=='all'){
            query.status=status
        }

        const total=await Coupon.countDocuments(query)


        const coupons=await Coupon.find(query)
        .sort({createdAt:-1})
        .skip((page-1)*limit)
        .limit(limit)



        const updated=coupons.map(c=>{
            const obj=c.toObject(); //mongoose to normal obj
            obj.status=getStatus(c);
            return obj;
        })
        res.json({
            coupons:updated,
            totalPages: Math.ceil(total/limit),
            currentPage:page
        })

    }catch(err){
        res.status(500).json({error:"Server error"})
    }
}

const postCoupon= async(req,res)=>{
    try{

       const { code,discountPct, minPurchase, maxDiscount, startDate,endDate, status } =req.body

       if( !code || discountPct === undefined || minPurchase === undefined || maxDiscount === undefined || !startDate || !endDate  ){
        return res.status(400).json({
            success:false,
            message:"All fileds are required"
        })
       }

       const existing=await Coupon.findOne({code})

       if(existing){
        return res.status(400).json({
            success:false,
            message:"Coupon already exists"
        })
       }

const discount = Number(discountPct);
const min = Number(minPurchase);
const max = Number(maxDiscount);

if(discount <= 0 || discount > 99){
  return res.status(400).json({
    success: false,
    message: "Discount must be between 1% and 99%"
  });
}

if(min < 0 || max < 0){
  return res.status(400).json({
    success:false,
    message:"Values cannot be negative"
  });
}

if(max >= min){
  return res.status(400).json({
    success:false,
    message:"Maximum discount must be less than  minimum purchase"
  });
}



       const newCoupon=new Coupon({
        code,
        discountPct,
        minPurchase,
        maxDiscount,
        startDate,
        endDate,
        status
       })

       await newCoupon.save()

       res.json({
        success:true,
        message:"Coupon created successfully"
       })

    }catch(err){
        res.status(500).json({error:"Server error"})
    }
}

const getSingleCoupon=async(req,res)=>{
    try{
        const coupon=await Coupon.findById(req.params.id)
        res.json(coupon)
    }catch(err){
        res.status(500).json({
            error:"Server error"
        })
    }
}

const updateCoupon=async(req,res)=>{
    try{
        const {code,discountPct,minPurchase,maxDiscount,startDate,endDate,status}=req.body

         if( !code || discountPct === undefined || minPurchase === undefined || maxDiscount === undefined || !startDate || !endDate  ){
        return res.status(400).json({
            success:false,
            message:"All fileds are required"
        })
       }

       
        const discount = Number(discountPct);
        const min = Number(minPurchase);
        const max = Number(maxDiscount);

if(discount <= 0 || discount > 99){
  return res.status(400).json({
    success: false,
    message: "Discount must be between 1% and 99%"
  });
}

if(min < 0 || max < 0){
  return res.status(400).json({
    success:false,
    message:"Values cannot be negative"
  });
}

if(max >= min){
  return res.status(400).json({
    success:false,
    message:"Maximum discount must be less than  minimum purchase"
  });
}


        const updated=await Coupon.findByIdAndUpdate(req.params.id,{
            code,
            discountPct,
            minPurchase,
            maxDiscount,
            startDate,
            endDate,
            status
        },{new:true})


        console.log(updated.code)

        res.json({
            success:true,
            message:"Coupon updated successfully"
        })
    }catch(err){
        res.status(500).json({error:"Server error"})
    }
}

const deleteCoupon=async(req,res)=>{
    try{
        const deleted= await Coupon.findByIdAndDelete(req.params.id)

        if(!deleted){
            return res.status(404).json({
                success:false,
                message:"Coupon not found"
            })
        }

        res.json({
            success:true,
            message:"Coupon deleted successfully"
        })
    }catch(err){
        res.status(500).json({error:"Somthing went wrong"})
    }
}

module.exports={
    couponPage,
    getCoupons,
    postCoupon,
    getSingleCoupon,
    updateCoupon,
    deleteCoupon
}